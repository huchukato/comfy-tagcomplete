import re
import random
import numpy as np
from .wildcards import WildcardLoader
from comfy.comfy_types import IO, InputTypeDict

class WildcardProcessorNode:
    """
    Nodo ComfyUI per il processing di wildcards e dynamic prompts,
    ispirato alla logica di ImpactWildcardEncode ma integrato con
    il sistema di ComfyUI-TagComplete.

    Include una cache di sessione che applica un "downvote" progressivo
    alle opzioni già utilizzate, riducendo la probabilità di ripetizioni
    nella stessa sessione di ComfyUI.
    """

    # Cache di sessione: {keyword: {option: usage_count}}
    # Si resetta al restart di ComfyUI (variabile di classe).
    _session_usage: dict[str, dict[str, int]] = {}

    @classmethod
    def INPUT_TYPES(s) -> InputTypeDict:
        return {
            "required": {
                "text": (IO.STRING, {"default": "", "multiline": True, "tooltip": "Enter a prompt using wildcard syntax."}),
            },
            "optional": {
                "seed": (IO.INT, {"default": 0, "min": 0, "max": 0xffffffffffffffff, "tooltip": "Seed for randomization (0 = random)"}),
                "populate": (IO.BOOLEAN, {"default": True, "tooltip": "If True, process wildcards. If False, return populated_text unchanged."}),
                "populated_text": (IO.STRING, {"default": "", "multiline": True, "tooltip": "Paste here a previously populated prompt to reuse it when populate is False."}),
                "deduplicate": (IO.BOOLEAN, {"default": True, "tooltip": "If True, options already used in this session get a probability penalty (downvote), reducing repeats."}),
                "downvote_factor": (IO.FLOAT, {"default": 0.5, "min": 0.01, "max": 1.0, "step": 0.05, "tooltip": "Penalty multiplier applied each time an option is used. 0.5 = halved probability each use. 1.0 = no penalty (same as deduplicate=False)."}),
                "refresh_token": (IO.INT, {"default": 0, "tooltip": "Internal: changes to force re-execution. Incremented by the UI when text changes."}),
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("processed_text",)
    FUNCTION = "process_wildcards"
    CATEGORY = "ComfyUI-TagComplete"

    def process_wildcards(self, text, seed=0, populate=True, populated_text="", deduplicate=True, downvote_factor=0.5, refresh_token=0):
        """
        Processa wildcards e dynamic prompts nel testo.

        Args:
            text: Testo contenente wildcards nel formato __keyword__
            seed: Seed per la randomizzazione (0 = random)
            populate: Se True, processa le wildcard; se False, restituisce populated_text
            populated_text: Testo già popolato da riutilizzare quando populate è False
            deduplicate: Se True, le opzioni già usate in sessione subiscono un downvote di probabilità
            downvote_factor: Moltiplicatore di penalità per opzioni già usate (0.5 = dimezza ogni uso)

        Returns:
            Testo elaborato con wildcards sostituiti, oppure il testo popolato precedentemente
        """
        # Assicura che le wildcards siano caricate.
        # Force reload se la cache è vuota ma le directory esistono,
        # per gestire il caso in cui le wildcards vengano aggiunte dopo il primo caricamento.
        if not WildcardLoader.get_wildcards_dict():
            WildcardLoader.load(force=True)
        else:
            WildcardLoader.load()

        if not populate:
            return {"ui": {"text": [populated_text]}, "result": (populated_text,)}

        if seed == 0:
            # Usa un seed casuale se non specificato
            seed = random.randint(0, 0xffffffffffffffff)

        # Inizializza il generatore random con il seed
        random.seed(seed)
        random_gen = np.random.default_rng(seed)

        # Prepara il contesto di deduplicazione
        dedup_ctx = None
        if deduplicate and downvote_factor < 1.0:
            dedup_ctx = {
                'factor': downvote_factor,
                'usage': self._session_usage,
            }

        # Elabora il testo
        processed_text = self._process_text(text, random_gen, dedup_ctx)

        return {"ui": {"text": [processed_text]}, "result": (processed_text,)}

    def _process_text(self, text, random_gen, dedup_ctx=None):
        """
        Elabora il testo sostituendo wildcards e opzioni multiple.
        """
        # Prima elabora i commenti (se presenti)
        text = self._process_comment_out(text)

        # Ciclo per gestire sostituzioni annidate
        replace_depth = 100
        stop_unwrap = False

        while not stop_unwrap and replace_depth > 1:
            replace_depth -= 1  # Previene loop infiniti
            original_text = text  # Salva il testo prima delle modifiche

            # Elabora quantificatori di wildcards (es. 2__keyword__)
            option_quantifier = self._find_wildcard_quantifiers(text)
            for match in option_quantifier:
                quantifier = int(match['quantifier'])
                keyword = match['keyword']

                # Sostituisci con multiple istanze
                replacement = ""
                for i in range(quantifier):
                    if i > 0:
                        replacement += " "
                    replacement += f"__{keyword}__"

                text = text.replace(match['full_match'], replacement)

            # pass1: replace options - ciclo continuo come Impact Pack
            text, replacements_found_1 = self._replace_options(text, random_gen, dedup_ctx)
            while replacements_found_1:
                text, replacements_found_1 = self._replace_options(text, random_gen, dedup_ctx)

            # pass2: replace wildcards
            text, replacements_found_2 = self._replace_wildcards(text, random_gen, dedup_ctx)

            # Se non ci sono più sostituzioni E il testo non è cambiato, ferma il ciclo
            if not replacements_found_2 and text == original_text:
                stop_unwrap = True

        return text

    def _process_comment_out(self, text):
        """
        Elabora commenti nel testo (linee che iniziano con #).
        """
        lines = text.split('\n')
        lines0 = []
        flag = False

        for line in lines:
            if line.lstrip().startswith('#'):
                flag = True
                continue

            if len(lines0) == 0:
                lines0.append(line)
            elif flag:
                lines0[-1] += ' ' + line
                flag = False
            else:
                lines0.append(line)

        return '\n'.join(lines0)

    def _find_wildcard_quantifiers(self, text):
        """
        Trova quantificatori di wildcards nel formato num__keyword__.
        """
        pattern = r'(?P<full_match>(?P<quantifier>\d+)#__(?P<keyword>[\w.\-+/\\*]+?)__)'
        matches = re.finditer(pattern, text, re.IGNORECASE)

        result = []
        for match in matches:
            result.append({
                'full_match': match.group('full_match'),
                'quantifier': match.group('quantifier'),
                'keyword': match.group('keyword')
            })

        return result

    def _replace_options(self, string, random_gen, dedup_ctx=None):
        """
        Sostituisce opzioni multiple nel formato {opzione1|opzione2|opzione3}.
        """
        replacements_found = False

        def replace_option(match):
            nonlocal replacements_found
            options = match.group(1).split('|')

            multi_select_pattern = options[0].split('$$')
            select_range = None
            select_sep = ' '

            if len(multi_select_pattern) > 1:
                # Gestisci pattern di selezione multipla
                range_pattern = r'(\d+)(?:-(\d+))?'
                r = re.match(range_pattern, options[0])

                if r:
                    a = r.group(1).strip()
                    b = r.group(2)
                    if b:
                        b = b.strip()
                    else:
                        b = a

                    if self._is_numeric_string(a) and self._is_numeric_string(b):
                        select_range = int(a), int(b)

                if select_range and len(multi_select_pattern) >= 2:
                    if len(multi_select_pattern) == 3:
                        select_sep = multi_select_pattern[1]
                    options[0] = multi_select_pattern[-1]

            # Calcola probabilità
            adjusted_probabilities = []
            total_prob = 0

            for option in options:
                if isinstance(option, str):
                    parts = option.split('::', 1)
                    if len(parts) == 2 and self._is_numeric_string(parts[0].strip()):
                        config_value = float(parts[0].strip())
                    else:
                        config_value = 1
                else:
                    config_value = 1

                # Applica downvote di sessione se attivo
                if dedup_ctx:
                    clean_opt = re.sub(r'^\s*[0-9.]+::', '', str(option), count=1).strip()
                    usage_count = dedup_ctx['usage'].get('__options__', {}).get(clean_opt, 0)
                    if usage_count > 0:
                        config_value *= dedup_ctx['factor'] ** usage_count

                adjusted_probabilities.append(config_value)
                total_prob += config_value

            # Evita divisione per zero
            if total_prob <= 0:
                total_prob = len(options)
                adjusted_probabilities = [1.0] * len(options)

            normalized_probabilities = [prob / total_prob for prob in adjusted_probabilities]

            # Determina quanti elementi selezionare
            if select_range is None:
                select_count = 1
            else:
                select_count = self._calculate_select_count(len(options), select_range, random_gen)

            # Seleziona elementi
            if select_count >= len(options) or total_prob <= 1:
                random_gen.shuffle(options)
                selected_items = options
            else:
                selected_items = random_gen.choice(options, p=normalized_probabilities,
                                                 size=select_count, replace=False)

            # Pulisci risultati
            selected_items2 = [re.sub(r'^\s*[0-9.]+::', '', str(x), count=1) for x in selected_items]
            replacement = select_sep.join(selected_items2)

            # Registra uso in sessione
            if dedup_ctx:
                for item in selected_items2:
                    clean = str(item).strip()
                    if '__options__' not in dedup_ctx['usage']:
                        dedup_ctx['usage']['__options__'] = {}
                    dedup_ctx['usage']['__options__'][clean] = dedup_ctx['usage']['__options__'].get(clean, 0) + 1

            replacements_found = True
            return replacement

        # Pattern per opzioni multiple
        pattern = r'(?<!\\)\{((?:[^{}]|(?<=\\)[{}])*?)(?<!\\)\}'
        replaced_string = re.sub(pattern, replace_option, string)
        
        # Se la stringa è cambiata, allora c'è stata una sostituzione
        if replaced_string != string:
            replacements_found = True

        return replaced_string, replacements_found

    def _replace_wildcards(self, string, random_gen, dedup_ctx=None):
        """
        Sostituisce wildcards nel formato __keyword__.
        """
        pattern = r"__([\w.\-+/\\*]+?)__"
        matches = re.findall(pattern, string)

        replacements_found = False

        for match in matches:
            keyword = match.lower()
            keyword = self._wildcard_normalize(keyword)

            # Ottieni opzioni dal wildcard
            options = self._get_wildcard_options(keyword)

            if options:
                # Calcola probabilità
                adjusted_probabilities = []
                total_prob = 0

                for option in options:
                    if isinstance(option, str):
                        parts = option.split('::', 1)
                        if len(parts) == 2 and self._is_numeric_string(parts[0].strip()):
                            config_value = float(parts[0].strip())
                        else:
                            config_value = 1
                    else:
                        config_value = 1

                    # Applica downvote di sessione se attivo
                    if dedup_ctx:
                        clean_opt = re.sub(r'^\s*[0-9.]+::', '', str(option), count=1).strip()
                        usage_count = dedup_ctx['usage'].get(keyword, {}).get(clean_opt, 0)
                        if usage_count > 0:
                            config_value *= dedup_ctx['factor'] ** usage_count

                    adjusted_probabilities.append(config_value)
                    total_prob += config_value

                # Evita divisione per zero
                if total_prob <= 0:
                    total_prob = len(options)
                    adjusted_probabilities = [1.0] * len(options)

                normalized_probabilities = [prob / total_prob for prob in adjusted_probabilities]

                # Seleziona un'opzione
                selected_item = random_gen.choice(options, p=normalized_probabilities, replace=False)
                replacement = re.sub(r'^\s*[0-9.]+::', '', str(selected_item), count=1)

                # Registra uso in sessione
                if dedup_ctx:
                    clean = str(replacement).strip()
                    if keyword not in dedup_ctx['usage']:
                        dedup_ctx['usage'][keyword] = {}
                    dedup_ctx['usage'][keyword][clean] = dedup_ctx['usage'][keyword].get(clean, 0) + 1

                replacements_found = True
                string = string.replace(f"__{match}__", replacement, 1)
            elif '*' in keyword:
                # Gestisci pattern con wildcard
                total_patterns = []
                found = False

                # Cerca pattern corrispondenti
                wildcard_dict = WildcardLoader.get_wildcards_dict()

                if keyword.startswith('*/') and len(keyword) > 2:
                    base_name = keyword[2:]
                    for k in wildcard_dict.keys():
                        if (k == base_name or
                            k.endswith('/' + base_name) or
                            k.startswith(base_name + '/') or
                            ('/' + base_name + '/') in k):
                            v = wildcard_dict.get(k)
                            if v:
                                total_patterns.extend(v)
                                found = True
                else:
                    # Pattern matching generale
                    subpattern = keyword.replace('*', '.*').replace('+', '\\+')
                    for k in wildcard_dict.keys():
                        if re.match(subpattern, k) or re.match(subpattern, k + '/'):
                            v = wildcard_dict.get(k)
                            if v:
                                total_patterns.extend(v)
                                found = True

                if found and total_patterns:
                    # Applica downvote anche sui pattern con wildcard
                    if dedup_ctx:
                        weights = []
                        for p in total_patterns:
                            clean_p = re.sub(r'^\s*[0-9.]+::', '', str(p), count=1).strip()
                            usage_count = dedup_ctx['usage'].get(keyword, {}).get(clean_p, 0)
                            w = 1.0 * (dedup_ctx['factor'] ** usage_count) if usage_count > 0 else 1.0
                            weights.append(w)
                        total_w = sum(weights)
                        if total_w <= 0:
                            weights = [1.0] * len(total_patterns)
                            total_w = len(total_patterns)
                        norm_weights = [w / total_w for w in weights]
                        idx = random_gen.choice(len(total_patterns), p=norm_weights)
                        selected = total_patterns[idx]
                    else:
                        selected = random_gen.choice(total_patterns)

                    replacement = re.sub(r'^\s*[0-9.]+::', '', str(selected), count=1)

                    # Registra uso
                    if dedup_ctx:
                        clean = str(replacement).strip()
                        if keyword not in dedup_ctx['usage']:
                            dedup_ctx['usage'][keyword] = {}
                        dedup_ctx['usage'][keyword][clean] = dedup_ctx['usage'][keyword].get(clean, 0) + 1

                    replacements_found = True
                    string = string.replace(f"__{match}__", replacement, 1)

        return string, replacements_found

    def _get_wildcard_options(self, keyword):
        """
        Ottieni le opzioni per un wildcard specifico.
        Implementa la logica di pattern matching dell'Impact Pack.
        """
        wildcard_dict = WildcardLoader.get_wildcards_dict()
        
        # Prima prova la chiave diretta
        options = wildcard_dict.get(keyword)
        if options:
            return options
        
        # Fallback: Try pattern matching to find wildcards at any depth
        # Example: "indoor" matches "indoor.txt", "locations/indoor.txt", "indoor/specific.txt", etc.
        matched_keys = []
        for k in wildcard_dict.keys():
            if (k == keyword or
                k.endswith('/' + keyword) or
                k.startswith(keyword + '/') or
                ('/' + keyword + '/') in k):
                matched_keys.append(k)

        if matched_keys:
            # Collect all options from matched keys
            all_options = []
            for matched_key in matched_keys:
                value = wildcard_dict.get(matched_key)
                if value:
                    all_options.extend(value)

            if all_options:
                return all_options
        
        return None

    def _wildcard_normalize(self, x):
        """Normalizza il nome del wildcard."""
        return x.replace("\\", "/").replace(' ', '-').lower()

    @classmethod
    def reset_session_cache(cls):
        """Resetta la cache di sessione (downvote). Chiamabile esternamente."""
        cls._session_usage.clear()

    def _is_numeric_string(self, s):
        """Verifica se una stringa rappresenta un numero."""
        try:
            float(s)
            return True
        except ValueError:
            return False

    def _calculate_select_count(self, options_length, select_range, random_gen):
        """
        Calcola quanti elementi selezionare da un range.
        """
        min_select, max_select = select_range

        if max_select <= 0:
            return 0
        elif min_select == max_select:
            return min_select
        else:
            low = min(min_select, max_select)
            high = max(min_select, max_select)
            return random_gen.integers(low=low, high=high, size=1)[0]
