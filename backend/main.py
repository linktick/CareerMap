"""
职途星图 CareerMap - 轻量化后端中转服务
职责：
1. 转发前端请求到配置的大模型（任意 OpenAI 兼容接口），隐藏 API Key。
   支持 DeepSeek、Kimi（月之暗面）、通义千问、豆包等，只需在 .env 中修改上游配置。
   消息体透传 OpenAI 兼容格式，content 既可以是纯文本，也可以是多模态 parts
   （文本 + image_url base64），因此简历图片视觉解析需要把 LLM_MODEL 配置为
   视觉模型（如豆包 doubao-vision-pro / 通义 qwen-vl-max / Kimi 视觉版）。
   同时透传 tools / tool_choice，支持前端 Agent loop 的 function calling。
2. 提供 /api/search 实时联网搜索（Agent 的 search_web 工具由本端点执行）：
   ① 火山方舟联网搜索 API（Agent 套餐自带搜索通道 open.feedcoopapi.com，
   复用套餐 Key，默认零配置）为主；② 博查 Bocha（BOCHA_API_KEY）为辅；
   ③ Tavily（TAVILY_API_KEY）再次之；全部不可用时返回 503，
   前端据此把报告标记为「未核验」。
启动：uvicorn main:app --reload --port 8000
"""
import datetime
import os
import re
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict

load_dotenv()

# 通用大模型配置：默认 DeepSeek，可在 .env 中切换到任意 OpenAI 兼容端点
# DeepSeek:   https://api.deepseek.com/v1           + key sk-...   + model deepseek-chat
# Kimi:       https://api.moonshot.cn/v1            + key sk-...   + model moonshot-v1-32k
# 通义千问:   https://dashscope.aliyuncs.com/compatible-mode/v1 + key + qwen-plus
# 豆包方舟:   https://ark.cn-beijing.volces.com/api/v3 + key + 模型/接入点 ID
#
# 同时兼容 DOUBAO_* 变量名（火山方舟套餐端点 /api/plan/v3 或标准端点 /api/v3 均可）。
# 优先读取 LLM_*；若未配置则回退到 DOUBAO_*，避免历史 .env 因变量名不匹配导致 500。
LLM_API_KEY = os.getenv("LLM_API_KEY") or os.getenv("DOUBAO_API_KEY", "")
LLM_BASE_URL = (
    os.getenv("LLM_BASE_URL")
    or os.getenv("DOUBAO_BASE_URL")
    or "https://api.deepseek.com/v1"
).rstrip("/")
LLM_MODEL = os.getenv("LLM_MODEL") or os.getenv("DOUBAO_MODEL") or "deepseek-chat"
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173"
).split(",")

# ---- 实时搜索配置 ----
# SEARCH_PROVIDER = auto（默认，方舟→博查→Tavily 链式降级）| ark | bocha | tavily | none
SEARCH_PROVIDER = (os.getenv("SEARCH_PROVIDER") or "auto").strip().lower()
BOCHA_API_KEY = os.getenv("BOCHA_API_KEY") or os.getenv("SEARCH_API_KEY", "")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
BOCHA_BASE_URL = (os.getenv("BOCHA_BASE_URL") or "https://api.bochaai.com/v1").rstrip("/")
TAVILY_BASE_URL = (os.getenv("TAVILY_BASE_URL") or "https://api.tavily.com").rstrip("/")

