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

                // Aggiungi widget di preview
                const widget = ComfyWidgets["STRING"](this, "preview", ["STRING", { multiline: true }], app).widget;
                widget.inputEl.readOnly = true;
                widget.inputEl.style.opacity = 0.7;
                widget.inputEl.style.fontSize = "10px";
                widget.serializeValue = async () => undefined; // Non salvare nel workflow

                // Disabilita e nasconde populated_text quando populate è attivo
                const populateWidget = this.widgets.find(w => w.name === "populate");
                const populatedTextWidget = this.widgets.find(w => w.name === "populated_text");
                if (populateWidget && populatedTextWidget) {
                    const updateVisibility = () => {
                        const populated = populateWidget.value;
                        if (!populatedTextWidget.inputEl) return;
                        populatedTextWidget.inputEl.disabled = populated;
                        // Nasconde il widget populated_text quando populate è attivo
                        // per evitare confusione con il campo preview
                        populatedTextWidget.inputEl.style.display = populated ? "none" : "";
                        // Nasconde anche la label
                        const labelEl = populatedTextWidget.inputEl.previousElementSibling;
                        if (labelEl && labelEl.tagName === "LABEL") {
                            labelEl.style.display = populated ? "none" : "";
                        }
                    };
                    const originalCallback = populateWidget.callback;
                    populateWidget.callback = function(value) {
                        if (originalCallback) originalCallback.call(this, value);
                        updateVisibility();
                    };
                    updateVisibility();
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

                    const widget = this.widgets.find(w => w.name === "preview");
                    if (widget) {
                        widget.value = text;
                        if (widget.inputEl) widget.inputEl.value = text;
                    }

                    // In modalità populate, salva il testo popolato in populated_text
                    // così può essere memorizzato nel workflow e riutilizzato con populate=False
                    const populateWidget = this.widgets.find(w => w.name === "populate");
                    const populatedTextWidget = this.widgets.find(w => w.name === "populated_text");
                    if (populateWidget?.value && populatedTextWidget) {
                        populatedTextWidget.value = text;
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
