// AI 在线模式 - Agent 深度市场调研 / 沙盘事实校验 / 简历视觉解析
//
// 调研有两代实现，自动降级：
//   ① Agent 模式（默认）：function calling 工具循环。模型自主调用
//      search_web（后端执行真实联网搜索：方舟内置联网为主、博查/Tavily 为辅）、
//      salary_benchmark（本地确定性薪资数据集）、run_rule_checks（规则引擎），
//      多轮工具调用后一次性产出带 URL/日期/可靠性评级的 grounded 报告。
//   ② 固定链路模式（回退）：端点不支持 tools 时退化为 6 次固定 LLM 调用链，
//      结论基于模型知识（报告 grounded=false）。
// 任一步骤失败时用本地内置数据集兜底，整条链失败则回退完整本地报告，UI 永远有数据可看。

import { SYSTEM_PROMPT, RETRY_PROMPT } from '@/prompts/system'
import { buildResumePrompt } from '@/prompts/resume'
import {
  buildResearchPlanPrompt,
  buildJdResearchPrompt,
  buildHiringResearchPrompt,
  buildSentimentRiskPrompt,
  buildResearchSummaryPrompt,
  buildResearchAgentPrompt,
} from '@/prompts/research'
import { buildValidationPrompt, buildValidationAgentPrompt } from '@/prompts/validate'
import {
  resumeSchema,
  researchPlanSchema,
  jdResearchSchema,
  hiringResearchSchema,
  sentimentRiskSchema,
  researchSummarySchema,
  researchReportSchema,
  validationSchema,
} from '@/schemas/research'
import type {
  JdInsight,
  MarketResearchReport,
  MarketSignal,
  ResearchInput,
  ResearchStepState,
  ResearchTask,
  ResumeParseResult,
  SandboxValidation,
  ValidationInput,
  WebSearchResult,
} from '@/types/research'
import { localRunMarketResearch, localValidateSandbox, runRuleChecks } from './local/research'
import { extractJson } from './ai'

/** 由 AIAdapter 提供的结构化调用：发消息 → 抽 JSON → schema 校验（内含一次重试） */
export type CallJSON = <T>(
  messages: { role: string; content: string | unknown[] | null }[],
  schema: { parse: (d: unknown) => T },
  opts?: { maxTokens?: number }
) => Promise<T>

export interface ToolCall {
  id: string
  type?: string
  function: { name: string; arguments: string }
}

export type ChatMessage = {
  role: string
  content: string | unknown[] | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}

/** Agent 循环所需的模型调用 */
export type ChatCompletionFn = (
  messages: ChatMessage[],
  opts?: { tools?: unknown[]; maxTokens?: number }
) => Promise<{ content: string; toolCalls: ToolCall[] }>

/** Agent 工具依赖（密钥不落地浏览器：搜索由后端执行） */
export interface AgentDeps {
  searchWeb: (query: string) => Promise<WebSearchResult[]>
  salaryBenchmark: (city: string, jobTitle: string) => unknown
}

export interface AgentRuntime {
  call: CallJSON
  chatCompletion: ChatCompletionFn
  deps: AgentDeps
}

function isToolsUnsupported(e: unknown): boolean {
  return (e as Error)?.name === 'ToolsUnsupportedError'
}
function isSearchUnavailable(e: unknown): boolean {
  return (e as Error)?.name === 'SearchUnavailableError'
}

// ============ 简历视觉解析 ============

export async function parseResumeVision(
  call: CallJSON,
  imageDataUrl: string
): Promise<ResumeParseResult> {
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'text', text: buildResumePrompt() },
        // OpenAI 兼容多模态格式：base64 图片内联，后端原样透传给视觉模型
        { type: 'image_url', image_url: { url: imageDataUrl } },
      ],
    },
  ]
  const parsed = await call<ReturnType<typeof resumeSchema.parse>>(messages, resumeSchema, {
    maxTokens: 8192,
  })
  return {
    education: parsed.education,
    skills: parsed.skills,
    workExperience: parsed.workExperience,
    projects: parsed.projects,
    weaknesses: parsed.weaknesses,
    rawSummary: parsed.rawSummary,
    yearsOfExperience: parsed.yearsOfExperience ?? null,
    identity: parsed.identity ?? null,
    parsedAt: new Date().toISOString(),
  }
}