app = FastAPI(title="CareerMap LLM Proxy", version="2.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    # 放行 tool_calls / tool_call_id / name 等 OpenAI 消息字段（Agent loop 需要）
    model_config = ConfigDict(extra="allow")

    role: str
    # content 支持三种形态：
    # 1. 纯文本：str（常规 JSON 推演）
    # 2. 多模态：OpenAI 兼容 content parts 列表，如
    #    [{"type": "text", "text": "..."},
    #     {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}}]
    #    用于简历图片视觉解析（上游需配置视觉模型，如 doubao-vision / qwen-vl 系列）
    # 3. None：带 tool_calls 的 assistant 消息
    content: Any = None


class ChatRequest(BaseModel):
    model: Optional[str] = None
    temperature: float = 0.2
    max_tokens: Optional[int] = None
    response_format: Optional[Dict[str, Any]] = None
    messages: List[ChatMessage]
    # function calling（前端 Agent loop 使用，标准 OpenAI 格式）
    tools: Optional[List[Dict[str, Any]]] = None
    tool_choice: Optional[Any] = None
    # 方舟等厂商的扩展参数（如 thinking: {"type": "disabled"|"auto"|"enabled"}），透传
    extra_params: Optional[Dict[str, Any]] = None


class SearchRequest(BaseModel):
    query: str
    count: int = 6


# ============ 搜索结果归一化 ============

# 来源可靠性评级：按域名判断（招聘平台/政府/权威财经 = 高；主流媒体/社区 = 中；其余 = 低）
_HIGH_RELIABILITY_DOMAINS = (
    "zhipin.com", "liepin.com", "lagou.com", "zhaopin.com", "51job.com", "jobs.com",
    "gov.cn", "stats.gov.cn", "mohrss.gov.cn", "edu.cn", "caixin.com", "yicai.com",
    "people.com.cn", "xinhuanet.com", "news.cn", "cs.com.cn", "stcn.com",
)
_MEDIUM_RELIABILITY_DOMAINS = (
    "zhihu.com", "maimai.cn", "xiaohongshu.com", "36kr.com", "geekpark.net",
    "thepaper.cn", "jiemian.com", "huxiu.com", "pingwest.com", "ifeng.com",
    "sina.com.cn", "sohu.com", "163.com", "qq.com", "baijiahao.baidu.com",
    "baidu.com", "bilibili.com", "donews.com", "tmtpost.com",
    "jobui.com", "kanzhun.com", "oscimg.oschina.net", "csdn.net", "juejin.cn",
)


def _domain_of(url: str) -> str:
    m = re.search(r"https?://([^/]+)", url or "")
    return (m.group(1) or "").lower()


def _reliability_for(url: str, score: Optional[float] = None) -> str:
    domain = _domain_of(url)
    level = "low"
    if any(d in domain for d in _HIGH_RELIABILITY_DOMAINS):
        level = "high"
    elif any(d in domain for d in _MEDIUM_RELIABILITY_DOMAINS):
        level = "medium"
    # Tavily 相关性分数微调
    if score is not None:
        if score >= 0.75 and level == "low":
            level = "medium"
        elif score < 0.4 and level == "high":
            level = "medium"
        elif score < 0.3:
            level = "low"
    return level


def _norm_date(raw: Any) -> str:
    """把各供应商的发布时间统一为 YYYY-MM-DD；无法解析或 epoch 0（1970/空值）返回空串。"""
    if isinstance(raw, (int, float)) and raw > 1_000_000_000:
        return datetime.utcfromtimestamp(float(raw)).strftime("%Y-%m-%d")
    if not isinstance(raw, str):
        return ""
    m = re.search(r"(19|20)\d{2}[-/]\d{1,2}[-/]\d{1,2}", raw)
    if not m:
        return ""
    date_part = m.group(0).replace("/", "-")
    y, mo, d = (int(x) for x in date_part.split("-"))
    return f"{y:04d}-{mo:02d}-{d:02d}" if y >= 2000 else ""


def _normalize(items: List[Dict[str, Any]], provider: str, limit: int) -> List[Dict[str, Any]]:
    """统一搜索输出形态并按 URL 去重、截断。"""
    out: List[Dict[str, Any]] = []
    seen = set()
    for it in items:
        url = (it.get("url") or "").strip()
        if not url or not url.startswith("http") or url in seen:
            continue
        seen.add(url)
        snippet = re.sub(r"\s+", " ", str(it.get("snippet") or "")).strip()
        out.append(
            {
                "title": (it.get("title") or url)[:120],
                "url": url,
                "snippet": snippet[:300],
                "publishedAt": _norm_date(it.get("publishedAt")),
                "reliability": it.get("reliability") or _reliability_for(url, it.get("score")),
                "provider": provider,
            }
        )
        if len(out) >= limit:
            break
    return out


# ============ ① 火山方舟联网搜索 API（Agent 套餐自带搜索通道） ============
#
# 方舟 Agent 套餐端点（/api/plan/v3）不支持在 chat/completions 里直接挂 web_search
# 内置插件；套餐附赠的联网能力走独立的「联网搜索 API」——官方 MCP server
# mcp-server-askecho-search-infinity 即是对下面这个 HTTP 接口的薄封装：
#   POST https://open.feedcoopapi.com/search_api/web_search
#   Authorization: Bearer <Agent 套餐 API Key>
# 套餐 Key 与 DOUBAO_API_KEY 同源、可零配置复用；也可在控制台单独签发：
#   https://console.volcengine.com/search-infinity/api-key
# 接口文档：https://www.volcengine.com/docs/87772/2272953

ARK_SEARCH_BASE = (os.getenv("ARK_SEARCH_BASE_URL") or "https://open.feedcoopapi.com").rstrip("/")
ARK_SEARCH_API_KEY = (
    os.getenv("ARK_SEARCH_API_KEY")
    or os.getenv("ASK_ECHO_SEARCH_INFINITY_API_KEY")
    or ""
)


def _extract_feedcoop_items(data: Any) -> List[Dict[str, Any]]:
    """防御式提取搜索结果：递归寻找「元素为带 http 链接 dict」的最大列表。
    官方返回信封可能随版本变化，结果条目字段为 Title/Url/Snippet/PublishTime 等。"""
    best: List[Dict[str, Any]] = []

    def has_link(d: Dict[str, Any]) -> bool:
        return any(
            re.search(r"url|link", k, re.I) and isinstance(v, str) and v.startswith("http")
            for k, v in d.items()
        )

    def walk(node: Any) -> None:
        nonlocal best
        if isinstance(node, dict):
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            if (
                node
                and len(node) > len(best)
                and all(isinstance(x, dict) for x in node)
                and any(has_link(x) for x in node)
            ):
                best = node
            for v in node:
                walk(v)

    walk(data)
    return best


def _pick_str(d: Dict[str, Any], *keys: str) -> str:
    for k in keys:
        v = d.get(k)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return ""


async def _ark_web_search(client: httpx.AsyncClient, query: str, count: int) -> List[Dict[str, Any]]:
    """方舟联网搜索 API（Agent 套餐搜索通道），返回归一化结果。"""
    api_key = ARK_SEARCH_API_KEY or LLM_API_KEY
    if not api_key:
        raise RuntimeError("未配置方舟 API Key")
    payload = {
        "Query": query[:100],
        "SearchType": "web",
        "Count": max(count, 8),
        "Filter": {"NeedUrl": True, "NeedContent": False},
    }
    resp = await client.post(
        f"{ARK_SEARCH_BASE}/search_api/web_search",
        json=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "X-Traffic-Tag": "ark_mcp_server_web_search",
        },
    )
    if resp.status_code != 200:
        raise RuntimeError(f"方舟联网搜索返回 {resp.status_code}：{resp.text[:200]}")
    data = resp.json()

    items: List[Dict[str, Any]] = []
    for d in _extract_feedcoop_items(data):
        url = _pick_str(d, "Url", "URL", "url", "Link", "link")
        if not url.startswith("http"):
            continue
        pt = d.get("PublishTime") or d.get("PublishTimeStr") or d.get("publish_time")
        published = ""
        if isinstance(pt, str):
            published = pt
        elif isinstance(pt, (int, float)) and pt > 1_000_000_000:
            published = datetime.utcfromtimestamp(float(pt)).strftime("%Y-%m-%d")
        items.append(
            {
                "title": _pick_str(d, "Title", "Name", "title") or url,
                "url": url,
                "snippet": _pick_str(d, "Snippet", "Summary", "Content", "snippet", "summary"),
                "publishedAt": published,
            }
        )
    return _normalize(items, "ark", count)


