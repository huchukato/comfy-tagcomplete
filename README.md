# ComfyUI-TagComplete

[![ComfyUI](https://img.shields.io/badge/ComfyUI-Extension-blue?logo=comfyui&style=for-the-badge)](https://github.com/comfyanonymous/ComfyUI)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/Version-2.0.0-orange?style=for-the-badge)](https://github.com/huchukato/comfy-tagcomplete/releases)
[![Stars](https://img.shields.io/github/stars/huchukato/comfy-tagcomplete?style=for-the-badge&logo=github)](https://github.com/huchukato/comfy-tagcomplete)
[![Issues](https://img.shields.io/github/issues/huchukato/comfy-tagcomplete?style=for-the-badge&logo=github)](https://github.com/huchukato/comfy-tagcomplete/issues)

[<img src="https://img.shields.io/badge/lang-English-red.svg?style=plastic" height="25" />](README.md)
[<img src="https://img.shields.io/badge/lang-Italiano-blue.svg?style=plastic" height="25" />](README.it.md)

![capture](https://files.catbox.moe/fv292m.webp)

## ✨ New in v2.0.0 - Wildcard Sub-Selection

This version introduces **a1111-sd-webui-tagcomplete style wildcard sub-selection**, making wildcard usage more intuitive and powerful:

### 🎯 Wildcard Workflow
1. **Type `__`** to see available wildcards
2. **Select a wildcard** with arrow keys and press **Enter** → inserts `__wildcard_name__`
3. **Auto-show options** → immediately displays all options from that wildcard
4. **Select an option** with arrow keys and press **Enter** → replaces wildcard with chosen option
5. **ESC** → keeps inserted wildcard and closes options

### 🌟 Features
- **Smart parsing**: Handles wildcards with complex paths (e.g., `__mbe/blwjob/blwjb__`)
- **Line-by-line options**: Each line in wildcard file becomes a separate option
- **Text overflow handling**: Long options are truncated with hover expansion
- **Full compatibility**: Works with existing wildcard files and formats
- **Multiple sources**: Supports wildcards from repository, ComfyUI/models, DynamicPrompts, and Impact-Pack

### 📁 Wildcard Sources (in priority order):
1. Repository `wildcards/` folder
2. ComfyUI `models/wildcards/`
3. ComfyUI `custom_nodes/wildcards/`
4. DynamicPrompts `wildcards/`
5. Extra model paths configuration
6. Impact-Pack wildcards
7. Impact-Pack.ini custom paths

This extension is based on [ComfyUI-Custom-Scripts](https://github.com/pythongosssss/ComfyUI-Custom-Scripts).

Also, the following files in the tags folder:

- danbooru.csv
- danbooru_e621_merged.csv
- extra-quality-tags.csv

are borrowed from [a1111-sd-webui-tagcomplete](https://github.com/DominikDoom/a1111-sd-webui-tagcomplete).

## Install
```
cd ComfyUI\custom_nodes
git clone https://github.com/huchukato/comfy-tagcomplete.git
```

## Settings
![settings](https://files.catbox.moe/0ai9mj.png)

- `Enable`
  - Enable the feature
- `Main Tags file`
  - Main tags CSV file
  - Targets **all CSV files except those starting with 'extra'** in the tags folder
- `Extra Tags file`
  - Additional tags CSV file
  - Targets **only CSV files starting with 'extra'** in the tags folder
- `Translate file` ⭐new
  - Set a translation file
- `Delimiter`
  - Tag separator character
  - Choose from comma (,), period (.), or none
- `Add 'Space' after separator`
  - Add a space after the separator
- `Insert Tag on Tab key`
  - Insert tag with Tab key
- `Insert Tag on Enter key`
  - Insert tag with Enter key
- `Max Suggestions to Display`
  - Number of tag suggestions to display
  - 0 displays all ~~but becomes heavy (extremely heavy)~~
- `Add Wiki Link Button`
  - Add wiki (danbooru / e621) link button to the left of tag suggestions
- `Replace '_' to 'Space'`
  - Replace underscores in tags with spaces
- `Completion delay(ms)`
  - Time before displaying tag suggestions after input
- `Enable Embeddings`
  - Include Embedding files in suggestions
- `Enable LoRAs`
  - Include LoRA files in suggestions
- `Enable Wildcards` ⭐new
  - Include wildcards in suggestions
- `Restrict Alias`
  - When ON, Aliases (like 1girls => 1girl) are only displayed on exact match
  - For example, the alias "1girls => 1girl" will only be displayed when you type up to "1girls"

## Category Filter
![filter](https://files.catbox.moe/bir330.png)

You can search by specifying categories.  
Enter `--○○` to specify a category.  
Available categories are listed in [Category Map](category_map.csv).  
- Example
  - `--character fate`
    - Displays only results with category `character` from the `fate` search results.

## Prefix
![prefix](https://files.catbox.moe/uddq2d.png)

You can search with prefix settings.  
Enter `++○○` to set a prefix.  
Multiple prefixes can be set.  
- Example
  - `++pink skirt`
    - When searching for "skirt" and selecting `pleated skirt`, the result will be `pink pleated skirt`.