// ============ Agent tool-use 循环（function calling） ============

/** 调研 Agent 可用工具（标准 OpenAI function 格式，经 /api/chat 透传） */
const RESEARCH_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_web',
      description:
        '实时联网搜索国内招聘市场信息：岗位 JD、薪资行情、招聘动态（HC 扩招/收缩）、行业热度、职场舆情、政策与技术替代风险。返回真实网页的标题、URL、摘要、发布日期与来源可靠性评级。必须真实调用本工具获取市场事实，禁止凭记忆编造薪资数字或新闻事件。',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '检索词，具体到城市+岗位+年份，如「杭州 Java后端 招聘 薪资 2026」',
          },
          focus: {
            type: 'string',
            enum: ['jd', 'hiring', 'heat', 'sentiment', 'risk'],
            description: '检索主题：jd=岗位JD与薪资 / hiring=招聘动态 / heat=赛道热度 / sentiment=职场舆情 / risk=政策与风险',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'salary_benchmark',
      description:
        '查询本地确定性薪资参考数据集（历年薪酬报告估算 × 城市系数，非实时），返回匹配赛道在指定城市的起薪/1年/3年薪资区间，用于与实时搜索结果交叉对照。',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: '城市名，如「杭州」' },
          jobTitle: { type: 'string', description: '岗位/方向关键词，如「Java后端」「数据分析」' },
        },
        required: ['city', 'jobTitle'],
      },
    },
  },
]

/** 校验 Agent 可用工具：搜索 + 规则引擎 */
const VALIDATION_TOOLS = [
  RESEARCH_TOOLS[0],
  {
    type: 'function',
    function: {
      name: 'run_rule_checks',
      description:
        '运行本地确定性规则引擎，对沙盘做 10 项机械性自洽检查（薪资倒挂、曲线完整性、字段矛盾、期望薪资可达性等），返回问题列表与自洽得分。无参数。',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
]

/** 工具执行过程中收集的检索上下文 */
interface AgentCtx {
  searchCount: number
  searchOk: boolean
  searchAvailable: boolean
  queries: string[]
  benchmarkCalls: number
}

function newAgentCtx(): AgentCtx {
  return { searchCount: 0, searchOk: false, searchAvailable: true, queries: [], benchmarkCalls: 0 }
}

function safeParseArgs(argsJson: string): Record<string, any> {
  try {
    const parsed = JSON.parse(argsJson || '{}')
    return typeof parsed === 'object' && parsed ? parsed : {}
  } catch {
    return {}
  }
}

/** 压缩搜索结果为回灌给模型的紧凑 JSON */
function formatSearchResults(results: WebSearchResult[]): string {
  return JSON.stringify({
    count: results.length,
    results: results.slice(0, 6).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      publishedAt: r.publishedAt || '',
      reliability: r.reliability,
      provider: r.provider || '',
    })),
  })
}

const SEARCH_DISABLED_MSG =
  '{"error":"search_unavailable","message":"实时搜索当前不可用（后端未配置搜索渠道或全部降级失败）。请立即停止调用 search_web，改用你掌握的市场知识完成任务；最终报告 grounded 必须为 false，所有 url 留空，严禁编造任何链接。"}'

/** 调研工具执行器：search_web → 后端真实搜索；salary_benchmark → 本地确定性数据集 */
async function execResearchTool(
  name: string,
  argsJson: string,
  deps: AgentDeps,
  ctx: AgentCtx
): Promise<string> {
  const args = safeParseArgs(argsJson)
  try {
    if (name === 'search_web') {
      const query = String(args.query || '').trim()
      if (!query) return JSON.stringify({ error: 'missing query' })
      ctx.queries.push(query)
      ctx.searchCount++
      if (!ctx.searchAvailable) return SEARCH_DISABLED_MSG
      const results = await deps.searchWeb(query)
      if (!results.length) {
        ctx.searchAvailable = false
        return SEARCH_DISABLED_MSG
      }
      ctx.searchOk = true
      return formatSearchResults(results)
    }
    if (name === 'salary_benchmark') {
      ctx.benchmarkCalls++
      return JSON.stringify(
        deps.salaryBenchmark(String(args.city || ''), String(args.jobTitle || ''))
      )
    }
    return JSON.stringify({ error: `unknown tool: ${name}` })
  } catch (e) {
    // 搜索不可用是预期内的降级路径：明确告知模型转入知识模式
    if (isSearchUnavailable(e)) {
      ctx.searchAvailable = false
      return SEARCH_DISABLED_MSG
    }
    // 其他工具错误不致命：把错误回灌让模型继续
    return JSON.stringify({ error: 'tool_execution_failed', message: (e as Error).message?.slice(0, 200) })
  }
}

