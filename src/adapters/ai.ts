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
import {
  parseResumeVision,
  runMarketResearchAgent,
  runMarketResearchChain,
  validateSandboxAI,
  type CallJSON,
  type AgentDeps,
  type AgentRuntime,
  type ChatCompletionFn,
} from './aiAgent'
import { ensureLongCycle } from './local/research'
import { localSalaryBenchmark } from './local'
import { aiRouteRelevant, clampRouteToBenchmark, isExamPrepRoute, relevantYears } from './local/benchmark'
import type { WebSearchResult } from '@/types/research'

/** 端点不支持 function calling（tools 参数被拒绝），Agent loop 据此回退固定链路 */
export class ToolsUnsupportedError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'ToolsUnsupportedError'
  }
}

/** 后端实时搜索不可用（未配置渠道或全部降级失败），Agent 据此转为模型知识模式并标注未核验 */
export class SearchUnavailableError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'SearchUnavailableError'
  }
}

/** OpenAI 兼容 tool_call 结构 */
export interface ToolCall {
  id: string
  type?: string
  function: { name: string; arguments: string }
}

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | unknown[] | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}

export function extractJson(text: string): any {
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
    messages: { role: string; content: string | unknown[] }[],
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
      // 推理类模型（如 deepseek-reasoner）生成长周期推演/链式调研 JSON 可能需要很久，
      // 超时放宽到 20 分钟（与后端代理超时一致）
      res = await axios.post(url, body, { headers, timeout: 1200000 })
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response) {
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
      }
      this.throwHttpError(e)
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

  /** 把 axios 错误翻译成中文报错（chat / chatCompletion / searchWeb 共用） */
  private throwHttpError(e: any): never {
    if (axios.isAxiosError(e)) {
      if (e.response) {
        const status = e.response.status
        const detail =
          e.response.data?.error?.message ||
          e.response.data?.detail ||
          e.response.statusText ||
          JSON.stringify(e.response.data)
        if (status === 401) throw new Error(`API Key 无效或已过期 (401)：${detail}\n请检查后端 .env 中的密钥配置`)
        if (status === 404) {
          throw new Error(`后端接口不存在 (404)：${detail}\n请确认后端服务已启动，且地址为 ${this.config.apiBase}`)
        }
        if (status === 403) throw new Error(`无访问权限 (403)：${detail}\n请确认 API Key 已开通该模型`)
        if (status === 429) throw new Error(`请求过于频繁或配额已用尽 (429)：${detail}\n请稍后再试或检查账户额度`)
        if (status >= 500) throw new Error(`AI 服务端错误 (${status})：${detail}\n请稍后重试`)
        throw new Error(`API 请求失败 (${status})：${detail}`)
      }
      if (e.code === 'ECONNABORTED') throw new Error('请求超时，模型推理耗时过长，请稍后重试')
      if (e.message?.includes('Network Error')) {
        throw new Error(
          `无法连接到后端服务：${this.config.apiBase}\n请确认代理服务已启动（python backend/main.py）。`
        )
      }
      throw new Error(`网络错误：${e.message}`)
    }
    throw e
  }

  /**
   * Agent 循环专用：透传 tools（标准 OpenAI function calling），返回 assistant 消息
   * （content + tool_calls）。不使用 response_format（json_object 与 tools 常互斥）。
   * 端点拒绝 tools 时抛 ToolsUnsupportedError，调用方据此回退固定链路。
   */
  async chatCompletion(
    messages: AgentMessage[],
    opts?: { tools?: any[]; maxTokens?: number }
  ): Promise<{ content: string; toolCalls: ToolCall[] }> {
    const { model } = this.config
    if (!this.config.apiBase) throw new Error('未配置后端服务地址，请在设置中填写')
    if (this.toolsUnsupported) throw new ToolsUnsupportedError('当前端点不支持 function calling')

    const body: Record<string, unknown> = {
      ...(model ? { model } : {}),
      temperature: 0.2,
      max_tokens: opts?.maxTokens ?? 8192,
      messages,
    }
    if (opts?.tools?.length) {
      body.tools = opts.tools
      body.tool_choice = 'auto'
    }

    let res
    try {
      // Agent 单轮可能含较长工具结果；超时与 chat() 一致放宽
      res = await axios.post(this.buildUrl(), body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 1200000,
      })
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 400) {
        const detail = String(
          e.response.data?.error?.message || e.response.data?.detail || ''
        )
        if (/tools|tool_choice|function|web_search/i.test(detail)) {
          this.toolsUnsupported = true
          throw new ToolsUnsupportedError(`当前模型/端点不支持 function calling：${detail.slice(0, 200)}`)
        }
      }
      this.throwHttpError(e)
    }

    const msg = res.data?.choices?.[0]?.message
    if (!msg) throw new Error('AI 接口返回格式异常：缺少 choices[0].message')
    const toolCalls: ToolCall[] = Array.isArray(msg.tool_calls)
      ? msg.tool_calls.map((tc: any) => ({
          id: tc.id || `call_${Math.random().toString(36).slice(2)}`,
          type: tc.type,
          function: {
            name: tc.function?.name || '',
            arguments: typeof tc.function?.arguments === 'string' ? tc.function.arguments : '{}',
          },
        }))
      : []
    return { content: typeof msg.content === 'string' ? msg.content : '', toolCalls }
  }

  /** tools 被标记为不支持（回退后避免后续调用重复试错） */
  private toolsUnsupported = false

  /**
   * 实时联网搜索（Agent 的 search_web 工具由后端执行，密钥不落地浏览器）。
   * 后端按 方舟内置联网 → 博查 → Tavily 顺序降级；全部不可用抛 SearchUnavailableError。
   */
  async searchWeb(query: string, count = 6): Promise<WebSearchResult[]> {
    if (!this.config.apiBase) throw new SearchUnavailableError('未配置后端服务地址')
    const base = this.config.apiBase.trim().replace(/\/+$/, '')
    try {
      const res = await axios.post(
        `${base}/api/search`,
        { query, count },
        { headers: { 'Content-Type': 'application/json' }, timeout: 120000 }
      )
      const results = Array.isArray(res.data?.results) ? res.data.results : []
      return results as WebSearchResult[]
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response) {
        const status = e.response.status
        const detail = e.response.data?.detail || e.response.statusText
        if (status === 503 || status === 404) {
          throw new SearchUnavailableError(String(detail))
        }
        throw new Error(`搜索服务错误 (${status})：${detail}`)
      }
      if (e.message?.includes('Network Error')) {
        throw new SearchUnavailableError(`无法连接后端搜索服务：${base}`)
      }
      throw e
    }
  }

  /** Agent 工具依赖：搜索 + 本地确定性薪资锚点 */
  agentDeps(): AgentDeps {
    return {
      searchWeb: (q: string) => this.searchWeb(q, 6),
      salaryBenchmark: (city: string, jobTitle: string) => localSalaryBenchmark(city, jobTitle),
    }
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
    const messages: { role: string; content: string | unknown[] }[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: fullPrompt },
    ]
    // 12 个月成长方案 JSON 体量大，且推理模型思考 token 也计入 max_tokens，给足额度避免被截断
    const isGrowth = /12\s*个月|按月拆分/.test(userPrompt)
    return this.callMessages(messages, schema, { maxTokens: isGrowth ? 32768 : 8192 })
  }

  /**
   * 结构化消息调用：消息 content 支持多模态 parts 数组（简历图片视觉解析用）。
   * 内含容错：JSON 提取失败、schema 校验失败各自动重试一次，仍失败则抛错。
   * 供 aiAgent 的链式调研 / 校验 / 视觉解析复用。
   */
  async callMessages<T>(
    messages: { role: string; content: string | unknown[] }[],
    schema: { parse: (d: any) => T },
    opts?: { maxTokens?: number }
  ): Promise<T> {
    const maxTokens = opts?.maxTokens ?? 8192
    const raw = await this.chat(messages, { maxTokens })

    const retryOnce = async (extraHint: string): Promise<T> => {
      const retryMessages: { role: string; content: string | unknown[] }[] = [
        ...messages,
        { role: 'assistant', content: raw.slice(0, 1500) },
        { role: 'user', content: `${RETRY_PROMPT}\n\n${extraHint}` },
      ]
      const retryRaw = await this.chat(retryMessages, { maxTokens })
      return schema.parse(extractJson(retryRaw))
    }

    let json: any
    try {
      json = extractJson(raw)
    } catch (e) {
      try {
        return await retryOnce('')
      } catch {
        throw e
      }
    }
    try {
      return schema.parse(json)
    } catch (e: any) {
      const issueText = this.formatZodError(e)
      try {
        return await retryOnce(`【上一次返回的具体问题】\n${issueText}\n请针对性修复以上问题。`)
      } catch {
        throw new Error('AI 返回数据结构校验失败：' + issueText)
      }
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
    const result = await this.callWithSchema(buildRoutesPrompt(input), sandboxSchema)

    // 基准约束层：模型返回的薪资/分数先经内置写实基准库钳制（资历段 × 城市系数 ×
    // 学历系数 × P7 硬天花板），修倒挂、修离谱值；salaryCurve 一律以钳制后的 nodes
    // 为准重建，保证曲线与节点一致且全部落在市场合理区间内。
    result.routes = result.routes.map((r) => {
      const relevant = aiRouteRelevant(r.name, r.industry, input)
      // 体制内备考路线（公务员/事业编/教师编）：往届工龄不抵职级，
      // current 必须是备考期，year1 才是试用期，不能按职场经验跳到科员/骨干教师
      const startExp = isExamPrepRoute(r.name || '', r.industry || '')
        ? 0
        : relevantYears(input, relevant)
      const notes = clampRouteToBenchmark(r, input, startExp)
      if (notes.length) console.warn('[CareerMap] AI 路线数值经基准库钳制：\n' + notes.join('\n'))
      r.salaryCurve = r.nodes.map((n) => ({
        stage: n.stage,
        min: n.salaryRange[0],
        max: n.salaryRange[1],
      }))
      return r
    })

    if (input.deepMode) {
      // 长周期模式：所有路线统一补齐到 9 节点（模型漏返 year4+ 时用本地外推引擎兜底）
      result.routes = result.routes.map((r) => ensureLongCycle(r, input))
      result.horizon = 8
    } else {
      // 常规模式：模型若多返了年份节点则截断回 3 年期
      result.routes = result.routes.map((r) =>
        r.nodes.length > 4
          ? { ...r, nodes: r.nodes.slice(0, 4), salaryCurve: r.salaryCurve.slice(0, 4) }
          : r
      )
      result.horizon = 3
    }
    return result
  }

  async parseResume(input: { imageDataUrl: string }): Promise<import('@/types/research').ResumeParseResult> {
    return parseResumeVision(this.callMessages.bind(this) as CallJSON, input.imageDataUrl)
  }

  /** 组装 Agent 运行时：结构化调用 + tools 循环 + 工具依赖（搜索走后端，密钥不落地） */
  private buildAgentRuntime(): AgentRuntime {
    return {
      call: this.callMessages.bind(this) as CallJSON,
      chatCompletion: this.chatCompletion.bind(this) as unknown as ChatCompletionFn,
      deps: this.agentDeps(),
    }
  }

  async runMarketResearch(
    input: import('@/types/research').ResearchInput,
    onStep?: (step: import('@/types/research').ResearchStepState) => void
  ): Promise<import('@/types/research').MarketResearchReport> {
    const runtime = this.buildAgentRuntime()
    try {
      // 首选：function calling Agent 循环（真实联网搜索 + 本地薪资锚点）
      return await runMarketResearchAgent(runtime, input, onStep)
    } catch (e) {
      // 端点不支持 tools 或循环异常：回退固定链路（内部含本地数据集兜底）
      if ((e as Error)?.name !== 'ToolsUnsupportedError') {
        console.warn('[CareerMap] Agent 调研循环异常，回退固定链路：', (e as Error)?.message)
      }
      return runMarketResearchChain(runtime.call, input, onStep)
    }
  }

  async validateSandbox(
    input: import('@/types/research').ValidationInput
  ): Promise<import('@/types/research').SandboxValidation> {
    return validateSandboxAI(this.buildAgentRuntime(), input)
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
