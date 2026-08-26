import type { HistoryRecord, UserProfile } from '@/types/career'

const HISTORY_KEY = 'careermap:history'
const PROFILE_DRAFT_KEY = 'careermap:profile:draft'
const AI_CONFIG_KEY = 'careermap:ai-config'
const GROWTH_DONE_KEY = 'careermap:growth:done'
const MAX_HISTORY = 50

export function loadHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as HistoryRecord[]) : []
  } catch {
    return []
  }
}

export function saveHistory(records: HistoryRecord[]) {
  try {
    const trimmed = records.slice(0, MAX_HISTORY)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed))
  } catch (e) {
    console.warn('保存历史记录失败（可能是 localStorage 已满）', e)
  }
}

export function saveProfileDraft(profile: UserProfile) {
  sessionStorage.setItem(PROFILE_DRAFT_KEY, JSON.stringify(profile))
}

export function loadProfileDraft(): UserProfile | null {
  try {
    const raw = sessionStorage.getItem(PROFILE_DRAFT_KEY)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch {
    return null
  }
}

export function clearProfileDraft() {
  sessionStorage.removeItem(PROFILE_DRAFT_KEY)
}

export interface AIConfig {
  /** 后端代理服务地址（API Key 与上游大模型地址均在后端 .env 中配置） */
  apiBase: string
  /** 模型标识，如 deepseek-chat / kimi-k2-0905-preview / qwen-plus；留空则使用后端默认模型 */
  model: string
}

// 统一走后端代理：apiBase 指向前端可访问的 FastAPI 服务地址。
// 后端对接任意 OpenAI 兼容接口（DeepSeek、Kimi、通义千问等），前端不接触密钥。
export const defaultAIConfig: AIConfig = {
  apiBase: 'http://localhost:8000',
  model: '',
}

/** 常见大模型预设，方便在设置面板一键填入模型 ID */
export const MODEL_PRESETS: { label: string; model: string; note?: string }[] = [
  { label: '豆包 Doubao-Seed-1.6', model: 'doubao-seed-1-6-250615', note: '火山方舟 · 通用对话' },
  { label: '豆包 Doubao-1.5-Pro', model: 'doubao-1-5-pro-32k-250115', note: '火山方舟 · 长文本' },
  { label: '豆包 Doubao-Pro', model: 'doubao-pro-32k', note: '火山方舟 · 32K' },
  { label: 'DeepSeek-Chat', model: 'deepseek-chat', note: 'DeepSeek V3，性价比高' },
  { label: 'DeepSeek-Reasoner', model: 'deepseek-reasoner', note: 'DeepSeek R1 推理模型' },
  { label: 'Kimi K2', model: 'kimi-k2-0905-preview', note: 'Moonshot 月之暗面' },
  { label: 'Kimi 32K', model: 'moonshot-v1-32k', note: 'Moonshot 长文本' },
  { label: '通义千问 Plus', model: 'qwen-plus', note: '阿里云百炼' },
  { label: '由后端默认', model: '', note: '使用 .env 中配置的默认模型' },
]

export function loadAIConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    const merged: AIConfig = {
      apiBase: typeof parsed.apiBase === 'string' ? parsed.apiBase : defaultAIConfig.apiBase,
      model: typeof parsed.model === 'string' ? parsed.model : defaultAIConfig.model,
    }
    // 迁移：apiBase 应指向本项目后端代理地址，若历史配置误填了大模型厂商的直连地址则重置
    if (/\/\/(?:ark|api)\.(?:cn-beijing\.volces|deepseek|moonshot|dashscope\.aliyuncs)\.com/i.test(merged.apiBase)) {
      merged.apiBase = defaultAIConfig.apiBase
    }
    return merged
  } catch {
    return defaultAIConfig
  }
}

export function saveAIConfig(cfg: AIConfig) {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(cfg))
}

export function loadGrowthDone(routeId: string): Record<number, string[]> {
  try {
    const raw = localStorage.getItem(`${GROWTH_DONE_KEY}:${routeId}`)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveGrowthDone(routeId: string, data: Record<number, string[]>) {
  localStorage.setItem(`${GROWTH_DONE_KEY}:${routeId}`, JSON.stringify(data))
}
