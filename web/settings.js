import { mk_name, api_get, api_post } from "./utils.js";
import { TagCompleter } from "./completer/tag_completer.js";

// ==============================================
// 設定オブジェクト
// ==============================================

export const settings = {
    // 登録用のリストを返す
    getList() {
        return Object.values(this)
            .filter(v => v && typeof v === "object" && !Array.isArray(v))
            .slice()
            .reverse();
    },

    // APIからファイル一覧を読み込み、設定を更新
    async load() {
        try {
            const mainFiles = await api_get("get_main_files");
            const extraFiles = await api_get("get_extra_files");
            const translateFiles = ["None"].concat(await api_get("get_translate_files").then(files => files.filter(f => f !== "None")));

            this.mainFile.options = mainFiles;
            this.mainFile.defaultValue = mainFiles[0] ?? "";

            this.extraFile.options = extraFiles;
            this.extraFile.defaultValue = extraFiles[0] ?? "";

            this.translateFile.options = translateFiles;
            this.translateFile.defaultValue = translateFiles[0] ?? "None";
        } catch (error) {
            console.warn("[TagComplete] Failed to load settings:", error);
        }
    },

    // ------------------------------------------
    // 以下、各種設定
    // ------------------------------------------
    enable: {
        name: "Enable",
        id: mk_name("enable"),
        type: "boolean",
        defaultValue: true,
        onChange: async (value) => {
            TagCompleter.updateSetting("enable", value);
            await api_post("toggle_enable", { value: value })
        },
    },

    mainFile: {
        name: "Choose Main File",
        id: mk_name("mainTagsFile"),
        type: "combo",
        defaultValue: "",
        options: [],
        onChange: async (value) => {
            await api_post("load_main", { filename: value });
        },
    },

    extraFile: {
        name: "Choose Extra File",
        id: mk_name("extraTagsFile"),
        type: "combo",
        defaultValue: "",
        options: [],
        onChange: async (value) => {
            await api_post("load_extra", { filename: value });
        },
    },

    translateFile: {
        name: "Choose Translate File",
        id: mk_name("translateFile"),
        type: "combo",
        defaultValue: "None",
        options: ["None"],
        onChange: async (value) => {
            await api_post("load_translate", { filename: value });
        },
    },

    delimiter: {
        name: "Delimiter",
        id: mk_name("delimiter"),
        type: "combo",
        defaultValue: ",",
        options: [
            { text: "Comma (,)", value: "," },
            { text: "Period (.)", value: "." },
            { text: "None", value: "" },
        ],
        onChange: (value) => {
            TagCompleter.updateSetting("delimiter", value);
        },
    },

    addSpace: {
        name: "Add 'Space' after delimiter",
        id: mk_name("insertSpace"),
        type: "boolean",
        defaultValue: true,
        onChange: (value) => {
            TagCompleter.updateSetting("addSpace", value);
        },
    },

    suggestionCount: {
        name: "Max Suggestions to Display",
        id: mk_name("suggestionCount"),
        type: "slider",
        defaultValue: 20,
        attrs: { min: 0, max: 200, step: 1 },
        tooltip: "0: Show all avaliable suggestion.",
        onChange: async (value) => {
            await api_post("set_suggestion_count", { value: value });
        },
    },

    wikiLink: {
        name: "Add 🔍 Link button",
        id: mk_name("wikiLink"),
        type: "boolean",
        defaultValue: true,
        tooltip: "Add a 🔍 button that opens the tag's site page.",
        onChange: (value) => {
            TagCompleter.updateSetting("wikiLink", value);
        },
    },

    replaceUnderbar: {
        name: "Replace '_' with 'Space'",
        id: mk_name("replaceUnderbar"),
        type: "boolean",
        defaultValue: true,
        onChange: (value) => {
            TagCompleter.updateSetting("replaceUnderbar", value);
        },
    },

    delay: {
        name: "Completion Delay (ms)",
        id: mk_name("completionDelay"),
        type: "slider",
        defaultValue: 50,
        attrs: { min: 0, max: 200, step: 10 },
        onChange: (value) => {
            TagCompleter.updateSetting("delay", value);
        },
    },

    embeddings: {
        name: "Enable Embeddings",
        id: mk_name("enableEmbeddings"),
        type: "boolean",
        defaultValue: false,
        onChange: async (value) => {
            await api_post("load_embeddings", { value : value });
        },
    },

    loras: {
        name: "Enable LoRAs",
        id: mk_name("enableLoras"),
        type: "boolean",
        defaultValue: false,
        onChange: async (value) => {
            await api_post("load_loras", { value: value });
        },
    },

    wildcards: {
        name: "Enable Wildcards",
        id: mk_name("enableWildcards"),
        type: "boolean",
        defaultValue: true,
        onChange: async (value) => {
            await api_post("load_wildcards", { value: value });
        },
    },

    restirctAlias: {
        name: "Restrict Alias",
        id: mk_name("restrict Alias"),
        type: "boolean",
        defaultValue: false,
        tooltip: "If enabled, aliases are only sohwn when an exact match is found.",
        onChange: async (value) => {
            await api_post("set_restrict_alias", { value: value });
        },
    },

}