/**
 * 通用 Agent 循环：模型返回 tool_calls → 执行工具 → 结果回灌 → 继续，
 * 直到模型不再调用工具（产出最终文本）或达到轮次上限。
 * 工具执行异常永远回灌为文本，不中断循环；chatCompletion 抛错（含 ToolsUnsupportedError）向上传播。
 */
async function runAgentLoop(opts: {
  messages: ChatMessage[]
  tools: unknown[]
  chatCompletion: ChatCompletionFn
  execTool: (name: string, argsJson: string) => Promise<string>
  maxRounds: number
  maxTokens?: number
  onToolCall?: (name: string, args: Record<string, any>) => void
}): Promise<{ content: string }> {
  const { messages, tools, chatCompletion, execTool, maxRounds, onToolCall } = opts
  let lastContent = ''

  for (let round = 0; round < maxRounds; round++) {
    const { content, toolCalls } = await chatCompletion(messages, {
      tools,
      maxTokens: opts.maxTokens ?? 8192,
    })
    lastContent = content || lastContent

    if (!toolCalls.length) {
      return { content: content || lastContent }
    }

    // 追加 assistant 的 tool_calls 消息
    messages.push({ role: 'assistant', content: content || null, tool_calls: toolCalls })

    for (const tc of toolCalls) {
      const name = tc.function?.name || ''
      const args = safeParseArgs(tc.function?.arguments || '{}')
      onToolCall?.(name, args)
      const result = await execTool(name, tc.function?.arguments || '{}')
      messages.push({ role: 'tool', tool_call_id: tc.id, name, content: result })
    }
  }

  // 轮次耗尽：去掉工具强制模型立刻输出最终 JSON
  messages.push({
    role: 'user',
    content: '工具调用轮次已达上限。请不要再调用任何工具，直接输出最终完整 JSON 结果。',
  })
  const final = await chatCompletion(messages, { maxTokens: opts.maxTokens ?? 8192 })
  return { content: final.content || lastContent }
}

// ============ Agent 模式市场调研（function calling） ============

/**
 * Agent 自主工具循环调研。端点不支持 tools 时抛 ToolsUnsupportedError，
 * 由 AIAdapter 层/调用方回退到 runMarketResearchChain。
 */
