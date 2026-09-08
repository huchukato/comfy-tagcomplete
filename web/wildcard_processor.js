import { app } from "../../scripts/app.js";
import { api_post } from "./utils.js";

// ===============================================
// TagForge Wildcard Processor – frontend helpers
// ===============================================

const WIDGET_NAMES = {
    text: "text",
    seed: "seed",
    populatedText: "populated_text",
    deduplicate: "deduplicate",
    downvoteFactor: "downvote_factor",
    mode: "mode",
};

const WILDCARD_MODE_PROP = "tagforge_wildcard_mode";
const REPRODUCE_SEED_PROP = "tagforge_reproduce_seed";

export const MODES = Object.freeze({
    POPULATE: "populate",
    FIXED: "fixed",
    REPRODUCE: "reproduce",
});

const ENDPOINTS = {
    process: "tagcomplete/wildcards/process",
};

let queueHookInstalled = false;

// =================================================
// API
// =================================================

export async function processWildcards(payload, signal) {
    return await api_post(ENDPOINTS.process, payload, { signal });
}

// =================================================
// Widget / node helpers
// =================================================

function getWidgetByName(node, name) {
    return node.widgets?.find((w) => w.name === name);
}

function getAllNodes(appRef) {
    const graph = appRef?.graph ?? appRef?.canvas?.graph;
    return graph?._nodes ?? [];
}

function isWildcardNode(node) {
    return (
        node.type === "WildcardProcessor" ||
        node.comfyClass === "WildcardProcessor"
    );
}

export function getMode(node) {
    const saved = node.properties?.[WILDCARD_MODE_PROP];
    if (saved && saved !== "backend") return saved;
    const widgetMode = getWidgetByName(node, WIDGET_NAMES.mode)?.value;
    if (widgetMode === "legacy") return MODES.POPULATE;
    return widgetMode ?? MODES.POPULATE;
}

export function setMode(node, mode) {
    node.properties = node.properties || {};
    node.properties[WILDCARD_MODE_PROP] = mode;
    const modeWidget = getWidgetByName(node, WIDGET_NAMES.mode);
    if (modeWidget) modeWidget.value = mode;
    if (modeWidget?.callback) modeWidget.callback(mode);
}

export function getReproduceSeed(node) {
    return node.properties?.[REPRODUCE_SEED_PROP];
}

export function setReproduceSeed(node, seed) {
    node.properties = node.properties || {};
    node.properties[REPRODUCE_SEED_PROP] = Number(seed) || 0;
}

export function captureReproduceSeed(node) {
    const seedWidget = getWidgetByName(node, WIDGET_NAMES.seed);
    if (!seedWidget) return;
    setReproduceSeed(node, seedWidget.value);
    setMode(node, MODES.REPRODUCE);
}

// =================================================
// Context-menu helpers
// =================================================

export function buildWildcardNodeMenuItems(node) {
    const currentMode = getMode(node);

    const modeItem = (mode, label) => ({
        content: `${currentMode === mode ? "✓ " : ""}${label}`,
        callback: () => setMode(node, mode),
    });

    return [
        { content: "TagForge Wildcards", disabled: true },
        {
            content: "Mode",
            submenu: {
                options: [
                    modeItem(MODES.POPULATE, "Populate"),
                    modeItem(MODES.FIXED, "Fixed"),
                    modeItem(MODES.REPRODUCE, "Reproduce"),
                ],
            },
        },
        {
            content: "Capture reproduce seed",
            callback: () => captureReproduceSeed(node),
        },
    ];
}

// =================================================
// Pre-queue processing hook
// =================================================

async function prepareWildcardNodes(appRef, _queueNodeIds) {
    const nodes = getAllNodes(appRef);

    for (const node of nodes) {
        if (!isWildcardNode(node)) continue;

        const mode = getMode(node);

        const textWidget = getWidgetByName(node, WIDGET_NAMES.text);
        const seedWidget = getWidgetByName(node, WIDGET_NAMES.seed);
        const populatedTextWidget = getWidgetByName(
            node,
            WIDGET_NAMES.populatedText
        );
        const dedupWidget = getWidgetByName(node, WIDGET_NAMES.deduplicate);
        const factorWidget = getWidgetByName(
            node,
            WIDGET_NAMES.downvoteFactor
        );

        const modeWidget = getWidgetByName(node, WIDGET_NAMES.mode);
        if (modeWidget) node.__tagforge_original_mode = modeWidget.value;

        if (mode === MODES.FIXED) {
            continue;
        }

        let seed = seedWidget?.value ?? 0;
        if (mode === MODES.REPRODUCE) {
            const stored = getReproduceSeed(node);
            if (stored !== undefined && stored !== null) {
                seed = stored;
            }
        }

        const payload = {
            text: textWidget?.value ?? "",
            seed: seed,
            populated_text: populatedTextWidget?.value ?? "",
            deduplicate: dedupWidget?.value ?? true,
            downvote_factor: factorWidget?.value ?? 0.5,
            mode,
        };

        try {
            const res = await processWildcards(payload);
            const processedText =
                res?.processed_text ?? res?.text ?? (res?.result ? res.result[0] : undefined);
            const returnedSeed = res?.seed ?? res?.used_seed;

            if (processedText !== undefined && populatedTextWidget) {
                populatedTextWidget.value = processedText;
            }
            if (mode === MODES.REPRODUCE && returnedSeed !== undefined) {
                setReproduceSeed(node, returnedSeed);
            }
            if (
                returnedSeed !== undefined &&
                seedWidget &&
                (mode === MODES.REPRODUCE || seed !== 0)
            ) {
                seedWidget.value = returnedSeed;
            }
            if (modeWidget) modeWidget.value = mode;
        } catch (error) {
            console.error("[TagForge] Pre-queue wildcard processing failed:", error);
        }
    }
}

function restorePopulateFlags(appRef) {
    for (const node of getAllNodes(appRef)) {
        if (!isWildcardNode(node)) continue;
        if (!("__tagforge_original_mode" in node)) continue;

        const modeWidget = getWidgetByName(node, WIDGET_NAMES.mode);
        if (modeWidget) {
            modeWidget.value = node.__tagforge_original_mode;
        }
        delete node.__tagforge_original_mode;
    }
}

export function installQueueHook(appRef) {
    if (queueHookInstalled || !appRef?.queuePrompt) return;
    queueHookInstalled = true;

    const originalQueuePrompt = appRef.queuePrompt.bind(appRef);
    appRef.queuePrompt = async function queuePrompt_wrapper(...args) {
        const queueNodeIds = args[2];
        try {
            await prepareWildcardNodes(appRef, queueNodeIds);
        } catch (error) {
            console.error("[TagForge] prepareWildcardNodes failed:", error);
        }

        try {
            return await originalQueuePrompt.apply(this, args);
        } finally {
            restorePopulateFlags(appRef);
            for (const node of getAllNodes(appRef)) {
                if (isWildcardNode(node) && getMode(node) === MODES.REPRODUCE) {
                    setMode(node, MODES.POPULATE);
                }
            }
        }
    };
}

// =================================================
// Main node enhancement (no-op, kept for API compat)
// =================================================

export function enhanceWildcardProcessorNode(node) {
    if (node?.__tagforge_enhanced) return;
    node.__tagforge_enhanced = true;
}
