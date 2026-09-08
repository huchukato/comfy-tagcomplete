import random

from comfy.comfy_types import IO, InputTypeDict

from .wildcards import WildcardLoader


class WildcardProcessorNode:
    _session_usage: dict[str, dict[str, int]] = {}

    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "text": (IO.STRING, {"default": "", "multiline": True, "dynamicPrompts": False,
                                     "tooltip": "Enter a prompt using wildcard syntax."}),
            },
            "optional": {
                "seed": (IO.INT, {"default": 0, "min": 0, "max": 0xffffffffffffffff,
                                  "tooltip": "Seed for randomization (0 = random)."}),
                "populated_text": (IO.STRING, {"default": "", "multiline": True, "dynamicPrompts": False,
                                               "tooltip": "In populate mode: displays the expanded result (read-only). In fixed mode: editable, used as-is."}),
                "mode": (["populate", "fixed", "reproduce"], {"default": "populate",
                           "tooltip": "Populate: expands wildcards from text on each queue. Fixed: uses populated_text as-is (editable). Reproduce: re-uses populated_text once, then switches back to populate."}),
                "deduplicate": (IO.BOOLEAN, {"default": True,
                                             "tooltip": "Reduce the probability of options already used this session."}),
                "downvote_factor": (IO.FLOAT, {"default": 0.5, "min": 0.01, "max": 1.0, "step": 0.05,
                                              "tooltip": "Probability multiplier applied for each previous use."}),
            },
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("processed_text",)
    FUNCTION = "process_wildcards"
    CATEGORY = "ComfyUI-TagComplete"

    def process_wildcards(self, text, seed=0, populated_text="", mode="populate",
                          deduplicate=True, downvote_factor=0.5, **kwargs):
        WildcardLoader.load()
        if mode == "fixed":
            result = populated_text
        else:
            source = populated_text if mode == "reproduce" else text
            actual_seed = seed or random.SystemRandom().randint(1, 0xffffffffffffffff)
            usage = self._session_usage if deduplicate and downvote_factor < 1.0 else None
            result = WildcardLoader.process(source, actual_seed, usage, downvote_factor)
        return {"ui": {"text": [result]}, "result": (result,)}

    @classmethod
    def reset_session_cache(cls):
        cls._session_usage.clear()
