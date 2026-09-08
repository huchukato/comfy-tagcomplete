from .utils import Endpoint
from .tagdata_manager import TagDataManager
from .wildcards import WildcardLoader
from .wildcard_processor import WildcardProcessorNode
from . import paths

from aiohttp import web
import folder_paths

# ===============================================
# エンドポイント
# ===============================================

# --- main タグファイルリストを取得 ---
@Endpoint.get("get_main_files")
async def get_main_files(req: web.Request):
    files = paths.tags_dir.glob("*.csv")
    filelist = [file.name for file in files if not file.stem.startswith("extra")]

    return web.json_response(filelist)

# --- extra タグファイルリストを取得 ---
@Endpoint.get("get_extra_files")
async def get_extra_files(req: web.Request):
    files = paths.tags_dir.glob("*.csv")
    filelist = [file.name for file in files if file.stem.startswith("extra")]

    return web.json_response(filelist)

# --- translate ファイルリストを取得 ---
@Endpoint.get("get_translate_files")
async def get_translate_files(req: web.Request):
    files = paths.translate_dir.glob("*.csv")
    filelist = [file.name for file in files]
    filelist = ["None"] + filelist
    
    return web.json_response(filelist)


# -----------------------------------------------
# On Change
# -----------------------------------------------

# --- Enable切り替え ---
@Endpoint.post("toggle_enable")
async def toggle_enble(req: web.Request):
    data = await req.json()
    value = data.get("value")

    TagDataManager.toggle_enable(value)

    return web.json_response({"status": "success"})


# --- Main CSV ---
@Endpoint.post("load_main")
async def load_main(req: web.Request):
    data = await req.json()
    filename = data.get("filename")

    TagDataManager.main_filename = filename
    TagDataManager.load_main()

    return web.json_response({"status": "success"})


# --- Extra CSV ---
@Endpoint.post("load_extra")
async def load_extra(req: web.Request):
    data = await req.json()
    filename = data.get("filename")

    TagDataManager.extra_filename = filename
    TagDataManager.load_extra()

    return web.json_response({"status": "success"})


# --- Translate ---
@Endpoint.post("load_translate")
async def load_translate(req: web.Request):
    data = await req.json()
    filename = data.get("filename")

    TagDataManager.translate_filename = filename
    TagDataManager.load_translate()

    return web.json_response({"status": "success"})


# --- Embeddings ---
@Endpoint.post("load_embeddings")
async def load_embeddings(req: web.Request):
    data = await req.json()
    value = data.get("value")
    
    TagDataManager.enable_embeddings = value
    TagDataManager.load_embeddings()

    return web.json_response({"status": "success"})


# --- LoRA ---
@Endpoint.post("load_loras")
async def load_loras(req: web.Request):
    data = await req.json()
    value = data.get("value")

    TagDataManager.enable_loras = value
    TagDataManager.load_loras()

    return web.json_response({"status": "sccuess"})


# --- Wildcard ---
@Endpoint.post("load_wildcards")
async def load_wildcard(req: web.Request):
    data = await req.json()
    value = data.get("value")

    TagDataManager.enable_wildcards = value
    TagDataManager.load_wildcards()

    return web.json_response({"status": "success"})


@Endpoint.get("tagcomplete/wildcards/list")
async def wildcard_list(req: web.Request):
    return web.json_response(WildcardLoader.get_wildcards_list())


@Endpoint.get("tagcomplete/wildcards/status")
async def wildcard_status(req: web.Request):
    status = WildcardLoader.get_status()
    return web.json_response({**status, "count": status["total_available"], "ready": True})


@Endpoint.post("tagcomplete/wildcards/process")
async def wildcard_process(req: web.Request):
    data = await req.json()
    text = data.get("text", "")
    if not isinstance(text, str):
        return web.json_response({"error": "text must be a string"}, status=400)
    try:
        seed = int(data.get("seed", 0))
        factor = float(data.get("downvote_factor", 0.5))
    except (TypeError, ValueError):
        return web.json_response({"error": "seed and downvote_factor must be numeric"}, status=400)
    if not 0.0 < factor <= 1.0:
        return web.json_response({"error": "downvote_factor must be greater than 0 and at most 1"}, status=400)
    if seed == 0:
        import secrets
        seed = secrets.randbits(64)
    usage = WildcardProcessorNode._session_usage if data.get("deduplicate", True) and factor < 1.0 else None
    processed = WildcardLoader.process(text, seed, usage, factor)
    return web.json_response({"processed_text": processed, "text": processed, "seed": seed})


@Endpoint.post("tagcomplete/wildcards/refresh")
async def wildcard_refresh(req: web.Request):
    WildcardLoader.refresh()
    if TagDataManager.enable and TagDataManager.enable_wildcards:
        TagDataManager.load_wildcards(refresh_loader=False)
    return web.json_response({"status": "success", **WildcardLoader.get_status()})


# --- Suggestion Count設定 --- 
@Endpoint.post("set_suggestion_count")
async def set_suggestion_count(req: web.Request):
    data = await req.json()
    value = data.get("value")
    
    TagDataManager.max_count = value
    
    return web.json_response({"status": "success"})


# --- Restict Alias設定 ---
@Endpoint.post("set_restrict_alias")
async def set_restrict_alias(req: web.Request):
    data = await req.json()
    value = data.get("value")

    TagDataManager.restrictAlias = value
    
    return web.json_response({"status": "success"})


# --- 検索実行 ---
@Endpoint.post("search")
async def search(req: web.Request):
    data = await req.json()
    term = data.get("term")
    filters = data.get("filters")

    results = TagDataManager.search(term, filters)

    return web.json_response(results)