export async function runMarketResearchAgent(
  runtime: AgentRuntime,
  input: ResearchInput,
  onStep?: (step: ResearchStepState) => void
): Promise<MarketResearchReport> {
  const steps: ResearchStepState[] = [
    { id: 'plan', title: 'Agent 规划调研路径', status: 'pending' },
    { id: 'search', title: '联网实时检索（真实搜索）', status: 'pending' },
    { id: 'benchmark', title: '本地薪资锚点测算', status: 'pending' },
    { id: 'summary', title: 'Agent 交叉汇总 grounded 报告', status: 'pending' },
  ]
  const mark = (id: string, patch: Partial<ResearchStepState>) => {
    const s = steps.find((x) => x.id === id)
    if (s) Object.assign(s, patch)
    onStep?.(s ? { ...s } : { id, title: id, status: 'running' })
  }

  mark('plan', { status: 'running' })
  const ctx = newAgentCtx()

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildResearchAgentPrompt(input) },
  ]

  let finalContent = ''
  try {
    const loop = await runAgentLoop({
      messages,
      tools: RESEARCH_TOOLS,
      chatCompletion: runtime.chatCompletion,
      maxRounds: 10,
      maxTokens: 16384,
      execTool: (name, argsJson) => execResearchTool(name, argsJson, runtime.deps, ctx),
      onToolCall: (name) => {
        if (name === 'search_web') {
          mark('plan', { status: 'done', detail: `规划完成，开始实时检索` })
          mark('search', {
            status: 'running',
            detail: `已执行 ${ctx.searchCount} 次搜索`,
          })
        } else if (name === 'salary_benchmark') {
          mark('benchmark', { status: 'running', detail: `本地数据集薪资测算 ${ctx.benchmarkCalls + 1} 次` })
        }
      },
    })
    finalContent = loop.content
  } catch (e) {
    if (isToolsUnsupported(e)) throw e // 由上层回退固定链路
    // 循环中其他异常（网络等）：交回上层，runMarketResearchChain 有本地兜底
    throw e
  }

  // 搜索步骤收尾
  if (ctx.searchCount > 0) {
    mark('search', {
      status: ctx.searchOk ? 'done' : 'error',
      detail: ctx.searchOk
        ? `已执行 ${ctx.searchCount} 次实时搜索`
        : '搜索渠道不可用，已转为模型知识模式',
    })
  } else {
    mark('search', { status: 'skipped', detail: '模型未调用搜索工具' })
  }
  mark('benchmark', ctx.benchmarkCalls > 0
    ? { status: 'done', detail: `薪资锚点测算 ${ctx.benchmarkCalls} 次` }
    : { status: 'skipped' })
  mark('summary', { status: 'running' })

  // ---- 最终报告解析（失败带错误信息无工具重试一次） ----
  let parsed: ReturnType<typeof researchReportSchema.parse>
  try {
    parsed = researchReportSchema.parse(extractJson(finalContent))
  } catch (e: any) {
    const hint =
      e?.name === 'ZodError'
        ? `【上一次返回的具体问题】\n${formatZodLikeError(e)}\n请针对性修复以上问题。`
        : '上一次返回无法解析为 JSON，请只输出合法 JSON 对象。'
    messages.push({ role: 'assistant', content: finalContent.slice(0, 1500) })
    messages.push({ role: 'user', content: `${RETRY_PROMPT}\n\n${hint}\n不要再调用任何工具。` })
    const retry = await runtime.chatCompletion(messages, { maxTokens: 16384 })
    parsed = researchReportSchema.parse(extractJson(retry.content))
  }

  // ---- 真实性防御：搜索未成功时，任何 url 都不可信（模型可能编造），一律清空 ----
  if (!ctx.searchOk) {
    parsed.signals.forEach((s) => {
      s.url = ''
      if (s.reliability === 'high') s.reliability = 'low'
    })
    parsed.grounded = false
  }
  const groundedSignals = parsed.signals.filter((s) => s.url && s.url.startsWith('http'))
  const grounded = Boolean(ctx.searchOk && (parsed.grounded || groundedSignals.length >= 3) && groundedSignals.length >= 3)

  // JD 结论必须覆盖每条路线（复用与固定链路相同的兜底逻辑）
  let jdInsights = parsed.jdInsights
  if (jdInsights.length < input.sandbox.routes.length) {
    const localForFill = await localRunMarketResearch(input).catch(() => null)
    jdInsights = input.sandbox.routes.map((r) => {
      const found = jdInsights.find((j) => j.routeId === r.id || j.routeName === r.name)
      if (found) return { ...found, routeId: r.id, routeName: r.name }
      const fallback = localForFill?.jdInsights.find((j) => j.routeId === r.id)
      if (fallback) return fallback
      const y1 = r.nodes[1] || r.nodes[0]
      return {
        routeId: r.id,
        routeName: r.name,
        role: y1.title,
        salaryRange: [y1.salaryRange[0], y1.salaryRange[1]] as [number, number],
        demandTrend: 'flat' as const,
        hotRequirements: y1.requiredSkills.slice(0, 5),
        decliningRequirements: [],
        sampleTitles: r.nodes.slice(0, 3).map((n) => n.title),
        note: '该环节数据缺失，已按沙盘节点给出基础信息',
      }
    })
  } else {
    jdInsights = jdInsights.map((j, i) => ({
      ...j,
      routeId: input.sandbox.routes[i]?.id || j.routeId,
    }))
  }

  // 信号太少时用本地数据集补足（保证 UI 有内容）
  let signals: MarketSignal[] = parsed.signals
  if (signals.length < 4) {
    const local = await localRunMarketResearch(input).catch(() => null)
    if (local) signals = [...signals, ...local.signals.slice(0, 8 - signals.length)]
  }

  let periodNote = parsed.periodNote
  if (!periodNote) {
    const now = new Date()
    periodNote = grounded
      ? `${now.getFullYear()}年${now.getMonth() + 1}月 实时联网检索 + 公开招聘舆情数据`
      : `${now.getFullYear()}年${now.getMonth() + 1}月前后近 3~6 个月公开招聘与舆情数据（AI 在线生成，未实时核验）`
  }

  mark('summary', {
    status: 'done',
    detail: grounded
      ? `报告完成，${groundedSignals.length} 条信号带可核验来源`
      : '报告完成（基于模型知识，未实时核验）',
  })

  return {
    id: `research_${Date.now()}`,
    createdAt: new Date().toISOString(),
    source: 'ai',
    grounded,
    searchQueries: ctx.queries,
    horizon: input.sandbox.horizon,
    periodNote,
    tasks: parsed.tasks,
    jdInsights,
    signals,
    heatChanges: parsed.heatChanges,
    sentimentSummary: parsed.sentimentSummary,
    riskNews: parsed.riskNews,
    summary: parsed.summary,
    stepStatus: steps,
  }
}

