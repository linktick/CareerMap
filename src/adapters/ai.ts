import axios from 'axios'
import type {
  CareerAdapter,
  CareerRoute,
  CareerSandbox,
  CompareResult,
  GrowthPlan,
  UserProfile,
} from '@/types/career'
import { sandboxSchema, growthPlanSchema, compareResultSchema } from '@/schemas/career'
import { SYSTEM_PROMPT, RETRY_PROMPT } from '@/prompts/system'
import { buildRoutesPrompt } from '@/prompts/routes'
import { buildGrowthPrompt } from '@/prompts/growth'
import { buildComparePrompt } from '@/prompts/compare'
import type { AIConfig } from '@/utils/storage'

function extractJson(text: string): any {
  if (!text) throw new Error('AI 返回为空')
  let cleaned = text.trim()

  // 1. 剥离 markdown 代码块（```json ... ``` 或 ``` ... ```）
  const fence = cleaned.match(/```(?:json|JSON)?\s*([\s\S]*?)```/)
  if (fence) cleaned = fence[1].trim()

  // 2. 尝试找第一个 { 或 [ 到最后一个 } 或 ]
  const objStart = cleaned.indexOf('{')
  const arrStart = cleaned.indexOf('[')
  let start = -1
  let endChar = '}'
  if (objStart !== -1 && (arrStart === -1 || objStart < arrStart)) {
    start = objStart
    endChar = '}'
  } else if (arrStart !== -1) {
    start = arrStart
    endChar = ']'
  }

  if (start !== -1) {
    const end = cleaned.lastIndexOf(endChar)
    if (end > start) {
      cleaned = cleaned.slice(start, end + 1)
    }
  }

  // 3. 直接解析
  try {
    return JSON.parse(cleaned)
  } catch (e1) {
    // 4. 尝试修复常见问题：尾随逗号、未转义字符
    try {
      // 去除对象/数组末尾的尾随逗号
      const fixed = cleaned
        .replace(/,\s*([}\]])/g, '$1')
        // 修复中文引号
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
      return JSON.parse(fixed)
    } catch (e2) {
      throw new Error(
        'AI 返回内容无法解析为 JSON：' +
        (e1 as Error).message +
        '\n返回前 200 字：' + text.slice(0, 200)
      )
    }
  }
}

export class AIAdapter implements CareerAdapter {
  readonly name = 'ai' as const
  private config: AIConfig

  constructor(initial: AIConfig) {
    this.config = initial
  }

  refreshConfig(cfg: AIConfig) {
    this.config = cfg
  }

  /**
   * 构建请求 URL。
   * 统一走后端代理：{apiBase}/api/chat（apiBase 为后端地址，如 http://localhost:8000）。
   * 后端负责把请求转发到配置的大模型（DeepSeek / Kimi / 通义千问等 OpenAI 兼容接口），
   * API Key 只在后端 .env 中保管，浏览器端不接触密钥。
   */
  private buildUrl(): string {
    const base = this.config.apiBase.trim().replace(/\/+$/, '')
    return `${base}/api/chat`
  }

  /** 本次会话内标记 response_format 是否被服务端拒绝，拒绝后后续请求不再发送 */
  private jsonModeUnsupported = false

  private async chat(
    messages: { role: string; content: string }[],
    options?: { maxTokens?: number; skipJsonMode?: boolean }
  ): Promise<string> {
    const { model } = this.config
    if (!this.config.apiBase) throw new Error('未配置后端服务地址，请在设置中填写')

    const url = this.buildUrl()

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    const body: Record<string, unknown> = {
      // 模型留空时由后端 .env 决定默认模型；填写后透传给上游
      ...(model ? { model } : {}),
      temperature: 0.2,
      // 推理模型的思考 token 也计入 max_tokens，需要给足空间
      max_tokens: options?.maxTokens ?? 16384,
      messages,
    }
    if (!this.jsonModeUnsupported && !options?.skipJsonMode) {
      body.response_format = { type: 'json_object' }
    }

    let res
    try {
      // 推理类模型（如 deepseek-reasoner）生成复杂 JSON 可能需要数分钟
      res = await axios.post(url, body, { headers, timeout: 300000 })
    } catch (e: any) {
      if (axios.isAxiosError(e)) {
        if (e.response) {
          const status = e.response.status
          const detail =
            e.response.data?.error?.message ||
            e.response.data?.detail ||
            e.response.statusText ||
            JSON.stringify(e.response.data)
          // response_format 不被该端点支持时，自动回退重试一次（不把错误抛给用户）
          if (
            status === 400 &&
            !options?.skipJsonMode &&
            !this.jsonModeUnsupported &&
            /response_format|json_mode|json object|does not support/i.test(String(detail))
          ) {
            this.jsonModeUnsupported = true
            return this.chat(messages, { ...options, skipJsonMode: true })
          }
          if (status === 401) throw new Error(`API Key 无效或已过期 (401)：${detail}\n请检查后端 .env 中的密钥配置`)
          if (status === 404) {
            throw new Error(`后端接口不存在 (404)：${detail}\n请确认后端服务已启动，且地址为 ${this.config.apiBase}`)
          }
          if (status === 400) {
            throw new Error(`请求参数错误 (400)：${detail}\n请检查模型 ID、API Base 与上游接口是否兼容`)
          }
          if (status === 403) throw new Error(`无访问权限 (403)：${detail}\n请确认 API Key 已开通该模型`)
          if (status === 429) throw new Error(`请求过于频繁或配额已用尽 (429)：${detail}\n请稍后再试或检查账户额度`)
          if (status >= 500) throw new Error(`AI 服务端错误 (${status})：${detail}\n请稍后重试`)
          throw new Error(`API 请求失败 (${status})：${detail}`)
        }
        if (e.code === 'ECONNABORTED') throw new Error('请求超时（5分钟），模型推理耗时过长，请稍后重试')
        if (e.message?.includes('Network Error')) {
          throw new Error(
            `无法连接到后端服务：${this.config.apiBase}\n请确认代理服务已启动（python backend/main.py）。`
          )
        }
        throw new Error(`网络错误：${e.message}`)
      }
      throw e
    }

    const choice = res.data?.choices?.[0]
    const content = choice?.message?.content
    if (!content) throw new Error('AI 接口返回格式异常：缺少 choices[0].message.content')
    // 检测被 max_tokens 截断的情况，给出明确提示而不是让 JSON 解析莫名其妙失败
    if (choice?.finish_reason === 'length') {
      throw new Error('AI 返回被 max_tokens 截断，JSON 不完整。请重试或减少请求范围。')
    }
    return content
  }

