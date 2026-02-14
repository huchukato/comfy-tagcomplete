# Changelog

All notable changes to ComfyUI-TagComplete will be documented in this file.

## [2.0.0] - 2025-02-14

### 🎉 MAJOR FEATURE - Wildcard Sub-Selection
- **NEW**: a1111-sd-webui-tagcomplete style wildcard sub-selection
- **NEW**: Type `__` → select wildcard → press Enter → auto-show options
- **NEW**: Select option with arrow keys → press Enter → replace wildcard
- **NEW**: ESC to keep wildcard and close options
- **NEW**: Smart parsing for wildcards with complex paths (`__mbe/blwjob/blwjb__`)
- **NEW**: Line-by-line option parsing from wildcard files
- **NEW**: Text overflow handling with truncation and hover expansion
- **NEW**: CSS styling for long wildcard options (max-width: 600px)

### 🔧 Technical Improvements
- **FIXED**: Backend now uses `\n` separator instead of commas for wildcard options
- **FIXED**: Wildcard replacement works correctly with complex paths
- **FIXED**: Proper cursor position tracking for wildcard insertion
- **IMPROVED**: Multiple wildcard source support with priority ordering
- **IMPROVED**: Better error handling and fallback mechanisms

### 📁 Wildcard Sources (Priority Order)
1. Repository `wildcards/` folder (highest priority)
2. ComfyUI `models/wildcards/`
3. ComfyUI `custom_nodes/wildcards/`
4. DynamicPrompts `wildcards/`
5. Extra model paths configuration
6. Impact-Pack wildcards
7. Impact-Pack.ini custom paths

### 🐛 Bug Fixes
- Fixed wildcard options appearing on single line instead of multiple lines
- Fixed wildcard replacement leaving original wildcard text
- Fixed CSS styling not applying to wildcard options
- Fixed cursor position issues during wildcard insertion

### ⚠️ Breaking Changes
- None - fully backward compatible with existing wildcard files

---

## [1.0.0] - Previous Versions
- Basic tag completion functionality
- CSV tag file support
- Embedding and LoRA suggestions
- Basic wildcard support (no sub-selection)
