import { app } from "../../scripts/app.js";
import { api_get, api_post, mkEl, findTextareaFromWidget } from "./utils.js";

// ===============================================
// TagForge Wildcard Processor – frontend helpers
// ===============================================

const WIDGET_NAMES = {
    text: "text",
    seed: "seed",
    populate: "populate",
    populatedText: "populated_text",
    deduplicate: "deduplicate",
    downvoteFactor: "downvote_factor",
    mode: "mode",
};

const WILDCARD_MODE_PROP = "tagforge_wildcard_mode";
const REPRODUCE_SEED_PROP = "tagforge_reproduce_seed";

export const MODES = Object.freeze({
    BACKEND: "backend",
    POPULATE: "populate",
    FIXED: "fixed",
    REPRODUCE: "reproduce",
});

const MODE_LABELS = {
    [MODES.BACKEND]: "backend",
    [MODES.POPULATE]: "populate",
    [MODES.FIXED]: "fixed",
    [MODES.REPRODUCE]: "reproduce",
};

const ENDPOINTS = {
    list: "tagcomplete/wildcards/list",
    status: "tagcomplete/wildcards/status",
    refresh: "tagcomplete/wildcards/refresh",
    process: "tagcomplete/wildcards/process",
};

// Module-level caches so every toolbar shares the same data.
let wildcardListCache = null;
let wildcardStatusCache = null;
let listPromise = null;
let statusPromise = null;
let queueHookInstalled = false;

// =================================================
// Low-level API wrappers (use mk_endpoint via utils)
// =================================================

export async function fetchWildcardList(signal) {
    if (!listPromise) {
        listPromise = api_get(ENDPOINTS.list, { signal })
            .then((data) => {
                wildcardListCache = data;
                return data;
            })
            .finally(() => {
                listPromise = null;
            });
    }
    return listPromise;
}

export async function fetchWildcardStatus(signal) {
    if (!statusPromise) {
        statusPromise = api_get(ENDPOINTS.status, { signal })
            .then((data) => {
                wildcardStatusCache = data;
                return data;
            })
            .finally(() => {
                statusPromise = null;
            });
    }
    return statusPromise;
}

export async function refreshWildcards(signal) {
    wildcardListCache = null;
    wildcardStatusCache = null;
    listPromise = null;
    statusPromise = null;
    const data = await api_post(ENDPOINTS.refresh, {}, { signal });
    return data;
}

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
    if (saved) return saved;
    const widgetMode = getWidgetByName(node, WIDGET_NAMES.mode)?.value;
    return widgetMode === "legacy" ? MODES.BACKEND : (widgetMode ?? MODES.BACKEND);
}

export function setMode(node, mode) {
    node.properties = node.properties || {};
    node.properties[WILDCARD_MODE_PROP] = mode;
    const modeWidget = getWidgetByName(node, WIDGET_NAMES.mode);
    if (modeWidget) modeWidget.value = mode === MODES.BACKEND ? "legacy" : mode;

    const populateWidget = getWidgetByName(node, WIDGET_NAMES.populate);
    if (populateWidget) {
        if (mode === MODES.POPULATE) {
            populateWidget.value = true;
        } else if (mode === MODES.FIXED || mode === MODES.REPRODUCE) {
            populateWidget.value = false;
        }
        populateWidget.callback?.(populateWidget.value);
    }

    updateModeLabel(node);
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
// Text insertion helpers (keeps TagCompleter alive)
// =================================================

function insertTextIntoWidget(widget, text) {
    const textarea = findTextareaFromWidget(widget);
    if (!textarea) return false;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;

    if (typeof textarea.setRangeText === "function") {
        textarea.setRangeText(text, start, end, "end");
    } else {
        textarea.value =
            textarea.value.slice(0, start) + text + textarea.value.slice(end);
    }

    const newPos = start + text.length;
    textarea.selectionStart = newPos;
    textarea.selectionEnd = newPos;

    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.focus();
    return true;
}

// =================================================
// Toolbar UI
// =================================================

function parseWildcardName(item) {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") {
        return (
            item.name || item.wildcard || item.value || String(item)
        );
    }
    return "";
}