function formatZodLikeError(e: any): string {
  if (e?.issues && Array.isArray(e.issues)) {
    return e.issues
      .map((iss: any) => {
        const path = iss.path?.join('.') || '(root)'
        return `- ${path}: ${iss.message}`
      })
      .join('\n')
  }
  return e?.message || String(e)
}

// ============ Agent 固定链路市场调研（回退实现） ============

export async function runMarketResearchChain(
  call: CallJSON,
  input: ResearchInput,
  onStep?: (step: ResearchStepState) => void
): Promise<MarketResearchReport> {
  const steps: ResearchStepState[] = [
    { id: 'plan', title: 'Agent 拆解调研任务', status: 'pending' },
    { id: 'jd', title: '检索近 3~6 个月岗位 JD 与薪资', status: 'pending' },
    { id: 'hiring', title: '行业招聘动态与赛道热度', status: 'pending' },
    { id: 'sentiment', title: '职场舆情扫描', status: 'pending' },
    { id: 'risk', title: '行业风险资讯汇总', status: 'pending' },
    { id: 'summary', title: 'Agent 交叉汇总调研报告', status: 'pending' },
  ]
  const mark = (id: string, patch: Partial<ResearchStepState>) => {
    const s = steps.find((x) => x.id === id)
    if (s) Object.assign(s, patch)
    onStep?.(s ? { ...s } : { id, title: id, status: 'running' })
  }
  const sys = (prompt: string): ChatMessage[] => [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ]
  const failedSteps: string[] = []

  // ---- step 1: 任务拆解 ----
  mark('plan', { status: 'running' })
  let tasks: ResearchTask[] = []
  try {
    const plan = await call(sys(buildResearchPlanPrompt(input)), researchPlanSchema, {
      maxTokens: 4096,
    })
    tasks = plan.tasks
    mark('plan', { status: 'done', detail: `已拆解 ${tasks.length} 条搜索任务` })
  } catch (e) {
    failedSteps.push('plan')
    mark('plan', { status: 'error', detail: '任务拆解失败，将使用本地兜底' })
  }

  // ---- step 2: 岗位 JD 调研 ----
  mark('jd', { status: 'running' })
  let jdInsights: JdInsight[] = []
  let jdSignals: MarketSignal[] = []
  try {
    const res = await call(sys(buildJdResearchPrompt(input, tasks)), jdResearchSchema, {
      maxTokens: 8192,
    })
    jdInsights = res.jdInsights
    jdSignals = res.signals
    mark('jd', { status: 'done', detail: `完成 ${jdInsights.length} 个目标岗位 JD 分析` })
  } catch (e) {
    failedSteps.push('jd')
    mark('jd', { status: 'error', detail: 'JD 调研失败，将使用本地兜底' })
  }

  // ---- step 3: 招聘动态 + 赛道热度 ----
  mark('hiring', { status: 'running' })
  let hiringSignals: MarketSignal[] = []
  let heatChanges: MarketResearchReport['heatChanges'] = []
  try {
    const prior = [...jdSignals].slice(0, 5).map((s) => ({ title: s.title, detail: s.detail }))
    const res = await call(sys(buildHiringResearchPrompt(input, prior)), hiringResearchSchema, {
      maxTokens: 8192,
    })
    hiringSignals = res.signals
    heatChanges = res.heatChanges
    mark('hiring', { status: 'done', detail: `覆盖 ${heatChanges.length} 个赛道热度变化` })
  } catch (e) {
    failedSteps.push('hiring')
    mark('hiring', { status: 'error', detail: '招聘动态调研失败，将使用本地兜底' })
  }

  // ---- step 4+5: 职场舆情 + 行业风险 ----
  mark('sentiment', { status: 'running' })
  let sentimentSummary = ''
  let sentimentSignals: MarketSignal[] = []
  let riskNews: string[] = []
  let riskSignals: MarketSignal[] = []
  try {
    const prior = [...jdSignals, ...hiringSignals]
      .slice(0, 8)
      .map((s) => ({ title: s.title, detail: s.detail }))
    const res = await call(sys(buildSentimentRiskPrompt(input, prior)), sentimentRiskSchema, {
      maxTokens: 8192,
    })
    sentimentSummary = res.sentimentSummary
    sentimentSignals = res.sentimentSignals
    riskNews = res.riskNews
    riskSignals = res.riskSignals
    mark('sentiment', { status: 'done', detail: `舆情信号 ${sentimentSignals.length} 条` })
    mark('risk', { status: 'done', detail: `风险资讯 ${riskNews.length} 条` })
  } catch (e) {
    failedSteps.push('sentiment', 'risk')
    mark('sentiment', { status: 'error', detail: '舆情调研失败，将使用本地兜底' })
    mark('risk', { status: 'error', detail: '风险资讯失败，将使用本地兜底' })
  }

  // ---- step 6: 汇总 ----
  mark('summary', { status: 'running' })
  let summary = ''
  let periodNote = ''
  let extraSignals: MarketSignal[] = []
  try {
    const res = await call(
      sys(
        buildResearchSummaryPrompt(input, {
          jdCount: jdInsights.length,
          signalCount: jdSignals.length + hiringSignals.length + sentimentSignals.length,
          heatCount: heatChanges.length,
          riskCount: riskNews.length,
        })
      ),
      researchSummarySchema,
      { maxTokens: 4096 }
    )
    summary = res.summary
    periodNote = res.periodNote
    extraSignals = res.extraSignals
    mark('summary', { status: 'done' })
  } catch (e) {
    failedSteps.push('summary')
    mark('summary', { status: 'error', detail: '汇总失败，将使用本地兜底' })
  }

  const aiSignals = [...jdSignals, ...hiringSignals, ...sentimentSignals, ...riskSignals, ...extraSignals]

  // ---- 失败环节本地兜底 ----
  let source: MarketResearchReport['source'] = failedSteps.length === 0 ? 'ai' : 'mixed'
  if (failedSteps.length >= 5) {
    // 整条链基本失败：直接返回完整本地报告（保留失败步骤状态）
    const local = await localRunMarketResearch(input)
    return {
      ...local,
      source: 'local',
      stepStatus: steps.map((s, i) => ({ ...s, ...local.stepStatus[i] })),
    }
  }

  if (failedSteps.length > 0) {
    const local = await localRunMarketResearch(input)
    if (!tasks.length) tasks = local.tasks
    if (!jdInsights.length) jdInsights = local.jdInsights
    if (!heatChanges.length) heatChanges = local.heatChanges
    if (!sentimentSummary) sentimentSummary = local.sentimentSummary
    if (!riskNews.length) riskNews = local.riskNews
    if (!summary) summary = local.summary
    if (!periodNote) periodNote = local.periodNote
    // AI 信号太少时用本地信号补足
    if (aiSignals.length < 4) {
      aiSignals.push(...local.signals.slice(0, 8 - aiSignals.length))
    }
  }

  // JD 结论必须覆盖每条路线，缺失的用本地结论补
  const localForFill = failedSteps.includes('jd')
    ? null
    : await localRunMarketResearch(input).catch(() => null)
  jdInsights = input.sandbox.routes.map((r) => {
    const found = jdInsights.find((j) => j.routeId === r.id || j.routeName === r.name)
    if (found) return { ...found, routeId: r.id, routeName: r.name }
    const fallback = localForFill?.jdInsights.find((j) => j.routeId === r.id)
    if (fallback) return fallback
    const y1 = r.nodes[1] || r.nodes[0]
    return {
      routeId: r.id,
      routeName: r.name,
      role: y1.title,
      salaryRange: [y1.salaryRange[0], y1.salaryRange[1]] as [number, number],
      demandTrend: 'flat' as const,
      hotRequirements: y1.requiredSkills.slice(0, 5),
      decliningRequirements: [],
      sampleTitles: r.nodes.slice(0, 3).map((n) => n.title),
      note: '该环节数据缺失，已按沙盘节点给出基础信息',
    }
  })

  if (!periodNote) {
    const now = new Date()
    periodNote = `${now.getFullYear()}年${now.getMonth() + 1}月前后近 3~6 个月公开招聘与舆情数据（AI 在线生成）`
  }

  return {
    id: `research_${Date.now()}`,
    createdAt: new Date().toISOString(),
    source,
    horizon: input.sandbox.horizon,
    periodNote,
    tasks,
    jdInsights,
    signals: aiSignals,
    heatChanges,
    sentimentSummary,
    riskNews,
    summary,
    stepStatus: steps,
  }
}