  private async callWithSchema<T>(
    userPrompt: string,
    schema: { parse: (d: any) => T },
    retry = false,
    validationError?: string
  ): Promise<T> {
    let fullPrompt = userPrompt
    if (retry) {
      fullPrompt += '\n\n' + RETRY_PROMPT
      if (validationError) {
        fullPrompt += `\n\n【上一次返回的具体问题】\n${validationError}\n请针对性修复以上问题。`
      }
    }
    const messages: { role: string; content: string }[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: fullPrompt },
    ]
    // 12 个月成长方案 JSON 体量大，且推理模型思考 token 也计入 max_tokens，给足额度避免被截断
    const isGrowth = /12\s*个月|按月拆分/.test(userPrompt)
    const raw = await this.chat(messages, { maxTokens: isGrowth ? 32768 : 8192 })
    let json: any
    try {
      json = extractJson(raw)
    } catch (e) {
      if (!retry) return this.callWithSchema(userPrompt, schema, true, (e as Error).message)
      throw e
    }
    try {
      return schema.parse(json)
    } catch (e: any) {
      const issueText = this.formatZodError(e)
      if (!retry) return this.callWithSchema(userPrompt, schema, true, issueText)
      throw new Error('AI 返回数据结构校验失败：' + issueText)
    }
  }

  private formatZodError(e: any): string {
    if (e?.issues && Array.isArray(e.issues)) {
      return e.issues
        .map((iss: any) => {
          const path = iss.path?.join('.') || '(root)'
          return `- ${path}: ${iss.message}（收到: ${JSON.stringify(iss.received ?? iss.input ?? '未知')}）`
        })
        .join('\n')
    }
    return e?.message || String(e)
  }

  /** 测试连接是否正常 */
  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      if (!this.config.apiBase) return { ok: false, message: '未配置后端服务地址' }
      const url = this.buildUrl()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const body: Record<string, unknown> = {
        messages: [{ role: 'user', content: '回复OK两个字' }],
        max_tokens: 10,
      }
      if (this.config.model) body.model = this.config.model
      const res = await axios.post(url, body, { headers, timeout: 30000 })
      if (res.data?.choices?.[0]?.message?.content) {
        return { ok: true, message: '连接成功，模型返回：' + res.data.choices[0].message.content.slice(0, 50) }
      }
      return { ok: false, message: '返回格式异常：' + JSON.stringify(res.data).slice(0, 200) }
    } catch (e: any) {
      if (axios.isAxiosError(e)) {
        if (e.response) {
          const detail =
            e.response.data?.error?.message ||
            e.response.data?.detail ||
            e.response.statusText ||
            JSON.stringify(e.response.data).slice(0, 200)
          return { ok: false, message: `HTTP ${e.response.status}：${detail}` }
        }
        if (e.message?.includes('Network Error')) {
          return {
            ok: false,
            message: `无法连接到后端服务（${this.config.apiBase}），请确认代理服务已启动`,
          }
        }
        return { ok: false, message: e.message || '连接失败' }
      }
      return { ok: false, message: e?.message || '连接失败' }
    }
  }

  async generateRoutes(input: UserProfile): Promise<CareerSandbox> {
    return this.callWithSchema(buildRoutesPrompt(input), sandboxSchema)
  }

  async generateGrowthPlan(input: {
    profile: UserProfile
    route: CareerRoute
  }): Promise<GrowthPlan> {
    return this.callWithSchema(
      buildGrowthPrompt(input.profile, input.route),
      growthPlanSchema
    )
  }

  async compareRoutes(input: {
    profile: UserProfile
    routes: CareerRoute[]
  }): Promise<CompareResult> {
    return this.callWithSchema(
      buildComparePrompt(input.profile, input.routes),
      compareResultSchema
    )
  }
}

import { defaultAIConfig } from '@/utils/storage'
export const aiAdapter = new AIAdapter(defaultAIConfig)