# ============ ② 博查 Bocha ============

async def _bocha_search(client: httpx.AsyncClient, query: str, count: int) -> List[Dict[str, Any]]:
    resp = await client.post(
        f"{BOCHA_BASE_URL}/web-search",
        headers={"Authorization": f"Bearer {BOCHA_API_KEY}", "Content-Type": "application/json"},
        json={"query": query, "count": count, "summary": True},
    )
    if resp.status_code != 200:
        raise RuntimeError(f"博查搜索返回 {resp.status_code}：{resp.text[:200]}")
    data = resp.json().get("data") or {}
    pages = ((data.get("webPages") or {}).get("value")) or []
    items = [
        {
            "title": p.get("name") or p.get("title"),
            "url": p.get("url") or p.get("link"),
            "snippet": p.get("summary") or p.get("snippet") or p.get("description"),
            "publishedAt": p.get("datePublished") or p.get("date") or "",
        }
        for p in pages
    ]
    return _normalize(items, "bocha", count)


# ============ ③ Tavily ============

async def _tavily_search(client: httpx.AsyncClient, query: str, count: int) -> List[Dict[str, Any]]:
    resp = await client.post(
        f"{TAVILY_BASE_URL}/search",
        headers={"Authorization": f"Bearer {TAVILY_API_KEY}", "Content-Type": "application/json"},
        json={"query": query, "max_results": count, "search_depth": "advanced"},
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Tavily 搜索返回 {resp.status_code}：{resp.text[:200]}")
    results = resp.json().get("results") or []
    items = [
        {
            "title": r.get("title"),
            "url": r.get("url"),
            "snippet": r.get("content"),
            "publishedAt": r.get("published_date") or "",
            "score": r.get("score"),
        }
        for r in results
    ]
    return _normalize(items, "tavily", count)


def _search_chain() -> List[str]:
    """按配置返回实际尝试顺序。"""
    if SEARCH_PROVIDER == "none":
        return []
    providers = []
    if SEARCH_PROVIDER in ("ark", "auto") and LLM_API_KEY:
        providers.append("ark")
    if SEARCH_PROVIDER in ("bocha", "auto") and BOCHA_API_KEY:
        providers.append("bocha")
    if SEARCH_PROVIDER in ("tavily", "auto") and TAVILY_API_KEY:
        providers.append("tavily")
    # 显式指定但 key 缺失时仍放入列表，由错误信息暴露配置问题
    if SEARCH_PROVIDER == "bocha" and "bocha" not in providers:
        providers.append("bocha")
    if SEARCH_PROVIDER == "tavily" and "tavily" not in providers:
        providers.append("tavily")
    return providers


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "model": LLM_MODEL,
        "base_url": LLM_BASE_URL,
        "has_key": bool(LLM_API_KEY),
        "search": {
            "enabled": len(_search_chain()) > 0,
            "chain": _search_chain(),
            "primary": next(iter(_search_chain()), None),
            "bocha_configured": bool(BOCHA_API_KEY),
            "tavily_configured": bool(TAVILY_API_KEY),
        },
    }


