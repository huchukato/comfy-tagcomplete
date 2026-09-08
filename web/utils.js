import { api } from "../../scripts/api.js";

const author = "jupo";
const packageName = "TagForge";

export function mk_name(name) {
    return `${author}.${packageName}.${name}`;
}

export function mk_endpoint(url) {
    return `/${author}/${packageName}/${url}`;
}

export async function api_get(url, { signal } = {}) {
    const res = await api.fetchApi(mk_endpoint(url), { signal });
    return await res.json();
}

export async function api_post(url, options = {}, { signal } = {}) {
    const body = {
        method: "POST", 
        body: JSON.stringify(options), 
        signal, 
    };
    const res = await api.fetchApi(mk_endpoint(url), body);
    return await res.json();
}

// Create DOM elements with a $el-like API.
// tag: "div.class1.class2" or "span"
// attrs: { textContent, onclick, href, ...attributes }
// children: single Element | string | array of (Element | string)
export function mkEl(tag, attrs = {}, children = []) {
    const [tagName, ...classes] = tag.split(".");
    const el = document.createElement(tagName);

    if (classes.length) {
        el.className = classes.join(" ");
    }

    const isEvent = (key) => key.startsWith("on") && key.length > 2;
    const isAttr = (key) => !isEvent(key) && key !== "textContent";

    for (const [key, value] of Object.entries(attrs)) {
        if (value === undefined || value === null) continue;

        if (key === "textContent") {
            el.textContent = value;
        } else if (isEvent(key)) {
            const event = key.slice(2).toLowerCase();
            el.addEventListener(event, value);
        } else if (isAttr(key)) {
            el.setAttribute(key, String(value));
        }
    }

    const append = (child) => {
        if (child == null) return;
        if (child instanceof Element || child instanceof DocumentFragment) {
            el.appendChild(child);
        } else if (Array.isArray(child)) {
            child.forEach(append);
        } else {
            el.appendChild(document.createTextNode(String(child)));
        }
    };

    const childArray = Array.isArray(children) ? children : [children];
    childArray.forEach(append);

    return el;
}

// Resolve the actual editable textarea/input element from a Comfy widget,
// supporting both legacy (inputEl) and Vue/Modern (element) frontends.
export function findTextareaFromWidget(widget) {
    if (!widget) return null;

    const candidates = [widget.inputEl, widget.element].filter(Boolean);
    for (const candidate of candidates) {
        if (candidate instanceof HTMLTextAreaElement || candidate instanceof HTMLInputElement) {
            if (!candidate.disabled && candidate.type !== "hidden") {
                return candidate;
            }
        }
        const inner = candidate.querySelector?.("textarea:not([readonly]):not([disabled]), input:not([readonly]):not([disabled])");
        if (inner) return inner;
    }

    return null;
}

export function loadCSS(path, options = {}) {
    try {
        const { preventDuplicates = true, onLoad, onError } = options;
    
        const normalizedPath = path.endsWith('.js') 
            ? path.replace(/\.js$/, '.css') 
            : path;
        
        const resolveUrl = (relativePath) => {
            try {
                return new URL(relativePath, import.meta.url).toString();
            } catch (error) {
                console.warn(`Invalid URL: ${relativePath}`, error);
                return relativePath;
            }
        };
        
        const href = normalizedPath.startsWith('http') 
            ? normalizedPath 
            : resolveUrl(normalizedPath);
        
        if (preventDuplicates) {
            const existingLink = document.querySelector(`link[rel="stylesheet"][href="${href}"]`);
            if (existingLink) {
                return existingLink;
            }
        }
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = href;
        
        if (onLoad) {
            link.addEventListener('load', onLoad);
        }
        
        if (onError) {
            link.addEventListener('error', onError);
        }
        
        document.head.appendChild(link);

        return link;

    } catch (error) {
        console.error("Failed to load css: ", error);
    }
}