function getCachedList() {
    if (!wildcardListCache) return [];
    const list = Array.isArray(wildcardListCache)
        ? wildcardListCache
        : wildcardListCache.wildcards || wildcardListCache.data || [];
    return list.map(parseWildcardName).filter(Boolean);
}

function statusToLabel(status) {
    if (!status) return "wildcards: offline";
    const count =
        status.count ?? status.total ?? status.loaded ?? status.cached ?? 0;
    if (status.ready === false || status.cached === 0) {
        return "wildcards: empty";
    }
    return `wildcards: ${count}`;
}

function updateModeLabel(node) {
    const toolbar = node?.__tagforge_toolbar;
    if (!toolbar?.modeEl) return;
    toolbar.modeEl.textContent = `mode: ${MODE_LABELS[getMode(node)]}`;
}

function updateAllToolbars() {
    for (const node of getAllNodes(app)) {
        if (!isWildcardNode(node)) continue;
        const toolbar = node.__tagforge_toolbar;
        if (toolbar) {
            toolbar.loadOptions();
            toolbar.updateStatus();
        }
    }
}

function createWildcardToolbar(node) {
    const textWidget = getWidgetByName(node, WIDGET_NAMES.text);

    const statusEl = mkEl("span.tagforge-wildcard-status", {
        textContent: "wildcards: …",
        style: "font-size:10px; opacity:0.9; white-space:nowrap;",
    });

    const modeEl = mkEl("span.tagforge-wildcard-mode", {
        textContent: `mode: ${MODE_LABELS[getMode(node)]}`,
        style: "font-size:10px; opacity:0.75; white-space:nowrap; min-width:70px;",
    });

    const select = mkEl("select.tagforge-wildcard-select", {
        title: "Select a wildcard to insert",
        style: "max-width:120px; min-width:80px; font-size:11px;",
    });
    select.appendChild(mkEl("option", { value: "", textContent: "-- wildcard --" }));

    const insertBtn = mkEl("button.tagforge-wildcard-insert", {
        textContent: "Insert",
        title: "Insert __wildcard__ at cursor",
        style: "font-size:11px; padding:1px 6px;",
    });

    const refreshBtn = mkEl("button.tagforge-wildcard-refresh", {
        textContent: "↻",
        title: "Refresh wildcard cache",
        style: "font-size:11px; padding:1px 6px;",
    });

    const container = mkEl("div.tagforge-wildcard-toolbar", {
        style: "display:flex; gap:4px; align-items:center; flex-wrap:wrap; padding:4px 0;",
    }, [modeEl, statusEl, select, insertBtn, refreshBtn]);

    const loadOptions = async () => {
        select.innerHTML = "";
        select.appendChild(
            mkEl("option", { value: "", textContent: "-- wildcard --" })
        );

        try {
            if (!wildcardListCache) {
                await fetchWildcardList();
            }
            const names = getCachedList();
            for (const name of names) {
                select.appendChild(
                    mkEl("option", { value: name, textContent: name })
                );
            }
        } catch (error) {
            console.warn("[TagForge] Failed to load wildcard list:", error);
        }
    };

    const updateStatus = async () => {
        try {
            if (!wildcardStatusCache) {
                await fetchWildcardStatus();
            }
            statusEl.textContent = statusToLabel(wildcardStatusCache);
        } catch (error) {
            statusEl.textContent = "wildcards: offline";
        }
    };

    insertBtn.addEventListener("click", () => {
        const name = select.value.trim();
        if (!name || !textWidget) return;
        const token = /^__.*__$/.test(name) ? name : `__${name}__`;
        const inserted = insertTextIntoWidget(textWidget, token);
        if (!inserted) {
            console.warn("[TagForge] Could not find textarea for text widget");
        }
    });

    refreshBtn.addEventListener("click", async () => {
        statusEl.textContent = "wildcards: refreshing…";
        try {
            await refreshWildcards();
            await loadOptions();
            await updateStatus();
        } catch (error) {
            console.warn("[TagForge] Refresh failed:", error);
            statusEl.textContent = "wildcards: offline";
        }
    });

    const toolbarApi = {
        container,
        statusEl,
        modeEl,
        select,
        loadOptions,
        updateStatus,
    };
    node.__tagforge_toolbar = toolbarApi;

    let widget;
    if (typeof node.addDOMWidget === "function") {
        widget = node.addDOMWidget(
            "tagforge_wildcard_toolbar",
            "custom",
            container,
            {
                serialize: false,
                getValue: () => "",
                setValue: () => {},
            }
        );
    } else {
        widget = node.addWidget("custom", "tagforge_wildcard_toolbar", "", null, {
            serialize: false,
        });
        widget.draw = function (_ctx, _node, _widgetWidth, y, _H) {
            // Minimal fallback; real layout is handled by DOM widget.
            return y;
        };
        widget.computeSize = function () {
            return [200, 30];
        };
    }

    if (widget) {
        widget.options = widget.options || {};
        widget.options.serialize = false;
        widget.serialize = false;
        widget.serializeValue = async () => undefined;
    }

    loadOptions();
    updateStatus();

    return toolbarApi;
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
            content: "Refresh wildcards",
            callback: async () => {
                try {
                    await refreshWildcards();
                    updateAllToolbars();
                } catch (error) {
                    console.warn("[TagForge] Refresh failed:", error);
                }
            },
        },
        {
            content: "Mode",
            submenu: {
                options: [
                    modeItem(MODES.BACKEND, "Backend (legacy)"),
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
        if (mode === MODES.BACKEND) continue;

        const textWidget = getWidgetByName(node, WIDGET_NAMES.text);
        const seedWidget = getWidgetByName(node, WIDGET_NAMES.seed);
        const populateWidget = getWidgetByName(node, WIDGET_NAMES.populate);
        const populatedTextWidget = getWidgetByName(
            node,
            WIDGET_NAMES.populatedText
        );
        const dedupWidget = getWidgetByName(node, WIDGET_NAMES.deduplicate);
        const factorWidget = getWidgetByName(
            node,
            WIDGET_NAMES.downvoteFactor
        );

        // Remember original populate value so it can be restored after queuing.
        if (populateWidget) {
            node.__tagforge_original_populate = populateWidget.value;
        }
        const modeWidget = getWidgetByName(node, WIDGET_NAMES.mode);
        if (modeWidget) node.__tagforge_original_mode = modeWidget.value;

        if (mode === MODES.FIXED) {
            if (populateWidget) populateWidget.value = false;
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
            populate: true,
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
            // Keep seed=0 random for POPULATE mode; only pin the returned seed
            // when the user explicitly supplied one or is reproducing a result.
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
            if (populateWidget) {
                populateWidget.value = false;
            }
            if (modeWidget) modeWidget.value = "legacy";
        } catch (error) {
            console.error("[TagForge] Pre-queue wildcard processing failed:", error);
        }
    }
}

function restorePopulateFlags(appRef) {
    for (const node of getAllNodes(appRef)) {
        if (!isWildcardNode(node)) continue;
        if (!("__tagforge_original_populate" in node)) continue;

        const populateWidget = getWidgetByName(node, WIDGET_NAMES.populate);
        if (populateWidget) {
            populateWidget.value = node.__tagforge_original_populate;
        }
        const modeWidget = getWidgetByName(node, WIDGET_NAMES.mode);
        if (modeWidget && "__tagforge_original_mode" in node) {
            modeWidget.value = node.__tagforge_original_mode;
        }
        delete node.__tagforge_original_populate;
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
// Main node enhancement
// =================================================

export function enhanceWildcardProcessorNode(node) {
    if (node?.__tagforge_enhanced) return;
    node.__tagforge_enhanced = true;

    try {
        createWildcardToolbar(node);
    } catch (error) {
        console.warn("[TagForge] Failed to create wildcard toolbar:", error);
    }
}
