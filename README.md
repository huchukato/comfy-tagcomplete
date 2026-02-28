# ComfyUI-TagComplete

[![ComfyUI](https://img.shields.io/badge/ComfyUI-Extension-blue?logo=comfyui&style=for-the-badge)](https://github.com/comfyanonymous/ComfyUI)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/Version-2.0.0-orange?style=for-the-badge)](https://github.com/huchukato/comfy-tagcomplete/releases)
[![Stars](https://img.shields.io/github/stars/huchukato/comfy-tagcomplete?style=for-the-badge&logo=github)](https://github.com/huchukato/comfy-tagcomplete)
[![Issues](https://img.shields.io/github/issues/huchukato/comfy-tagcomplete?style=for-the-badge&logo=github)](https://github.com/huchukato/comfy-tagcomplete/issues)

[<img src="https://img.shields.io/badge/lang-English-red.svg?style=plastic" height="25" />](README.md)
[<img src="https://img.shields.io/badge/lang-Italiano-blue.svg?style=plastic" height="25" />](README.it.md)

[![buy-me-coffees](https://i.imgur.com/3MDbAtw.png)](https://buymeacoffee.com/huchukato)

[demo](https://github.com/user-attachments/assets/d55e4159-a524-4b05-b8d2-3c62ad6b207f)

*🎬 **Watch the demo**: See wildcard sub-selection and tag completion in action!*

## 🎯 About

**ComfyUI-TagComplete** is an advanced extension that brings professional-grade tag completion and wildcard sub-selection to ComfyUI, inspired by the renowned a1111-sd-webui-tagcomplete. Designed for AI artists and prompt engineers who demand precision and efficiency in their workflow.

### 🚀 What Makes It Special

- **🧠 Intelligent Tag Completion**: Real-time suggestions from comprehensive CSV databases (Danbooru, e621, custom tags)
- **🎪 Wildcard Sub-Selection**: Revolutionary a1111-style workflow for complex prompt building
- **🌐 Multi-Source Support**: Seamlessly integrates wildcards from multiple locations and extensions
- **⚡ Performance Optimized**: Lightweight, fast, and doesn't slow down your ComfyUI experience
- **🔧 Highly Customizable**: Extensive settings to tailor the experience to your needs

### 🎨 Perfect For

- **AI Artists** who want to streamline their prompt creation process
- **Prompt Engineers** needing precise control over tag combinations
- **Content Creators** looking to maintain consistency across generations
- **Power Users** who want professional-grade tools in their workflow

### 🌟 Key Innovation

The standout feature is the **wildcard sub-selection system** - type `__`, select a wildcard, and instantly browse through individual options with smart text handling and overflow management. This transforms complex prompt building from a chore into an intuitive, creative process.

---

## ⚙️ Wildcard Processor Node

**ComfyUI-TagComplete** now includes a powerful **WildcardProcessor** node that brings advanced prompt processing capabilities directly to your ComfyUI workflows, eliminating the need to install the entire Impact Pack just for wildcard processing.

### 🎯 Features

- **🧠 Advanced Wildcard Processing**: Process complex prompts with wildcards in the format `__keyword__`
- **🎲 Dynamic Options**: Support for multiple choice options `{option1|option2|option3}`
- **📊 Weighted Randomization**: Probability-based selection with syntax `weight::option`
- **🔢 Quantifiers**: Select multiple items with syntax `count__keyword__`
- **🎭 Custom Separators**: Control output formatting with custom separators
- **🌱 Reproducible Results**: Seed-based randomization for consistent outputs

### 📝 Usage Examples

#### Basic Wildcard Processing
```
Input: A beautiful __color__ landscape painting
Output: A beautiful red landscape painting
```

#### Multiple Choice Options
```
Input: A {cat|dog|bird} sitting on a {chair|table|floor}
Output: A cat sitting on a chair
```

#### Weighted Randomization
```
Input: Create a {2::portrait|1::landscape} image
Output: Create a portrait image (66% chance) or landscape image (33% chance)
```

#### Quantifiers
```
Input: 3__color__ flowers in a __container__
Output: red yellow blue flowers in a vase
```

#### Custom Separators
```
Input: {apple$$, $$orange$$, $$banana$$}__fruit__
Output: apple, orange, banana fruits
```

### 🔧 Node Inputs

- **text** (STRING, required): The prompt text containing wildcards and dynamic options
- **seed** (INT, optional): Randomization seed (0 = random seed)

### 📤 Node Outputs

- **processed_text** (STRING): The fully processed prompt with all wildcards resolved

### 🚀 Workflow Integration

The WildcardProcessor node seamlessly integrates with your existing ComfyUI workflows:

1. **Connect** your prompt generation to the `text` input
2. **Set a seed** for reproducible results (optional)
3. **Connect the output** to your text-to-image pipeline
4. **Generate** with fully resolved, dynamic prompts!

---

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
3. DynamicPrompts `wildcards/`
4. Extra model paths configuration
5. Impact-Pack wildcards
6. Impact-Pack.ini custom paths

This extension is based on [ComfyUI-Custom-Scripts](https://github.com/pythongosssss/ComfyUI-Custom-Scripts).

The following files in the tags folder are based on or inspired by [a1111-sd-webui-tagcomplete](https://github.com/DominikDoom/a1111-sd-webui-tagcomplete):

- danbooru.csv (updated and cleaned, deprecated tags removed as of February 2026)
- danbooru_e621_merged.csv
- extra-quality-tags.csv

Additionally, this extension includes **wildcard sub-selection functionality** inspired by a1111-sd-webui-tagcomplete, allowing users to select individual options from wildcard files with an intuitive workflow.

## Install
```
cd ComfyUI/custom_nodes
git clone https://github.com/huchukato/comfy-tagcomplete.git
```

### 📁 Manual Wildcard Setup (Optional)

If you're installing manually or want to use wildcards with Impact Pack, you may need to copy the wildcards folder:

1. **Copy wildcards to Impact Pack:**
   ```bash
   cp -r /path/to/comfy-tagcomplete/wildcards /path/to/ComfyUI/custom_nodes/comfyui-impact-pack/wildcards/
   ```

2. **Restart ComfyUI** to load the new wildcards

**Note:** The extension automatically detects wildcards from multiple sources, but manual copying ensures maximum compatibility with Impact Pack and other extensions.

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
