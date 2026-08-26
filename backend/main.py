"""
职途星图 CareerMap - 轻量化后端中转服务
唯一职责：转发前端请求到配置的大模型（任意 OpenAI 兼容接口），隐藏 API Key。
支持 DeepSeek、Kimi（月之暗面）、通义千问、豆包等，只需在 .env 中修改上游配置。
启动：uvicorn main:app --reload --port 8000
"""
import os
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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

app = FastAPI(title="CareerMap LLM Proxy", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    model: Optional[str] = None
    temperature: float = 0.2
    max_tokens: Optional[int] = None
    response_format: Optional[Dict[str, Any]] = None
    messages: List[ChatMessage]


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "model": LLM_MODEL,
        "base_url": LLM_BASE_URL,
        "has_key": bool(LLM_API_KEY),
    }


@app.post("/api/chat")
async def chat(req: ChatRequest):
    if not LLM_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="后端未配置 LLM_API_KEY，请在 .env 中设置大模型 API Key 后重启服务"
        )

    payload = {
        "model": req.model or LLM_MODEL,
        "temperature": req.temperature,
        "messages": [m.model_dump() for m in req.messages],
    }
    if req.max_tokens:
        payload["max_tokens"] = req.max_tokens
    if req.response_format:
        payload["response_format"] = req.response_format

    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        # 推理类模型（如 deepseek-reasoner）生成复杂 JSON 可能需要数分钟
        async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=30.0)) as client:
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
