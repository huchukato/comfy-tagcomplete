import { app } from "../../scripts/app.js";
import { ComfyWidgets } from "../../scripts/widgets.js";
import { mk_name, findTextareaFromWidget } from "./utils.js";
import { settings } from "./settings.js";
import { TagCompleter } from "./completer/tag_completer.js";

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

                // Fix caching: quando il text widget cambia, incrementa refresh_token
                // per forzare ComfyUI a rieseguire il nodo
                const textWidget = this.widgets.find(w => w.name === "text");
                const refreshWidget = this.widgets.find(w => w.name === "refresh_token");
                if (textWidget && refreshWidget) {
                    // Nascondi refresh_token dall'UI completamente
                    const hideRefresh = () => {
                        if (refreshWidget.inputEl) {
                            refreshWidget.inputEl.style.display = "none";
                            const refreshLabel = refreshWidget.inputEl.previousElementSibling;
                            if (refreshLabel && refreshLabel.tagName === "LABEL") {
                                refreshLabel.style.display = "none";
                            }
                            // Nascondi anche il container
                            if (refreshWidget.inputEl.parentElement) {
                                refreshWidget.inputEl.parentElement.style.display = "none";
                            }
                        }
                        // Forza altezza zero
                        refreshWidget.computeSize = () => [0, -4];
                    };
                    hideRefresh();

                    // Callback originale del text widget
                    const originalTextCallback = textWidget.callback;
                    let lastTextValue = textWidget.value;

                    // Intercetta i cambiamenti del testo
                    const checkTextChange = () => {
                        if (textWidget.value !== lastTextValue) {
                            lastTextValue = textWidget.value;
                            refreshWidget.value = (refreshWidget.value || 0) + 1;
                        }
                    };

                    // Aggancia sia al callback che all'input event
                    textWidget.callback = function(value) {
                        if (originalTextCallback) originalTextCallback.call(this, value);
                        checkTextChange();
                    };

                    if (textWidget.inputEl) {
                        textWidget.inputEl.addEventListener("input", checkTextChange);
                        textWidget.inputEl.addEventListener("change", checkTextChange);
                    }
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

            // Nascondi refresh_token anche quando si carica un workflow esistente
            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function() {
                const r = onConfigure ? onConfigure.apply(this, arguments) : undefined;
                const refreshWidget = this.widgets?.find(w => w.name === "refresh_token");
                if (refreshWidget) {
                    if (refreshWidget.inputEl) {
                        refreshWidget.inputEl.style.display = "none";
                        const refreshLabel = refreshWidget.inputEl.previousElementSibling;
                        if (refreshLabel && refreshLabel.tagName === "LABEL") {
                            refreshLabel.style.display = "none";
                        }
                        if (refreshWidget.inputEl.parentElement) {
                            refreshWidget.inputEl.parentElement.style.display = "none";
                        }
                    }
                    refreshWidget.computeSize = () => [0, -4];
                }
                return r;
            };
        }
    }
};

// Load settings before registering so the settings panel is populated.
try {
    await settings.load();
    extension.settings = settings.getList();
} catch (error) {
    console.warn("[TagComplete] Failed to load settings:", error);
}

app.registerExtension(extension);
