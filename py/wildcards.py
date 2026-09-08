import configparser
import fnmatch
import math
import os
import re
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import folder_paths
import numpy as np
import yaml

from . import paths


def get_wildcard_dirs() -> List[str]:
    dirs = [
        paths.wildcards_dir,
        paths.custom_nodes_dir.parent / "models" / "wildcards",
        paths.custom_nodes_dir / "comfyui-dynamicprompts" / "wildcards",
    ]
    try:
        dirs.extend(Path(path) for path in folder_paths.get_folder_paths("wildcards"))
    except Exception:
        pass
    impact_dir = paths.custom_nodes_dir / "ComfyUI-Impact-Pack"
    dirs.append(impact_dir / "wildcards")
    ini_file = impact_dir / "impact-pack.ini"
    try:
        config = configparser.ConfigParser()
        config.read(ini_file, encoding="utf-8")
        custom = config.get("default", "custom_wildcards", fallback="").strip()
        if custom:
            dirs.append(Path(custom).expanduser())
    except Exception:
        pass

    result = []
    seen = set()
    for directory in dirs:
        resolved = str(Path(directory).expanduser().resolve())
        if resolved not in seen and Path(resolved).is_dir():
            seen.add(resolved)
            result.append(resolved)
    return result


class WildcardLoader:
    _wildcards: Dict[str, List[str]] = {}
    _available: Dict[str, Path] = {}
    _loaded: set[str] = set()
    _dirs: List[str] = []
    _on_demand = False
    _lock = threading.RLock()
    CACHE_LIMIT_BYTES = 50 * 1024 * 1024

    QUANTIFIER_RE = re.compile(r"(?P<quantifier>\d+)#__(?P<keyword>[\w.\-+/*\\]+?)__", re.IGNORECASE)
    OPTION_RE = re.compile(r"(?<!\\)\{((?:[^{}]|(?<=\\)[{}])*?)(?<!\\)\}")
    WILDCARD_RE = re.compile(r"__([\w.\-+/*\\]+?)__")
    RANGE_RE = re.compile(r"^(?:(\d+)(?:-(\d*))?|-(\d+))$")

    @classmethod
    def load(cls, force: bool = False):
        with cls._lock:
            if force:
                cls.unload()
            if cls._available or cls._wildcards:
                return
            cls._dirs = get_wildcard_dirs()
            cls._on_demand = cls._calculate_size(cls._dirs, cls.CACHE_LIMIT_BYTES) >= cls.CACHE_LIMIT_BYTES
            for directory in cls._dirs:
                cls._scan_directory(Path(directory))
            if not cls._on_demand:
                for key in list(cls._available):
                    cls._load_key(key)

    @classmethod
    def refresh(cls):
        cls.load(force=True)

    @classmethod
    def unload(cls):
        with cls._lock:
            cls._wildcards = {}
            cls._available = {}
            cls._loaded = set()
            cls._dirs = []
            cls._on_demand = False

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        cls.load()
        with cls._lock:
            return {
                "on_demand_mode": cls._on_demand,
                "total_available": len(set(cls._available) | set(cls._wildcards)),
                "loaded_count": len(cls._loaded),
            }

    @classmethod
    def get_wildcards_list(cls) -> List[str]:
        cls.load()
        with cls._lock:
            return [f"__{key}__" for key in sorted(set(cls._available) | set(cls._wildcards))]

    @classmethod
    def get_loaded_wildcards_list(cls) -> List[str]:
        cls.load()
        with cls._lock:
            return [f"__{key}__" for key in sorted(cls._loaded)]

    @classmethod
    def get_wildcards_dict(cls, load_all: bool = True) -> Dict[str, List[str]]:
        cls.load()
        with cls._lock:
            if load_all:
                for key in list(cls._available):
                    cls._load_key(key)
            return cls._wildcards

    @classmethod
    def get_wildcard_value(cls, keyword: str) -> Optional[List[str]]:
        cls.load()
        key = cls._key_normalize(keyword)
        with cls._lock:
            value = cls._load_key(key)
            if value is not None:
                return value
            matches = cls._matching_keys(key)
            if not matches:
                return None
            options = []
            for matched_key in matches:
                options.extend(cls._load_key(matched_key) or [])
            return options or None

    @classmethod
    def process(cls, text: str, seed: Optional[int] = None, usage: Optional[Dict[str, Dict[str, int]]] = None,
                downvote_factor: float = 1.0) -> str:
        if not text:
            return ""
        cls.load()
        text = cls._remove_comments(text)
        random_gen = np.random.default_rng(seed)
        for _ in range(100):
            original = text
            text = cls.QUANTIFIER_RE.sub(
                lambda match: " ".join(f"__{match.group('keyword')}__" for _ in range(int(match.group('quantifier')))),
                text,
            )
            while True:
                text, count = cls.OPTION_RE.subn(
                    lambda match: cls._process_option_group(match, random_gen, usage, downvote_factor), text
                )
                if not count:
                    break
            text, wildcard_count = cls._replace_wildcards(text, random_gen, usage, downvote_factor)
            if not wildcard_count and text == original:
                break
        return text.replace(r"\{", "{").replace(r"\}", "}")

    @classmethod
    def _scan_directory(cls, directory: Path):
        for root, dirnames, filenames in os.walk(directory, followlinks=True):
            dirnames.sort()
            for filename in sorted(filenames):
                file_path = Path(root) / filename
                suffix = file_path.suffix.lower()
                if suffix not in {".txt", ".yaml", ".yml"}:
                    continue
                key = cls._key_normalize(str(file_path.relative_to(directory).with_suffix("")))
                if suffix == ".txt":
                    cls._available.setdefault(key, file_path)
                else:
                    cls._load_yaml_file(file_path)

    @classmethod
    def _load_key(cls, key: str) -> Optional[List[str]]:
        if key in cls._wildcards:
            return cls._wildcards[key]
        file_path = cls._available.get(key)
        if file_path is None:
            return None
        values = cls._read_text_file(file_path)
        cls._wildcards[key] = values
        cls._loaded.add(key)
        return values

    @classmethod
    def _load_yaml_file(cls, file_path: Path):
        data = cls._read_yaml_file(file_path)
        if data is not None:
            cls._parse_yaml_data(data)

    @classmethod
    def _parse_yaml_data(cls, data: Any, prefix: str = ""):
        if isinstance(data, dict):
            for key, value in data.items():
                cls._parse_yaml_data(value, f"{prefix}/{key}" if prefix else str(key))
        elif isinstance(data, list) and prefix:
            key = cls._key_normalize(prefix)
            if key not in cls._wildcards and key not in cls._available:
                cls._wildcards[key] = [str(item) for item in data]
                cls._loaded.add(key)
        elif isinstance(data, (str, int, float)) and prefix:
            key = cls._key_normalize(prefix)
            if key not in cls._wildcards and key not in cls._available:
                cls._wildcards[key] = [str(data)]
                cls._loaded.add(key)

    @staticmethod
    def _read_text_file(file_path: Path) -> List[str]:
        for encoding in ("utf-8", "ISO-8859-1"):
            try:
                lines = file_path.read_text(encoding=encoding).splitlines()
                return [line.strip() for line in lines if line.strip() and not line.strip().startswith("#")]
            except UnicodeDecodeError:
                continue
        return []

    @staticmethod
    def _read_yaml_file(file_path: Path) -> Any:
        for encoding in ("utf-8", "ISO-8859-1"):
            try:
                return yaml.safe_load(file_path.read_text(encoding=encoding))
            except UnicodeDecodeError:
                continue
            except yaml.YAMLError as error:
                print(f"Failed to read YAML file {file_path}: {error}")
                return None
        return None

    @staticmethod
    def _calculate_size(directories: List[str], limit: int) -> int:
        total = 0
        for directory in directories:
            for root, _, filenames in os.walk(directory, followlinks=True):
                for filename in filenames:
                    if Path(filename).suffix.lower() in {".txt", ".yaml", ".yml"}:
                        try:
                            total += (Path(root) / filename).stat().st_size
                        except OSError:
                            pass
                        if total >= limit:
                            return total
        return total

    @classmethod
    def _matching_keys(cls, pattern: str) -> List[str]:
        keys = sorted(set(cls._available) | set(cls._wildcards))
        if "*" in pattern:
            return [key for key in keys if fnmatch.fnmatchcase(key, pattern)]
        if "/" not in pattern:
            return [key for key in keys if key == pattern or key.endswith(f"/{pattern}") or
                    key.startswith(f"{pattern}/") or f"/{pattern}/" in key]
        return []

    @classmethod
    def _replace_wildcards(cls, text: str, random_gen: np.random.Generator,
                           usage: Optional[Dict[str, Dict[str, int]]], factor: float) -> Tuple[str, int]:
        replacements = 0
        for match in list(cls.WILDCARD_RE.finditer(text)):
            raw = match.group(0)
            key = cls._key_normalize(match.group(1))
            options = cls.get_wildcard_value(key)
            if not options:
                continue
            replacement = cls._choose(options, key, random_gen, usage, factor)
            text = text.replace(raw, replacement, 1)
            replacements += 1
        return text, replacements

    @classmethod
    def _process_option_group(cls, match: re.Match, random_gen: np.random.Generator,
                              usage: Optional[Dict[str, Dict[str, int]]], factor: float) -> str:
        options = match.group(1).split("|")
        select_range = None
        separator = " "
        parts = options[0].split("$$")
        if len(parts) in (2, 3):
            select_range = cls._parse_range(parts[0].strip())
            if select_range is not None:
                separator = parts[1] if len(parts) == 3 else " "
                source = parts[-1]
                wildcard_matches = cls.WILDCARD_RE.findall(source)
                if len(options) == 1 and wildcard_matches:
                    options = []
                    for wildcard in wildcard_matches:
                        options.extend(cls.get_wildcard_value(wildcard) or [])
                else:
                    options[0] = source
        if not options:
            return ""
        count = 1 if select_range is None else cls._select_count(select_range, len(options), random_gen)
        if count <= 0:
            return ""
        selected = cls._choose_many(options, "__options__", count, random_gen, usage, factor)
        return separator.join(selected)

    @classmethod
    def _choose(cls, options: List[str], key: str, random_gen: np.random.Generator,
                usage: Optional[Dict[str, Dict[str, int]]], factor: float) -> str:
        return cls._choose_many(options, key, 1, random_gen, usage, factor)[0]

    @classmethod
    def _choose_many(cls, options: List[str], key: str, count: int, random_gen: np.random.Generator,
                     usage: Optional[Dict[str, Dict[str, int]]], factor: float) -> List[str]:
        weights, clean = cls._parse_probabilities(options)
        if usage is not None and factor < 1.0:
            counts = usage.get(key, {})
            weights = [weight * factor ** counts.get(value.strip(), 0) for weight, value in zip(weights, clean)]
        total = sum(weights)
        probabilities = None if total <= 0 else np.asarray(weights, dtype=float) / total
        count = min(count, len(clean))
        indices = np.atleast_1d(random_gen.choice(len(clean), size=count, replace=False, p=probabilities))
        selected = [clean[int(index)] for index in indices]
        if usage is not None:
            bucket = usage.setdefault(key, {})
            for value in selected:
                normalized = value.strip()
                bucket[normalized] = bucket.get(normalized, 0) + 1
        return selected

    @classmethod
    def _parse_probabilities(cls, options: List[str]) -> Tuple[List[float], List[str]]:
        weights = []
        clean = []
        for option in options:
            value = str(option)
            parts = value.split("::", 1)
            if len(parts) == 2 and cls._is_numeric(parts[0].strip()):
                weight = max(0.0, float(parts[0].strip()))
                value = parts[1]
            else:
                weight = 1.0
            weights.append(weight)
            clean.append(value)
        if weights and sum(weights) <= 0:
            weights = [1.0] * len(weights)
        return weights, clean

    @classmethod
    def _parse_range(cls, value: str) -> Optional[Tuple[int, int]]:
        match = cls.RANGE_RE.fullmatch(value)
        if not match:
            return None
        if match.group(3) is not None:
            return 1, int(match.group(3))
        minimum = int(match.group(1))
        maximum = int(match.group(2)) if match.group(2) else minimum
        return minimum, maximum

    @staticmethod
    def _select_count(select_range: Tuple[int, int], option_count: int,
                      random_gen: np.random.Generator) -> int:
        low, high = sorted(select_range)
        low = min(max(0, low), option_count)
        high = min(max(0, high), option_count)
        if low >= high:
            return low
        return int(random_gen.integers(low, high + 1))

    @staticmethod
    def _key_normalize(text: str) -> str:
        return text.replace("\\", "/").replace(" ", "-").lower()

    @staticmethod
    def _is_numeric(text: str) -> bool:
        try:
            return math.isfinite(float(text))
        except ValueError:
            return False

    @staticmethod
    def _remove_comments(text: str) -> str:
        return "\n".join(line for line in text.splitlines() if not line.lstrip().startswith("#"))