// ============ 沙盘事实校验（Agent 模式，回退固定调用） ============

const clampScore = (n: number) => Math.max(30, Math.min(98, Math.round(n)))

/** 规则结果 + AI 结果 → 最终校验报告（grounding 可用时置信度纳入外部核验权重） */
function assembleValidation(
  ai: ReturnType<typeof validationSchema.parse>,
  rule: ReturnType<typeof runRuleChecks>,
  input: ValidationInput,
  ctx: AgentCtx
): SandboxValidation {
  const verifications = (ai.verifications || []).filter((v) => v.claim)
  // 仅当真实搜索成功且产出核验结论时，grounding 才参与置信度，
  // 避免「用模型记忆校验模型记忆」的自我印证
  const searchGrounded = ctx.searchOk && verifications.length > 0

  let score: number
  let groundedChecks = 0
  if (searchGrounded) {
    const g =
      (100 *
        verifications.reduce(
          (acc, v) => acc + (v.verdict === 'confirmed' ? 1 : v.verdict === 'partly' ? 0.5 : 0),
          0
        )) /
      verifications.length
    // 置信度 = 35% 规则自洽 + 35% AI 市场吻合 + 30% 外部证据核验
    score = clampScore(rule.score * 0.35 + Math.max(0, Math.min(100, ai.confidenceScore)) * 0.35 + g * 0.3)
    groundedChecks = ai.groundedChecks || verifications.length
  } else {
    // 无外部核验：维持 40% 规则 + 60% AI
    score = clampScore(rule.score * 0.4 + Math.max(0, Math.min(100, ai.confidenceScore)) * 0.6)
  }

  const issues = [
    ...rule.issues,
    ...ai.issues
      .filter((i) => i.message)
      .map((i) => ({
        routeId: i.routeId || undefined,
        routeName: i.routeName || undefined,
        field: i.field,
        severity: i.severity,
        message: i.message,
        suggestion: i.suggestion,
        source: 'ai' as const,
        // 证据链接只在真实搜索成功时采信，防止模型编造 URL
        ...(searchGrounded && i.evidenceUrl && /^https?:\/\//.test(i.evidenceUrl)
          ? { evidenceUrl: i.evidenceUrl }
          : {}),
      })),
  ]

  let marketUpdates = ai.marketUpdates
  let riskCorrections: SandboxValidation['riskCorrections'] = ai.riskCorrections.map((r) => ({
    ...(r.routeId ? { routeId: r.routeId } : {}),
    routeName: r.routeName,
    severity: r.severity,
    suggestion: r.suggestion,
  }))
  if (!marketUpdates.length || !riskCorrections.length) {
    const local = localValidateSandbox(input)
    if (!marketUpdates.length) marketUpdates = local.marketUpdates
    if (!riskCorrections.length) riskCorrections = local.riskCorrections
  }

  return {
    confidenceScore: score,
    checksPassed: rule.checksPassed,
    checksTotal: rule.checksTotal,
    issues,
    marketUpdates,
    riskCorrections,
    summary: ai.summary || localValidateSandbox(input).summary,
    source: 'ai',
    validatedAt: new Date().toISOString(),
    groundedChecks,
    ...(searchGrounded
      ? { verifications: verifications.map((v) => ({ claim: v.claim, verdict: v.verdict, ...(v.url && /^https?:\/\//.test(v.url) && ctx.searchOk ? { url: v.url } : {}) })) }
      : {}),
  }
}

/** 回退路径：端点不支持 tools 时的单次结构化调用（旧行为，无外部核验） */
async function validateSandboxSingleCall(
  call: CallJSON,
  input: ValidationInput,
  rule: ReturnType<typeof runRuleChecks>
): Promise<SandboxValidation> {
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildValidationPrompt(input) },
  ]
  const ai = await call(messages, validationSchema, { maxTokens: 8192 })
  return assembleValidation(ai, rule, input, newAgentCtx())
}

export async function validateSandboxAI(
  runtime: AgentRuntime,
  input: ValidationInput
): Promise<SandboxValidation> {
  // 本地规则引擎始终运行（机械性自洽检查），结果同时作为工具暴露给模型
  const rule = runRuleChecks(input)
  const ctx = newAgentCtx()

  let ai: ReturnType<typeof validationSchema.parse>
  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildValidationAgentPrompt(input) },
    ]

    let finalContent = ''
    try {
      const loop = await runAgentLoop({
        messages,
        tools: VALIDATION_TOOLS,
        chatCompletion: runtime.chatCompletion,
        maxRounds: 6,
        maxTokens: 12288,
        execTool: async (name, argsJson) => {
          if (name === 'run_rule_checks') {
            return JSON.stringify({
              score: rule.score,
              checksPassed: rule.checksPassed,
              checksTotal: rule.checksTotal,
              issues: rule.issues.map((i) => ({
                field: i.field,
                severity: i.severity,
                message: i.message,
              })),
            })
          }
          if (name === 'search_web') {
            return execResearchTool(name, argsJson, runtime.deps, ctx)
          }
          return JSON.stringify({ error: `unknown tool: ${name}` })
        },
      })
      finalContent = loop.content
    } catch (e) {
      if (isToolsUnsupported(e)) {
        // 端点不支持 function calling：回退旧版单次结构化调用
        return validateSandboxSingleCall(runtime.call, input, rule)
      }
      throw e
    }

    try {
      ai = validationSchema.parse(extractJson(finalContent))
    } catch (e: any) {
      const hint =
        e?.name === 'ZodError'
          ? `【上一次返回的具体问题】\n${formatZodLikeError(e)}\n请针对性修复以上问题。`
          : '上一次返回无法解析为 JSON，请只输出合法 JSON 对象。'
      messages.push({ role: 'assistant', content: finalContent.slice(0, 1500) })
      messages.push({ role: 'user', content: `${RETRY_PROMPT}\n\n${hint}\n不要再调用任何工具。` })
      const retry = await runtime.chatCompletion(messages, { maxTokens: 12288 })
      ai = validationSchema.parse(extractJson(retry.content))
    }

    // 搜索未成功：核验链接不可信（assembleValidation 内部据此忽略 evidenceUrl/verifications）
    return assembleValidation(ai, rule, input, ctx)
  } catch (e) {
    // AI 校验整体失败：回退本地规则校验
    return localValidateSandbox(input)
  }
}
