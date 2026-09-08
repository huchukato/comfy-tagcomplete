import { app } from "../../scripts/app.js";
import { ComfyWidgets } from "../../scripts/widgets.js";
import { mk_name, findTextareaFromWidget } from "./utils.js";
import { settings } from "./settings.js";
import { TagCompleter } from "./completer/tag_completer.js";
import {
    enhanceWildcardProcessorNode,
    installQueueHook,
    buildWildcardNodeMenuItems,
} from "./wildcard_processor.js";

// ==============================================
// STRINGウィジェットのハイジャック
// ==============================================
function hijackSTRING() {
    const widgets = ComfyWidgets || app?.widgets;
    const STRING = widgets?.STRING;
    if (!STRING) {
        console.warn("[TagComplete] ComfyWidgets.STRING not found; autocomplete disabled.");
        return;
    }

    const SKIP_WIDGETS = new Set(["ttN xyPlot.x_values", "ttN xyPlot.y_values", "MathExpression|pysssss.expression"]);

    widgets.STRING = function(node, inputName, inputData) {
        const res = STRING.apply(this, arguments);
        const widgetData = Array.isArray(inputData) ? inputData[1] : inputData;

        if (widgetData?.multiline) {
            const config = widgetData?.["tagcomplete"] ?? widgetData?.["pysssss.autocomplete"];
            if (config === false) return res;

            const id = `${node?.comfyClass ?? node?.type}.${inputName}`;
            if (SKIP_WIDGETS.has(id)) return res;

            const textarea = findTextareaFromWidget(res?.widget);
            if (textarea) {
                new TagCompleter(textarea);
            }
        }

        return res;
    };
}


// ==============================================
// エクステンションの定義
// ==============================================
const extension = {
    name: mk_name("TagCompleter"),

    // ------------------------------------------
    // 設定
    // ------------------------------------------
    settings: [],

    // ------------------------------------------
    // 初期化
    // ------------------------------------------
    init: async function(app) {
        hijackSTRING();
        installQueueHook(app);
    },

    // ------------------------------------------
    // セットアップ
    // ------------------------------------------
    setup: async function(app) {
    },

    // ------------------------------------------
    // Node definition extension
    // ------------------------------------------
    beforeRegisterNodeDef: function(nodeType, nodeData, app) {
        if (nodeData.name === "WildcardProcessor") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;

                // Setup populated_text visibility based on mode
                const modeWidget = this.widgets.find(w => w.name === "mode");
                const populatedTextWidget = this.widgets.find(w => w.name === "populated_text");
                if (modeWidget && populatedTextWidget) {
                    const updatePopulatedVisibility = () => {
                        if (!populatedTextWidget.inputEl) return;
                        const mode = modeWidget.value;
                        if (mode === "populate") {
                            // In populate mode: show as read-only (result appears after queue)
                            populatedTextWidget.inputEl.readOnly = true;
                            populatedTextWidget.inputEl.style.opacity = "0.7";
                        } else {
                            // In fixed/reproduce mode: editable
                            populatedTextWidget.inputEl.readOnly = false;
                            populatedTextWidget.inputEl.style.opacity = "1";
                        }
                    };
                    const originalModeCallback = modeWidget.callback;
                    modeWidget.callback = function(value) {
                        if (originalModeCallback) originalModeCallback.call(this, value);
                        updatePopulatedVisibility();
                    };
                    updatePopulatedVisibility();
                }

                // Add the new wildcard toolbar and cache status label.
                try {
                    enhanceWildcardProcessorNode(this);
                } catch (error) {
                    console.warn("[TagComplete] Failed to enhance WildcardProcessor node:", error);
                }

                return r;
            };

            const onExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function(message) {
                onExecuted?.apply(this, arguments);
                if (message?.text) {
                    const text = message.text[0];
                    const modeWidget = this.widgets.find(w => w.name === "mode");
                    const populatedTextWidget = this.widgets.find(w => w.name === "populated_text");

                    // In populate mode, write the expanded result into populated_text
                    if (populatedTextWidget && modeWidget?.value !== "fixed") {
                        populatedTextWidget.value = text;
                        if (populatedTextWidget.inputEl) populatedTextWidget.inputEl.value = text;
                    }
                }
            };
        }
    },

    getNodeMenuItems: function(node) {
        if (node.comfyClass === "WildcardProcessor" || node.type === "WildcardProcessor") {
            return buildWildcardNodeMenuItems(node);
        }
        return [];
    },
};

// Load settings before registering so the settings panel is populated.
try {
    await settings.load();
    extension.settings = settings.getList();
} catch (error) {
    console.warn("[TagComplete] Failed to load settings:", error);
}

app.registerExtension(extension);
