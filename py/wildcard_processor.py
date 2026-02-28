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
    """

    @classmethod
    def INPUT_TYPES(s) -> InputTypeDict:
        return {
            "required": {
                "text": (IO.STRING, {"multiline": True, "dynamicPrompts": True, "tooltip": "Enter a prompt using wildcard syntax."}),
            },
            "optional": {
                "seed": (IO.INT, {"default": 0, "min": 0, "max": 0xffffffffffffffff, "tooltip": "Seed for randomization (0 = random)"}),
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("processed_text",)
    FUNCTION = "process_wildcards"
    CATEGORY = "ComfyUI-TagComplete"

    def process_wildcards(self, text, seed=0):
        """
        Processa wildcards e dynamic prompts nel testo.

        Args:
            text: Testo contenente wildcards nel formato __keyword__
            seed: Seed per la randomizzazione (0 = random)

        Returns:
            Testo elaborato con wildcards sostituiti
        """
        # Assicura che le wildcards siano caricate
        WildcardLoader.load()
        if seed == 0:
            # Usa un seed casuale se non specificato
            seed = random.randint(0, 0xffffffffffffffff)

        # Inizializza il generatore random con il seed
        random.seed(seed)
        random_gen = np.random.default_rng(seed)

        # Elabora il testo
        processed_text = self._process_text(text, random_gen)

        return (processed_text,)

    def _process_text(self, text, random_gen):
        """
        Elabora il testo sostituendo wildcards e opzioni multiple.
        """
        # Prima elabora i commenti (se presenti)
        text = self._process_comment_out(text)

        # Ciclo semplificato come Impact Pack
        while True:
            original_text = text
    
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

            # Elabora opzioni multiple {opzione1|opzione2|opzione3}
            text, _ = self._replace_options(text, random_gen)

            # Elabora wildcards __keyword__
            text, _ = self._replace_wildcards(text, random_gen)

            # Se il testo non è cambiato, abbiamo finito
            if text == original_text:
                break

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
        pattern = r'(?P<full_match>(?P<quantifier>\d+)#__(?P<keyword>[\w.\-+/\\]+?)__)'
        matches = re.finditer(pattern, text, re.IGNORECASE)

        result = []
        for match in matches:
            result.append({
                'full_match': match.group('full_match'),
                'quantifier': match.group('quantifier'),
                'keyword': match.group('keyword')
            })

        return result

    def _replace_options(self, string, random_gen):
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

                adjusted_probabilities.append(config_value)
                total_prob += config_value

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

            replacements_found = True
            return replacement

        # Pattern per opzioni multiple
        pattern = r'(?<!\\)\{((?:[^{}]|(?<=\\)[{}])*?)(?<!\\)\}'
        replaced_string = re.sub(pattern, replace_option, string)

        return replaced_string, replacements_found

    def _replace_wildcards(self, string, random_gen):
        """
        Sostituisce wildcards nel formato __keyword__.
        """
        pattern = r"__([\w.\-+/\\]+?)__"
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

                    adjusted_probabilities.append(config_value)
                    total_prob += config_value

                normalized_probabilities = [prob / total_prob for prob in adjusted_probabilities]

                # Seleziona un'opzione
                selected_item = random_gen.choice(options, p=normalized_probabilities, replace=False)
                replacement = re.sub(r'^\s*[0-9.]+::', '', str(selected_item), count=1)

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
                    replacement = random_gen.choice(total_patterns)
                    replacements_found = True
                    string = string.replace(f"__{match}__", replacement, 1)

        return string, replacements_found

    def _get_wildcard_options(self, keyword):
        """
        Ottieni le opzioni per un wildcard specifico.
        Prima cerca la chiave diretta, poi pattern di ricerca.
        """
        wildcard_dict = WildcardLoader.get_wildcards_dict()
        
        # Prima prova la chiave diretta
        options = wildcard_dict.get(keyword)
        if options:
            return options
        
        # Se non trova, cerca con pattern (come Impact Pack)
        total_patterns = []
        found = False
        
        # Pattern matching generale - cerca chiavi che terminano con /keyword
        for k in wildcard_dict.keys():
            if k == keyword or k.endswith('/' + keyword):
                v = wildcard_dict.get(k)
                if v:
                    total_patterns.extend(v)
                    found = True
        
        return total_patterns if found else None

    def _wildcard_normalize(self, x):
        """Normalizza il nome del wildcard."""
        return x.replace("\\", "/").replace(' ', '-').lower()

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
