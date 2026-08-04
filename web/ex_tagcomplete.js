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
};

// Load settings before registering so the settings panel is populated.
try {
    await settings.load();
    extension.settings = settings.getList();
} catch (error) {
    console.warn("[TagComplete] Failed to load settings:", error);
}

app.registerExtension(extension);