@app.post("/api/chat")
async def chat(req: ChatRequest):
    if not LLM_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="后端未配置 LLM_API_KEY，请在 .env 中设置大模型 API Key 后重启服务"
        )

    payload: Dict[str, Any] = {
        "model": req.model or LLM_MODEL,
        "temperature": req.temperature,
        "messages": [m.model_dump(exclude_none=True) for m in req.messages],
    }
    if req.max_tokens:
        payload["max_tokens"] = req.max_tokens
    if req.response_format:
        payload["response_format"] = req.response_format
    # 透传 function calling（Agent loop）与内置插件声明
    if req.tools:
        payload["tools"] = req.tools
    if req.tool_choice is not None:
        payload["tool_choice"] = req.tool_choice
    # 厂商扩展参数（方舟 thinking 开关等），与已知字段冲突时以显式字段为准
    if req.extra_params:
        for k, v in req.extra_params.items():
            payload.setdefault(k, v)

    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        # 推理类模型（如 deepseek-reasoner）生成复杂 JSON 可能需要较长时间；
        # 长周期推演 + Agent 链式调研单轮最长容忍 20 分钟（连接超时仍为 30 秒）
        async with httpx.AsyncClient(timeout=httpx.Timeout(1200.0, connect=30.0)) as client:
            resp = await client.post(
                f"{LLM_BASE_URL}/chat/completions",
                json=payload,
                headers=headers,
            )
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"大模型接口错误：{resp.text[:500]}"
                )
            return resp.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"请求大模型服务失败：{e}")


@app.post("/api/search")
async def search(req: SearchRequest):
    """Agent 的联网搜索工具：按 方舟插件 → 博查 → Tavily 顺序降级，返回归一化结果。"""
    query = (req.query or "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="query 不能为空")
    count = max(1, min(int(req.count or 6), 10))

    chain = _search_chain()
    if not chain:
        raise HTTPException(
            status_code=503,
            detail=(
                "实时搜索未启用：方舟 Agent 套餐自带联网搜索（复用 DOUBAO_API_KEY，"
                "需已开通联网搜索 API）；也可在后端 .env 中配置 BOCHA_API_KEY（博查搜索）"
                "或 TAVILY_API_KEY；设置 SEARCH_PROVIDER=none 可关闭本提示。"
            ),
        )

    errors: List[str] = []
    # 各搜索通道均为普通 HTTP 检索接口，90s 超时足够覆盖慢响应
    async with httpx.AsyncClient(timeout=httpx.Timeout(90.0, connect=15.0)) as client:
        for provider in chain:
            try:
                if provider == "ark":
                    results = await _ark_web_search(client, query, count)
                elif provider == "bocha":
                    results = await _bocha_search(client, query, count)
                else:
                    results = await _tavily_search(client, query, count)
                if results:
                    return {"query": query, "provider": provider, "results": results}
                errors.append(f"{provider}：未检索到可用结果")
            except HTTPException:
                raise
            except Exception as e:  # 单个供应商失败不致命，继续降级
                errors.append(f"{provider}：{e}")
                continue

    raise HTTPException(
        status_code=503,
        detail="所有搜索渠道均不可用：" + "；".join(errors),
    )
