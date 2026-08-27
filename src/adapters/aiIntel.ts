// 职业动态模块 - AI 在线情报适配器
// 复用项目统一的后端代理通道（{apiBase}/api/chat），API Key 只在后端保管。
//
// 性能设计（关键）：Doubao-Seed-Evolving 是推理模型，一次性让它生成 10+ 个赛道的
// 完整情报会触发 5000+ reasoning tokens、单请求耗时 4~5 分钟，页面表现为"卡死"。
// 因此这里把监控赛道拆成 ≤4 个一批、最多 3 批并发请求，并：
//   ① 对豆包/方舟端点关闭深度思考（thinking: disabled，情报快照为结构化轻任务，
//      实测质量无损、耗时从 ~270s 降到 ~25s）；
//   ② prompt 约束紧凑输出（短摘要/少条目），单批 token 量降一个数量级；
//   ③ 批次级容错：单批失败重试一次，仍失败则该批赛道回退本地模板，不拖垮整页；
//   ④ onProgress 回调实时回报批次进度，按钮/界面有明确反馈。
// 大模型返回的行业情报经 Zod 容错校验后，与本地兜底结果合并：
// AI 没返回/返回坏掉的赛道自动回退本地模板，保证卡片永远完整。

import axios from 'axios'
import type { IntelAdapter, IntelIndustry, IntelProgressCb, IntelSettings } from '@/types/intel'
import type { AIConfig } from '@/utils/storage'
import { intelResultSchema, type IntelIndustryParsed } from '@/schemas/intel'
import { SYSTEM_PROMPT, RETRY_PROMPT } from '@/prompts/system'
import { buildIntelPrompt, type IntelTarget } from '@/prompts/intel'
import { INTEL_CATALOG } from './local/intelDataset'
import { localFallbackIndustries } from './local/intel'

/** 每批赛道数与最大并发批次数：11 个默认赛道 → 3 批（4/4/3）并发，墙钟约等于单批耗时 */
const BATCH_SIZE = 4
const MAX_CONCURRENCY = 3

function extractJson(text: string): any {
  if (!text) throw new Error('AI 返回为空')
  let cleaned = text.trim()
  const fence = cleaned.match(/```(?:json|JSON)?\s*([\s\S]*?)```/)
  if (fence) cleaned = fence[1].trim()
  const objStart = cleaned.indexOf('{')
  if (objStart !== -1) {
    const end = cleaned.lastIndexOf('}')
    if (end > objStart) cleaned = cleaned.slice(objStart, end + 1)
  }
  try {
    return JSON.parse(cleaned)
  } catch {
    try {
      const fixed = cleaned
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
      return JSON.parse(fixed)
    } catch (e) {
      throw new Error('AI 返回内容无法解析为 JSON：' + (e as Error).message)
    }
  }
}

/** 名称归一化用于模糊匹配 AI 返回的赛道名 */
function normName(s: string): string {
  return s.toLowerCase().replace(/[\s/／\-—·、,，.。()（）\[\]【】]/g, '')
}

/** 简单并发池：至多 limit 个 worker 同时消费 items */
async function runPool<T>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>): Promise<void> {
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++
      await worker(items[idx], idx)
    }
  })
  await Promise.all(runners)
}

class AIIntelAdapter implements IntelAdapter {
  readonly name = 'ai' as const
  private config: AIConfig

  constructor(initial: AIConfig) {
    this.config = initial
  }

  refreshConfig(cfg: AIConfig) {
    this.config = cfg
  }

  /** 豆包/方舟端点才下发 thinking 开关（其他厂商不认这个扩展参数） */
  private get isArkModel(): boolean {
    return /volces\.com/i.test(this.config.apiBase || '') || /doubao/i.test(this.config.model || '')
  }

  private async chat(messages: { role: string; content: string }[]): Promise<string> {
    if (!this.config.apiBase) throw new Error('未配置后端服务地址，请在右上角设置中填写')
    const base = this.config.apiBase.trim().replace(/\/+$/, '')
    const url = `${base}/api/chat`
    const body: Record<string, unknown> = {
      ...(this.config.model ? { model: this.config.model } : {}),
      temperature: 0.4,
      max_tokens: 8192,
      messages,
      response_format: { type: 'json_object' },
    }
    // 情报快照是结构化轻任务：关闭推理模型的深度思考，耗时从数分钟降到数十秒
    if (this.isArkModel) {
      body.extra_params = { thinking: { type: 'disabled' } }
    }
    let res
    try {
      res = await axios.post(url, body, {
        headers: { 'Content-Type': 'application/json' },
        // 单批 ≤4 个赛道、已关闭深度思考，正常 30~60s；给足 5 分钟容忍慢响应
        timeout: 300000,
      })
    } catch (e: any) {
      if (axios.isAxiosError(e)) {
        if (e.response) {
          const detail =
            e.response.data?.error?.message ||
            e.response.data?.detail ||
            e.response.statusText ||
            JSON.stringify(e.response.data)
          if (e.response.status === 401) throw new Error(`API Key 无效或已过期 (401)：${detail}`)
          if (e.response.status === 404) {
            throw new Error(`后端接口不存在 (404)：请确认后端代理服务已启动（${this.config.apiBase}）`)
          }
          if (e.response.status === 429) throw new Error('请求过于频繁或配额已用尽 (429)，请稍后再试')
          if (e.response.status >= 500) throw new Error(`AI 服务端错误 (${e.response.status})，请稍后重试`)
          throw new Error(`API 请求失败 (${e.response.status})：${detail}`)
        }
        if (e.code === 'ECONNABORTED') throw new Error('请求超时（5分钟），请稍后重试')
        if (e.message?.includes('Network Error')) {
          throw new Error(`无法连接后端服务（${this.config.apiBase}），请确认代理服务已启动；也可切换本地模拟模式查看演示数据`)
        }
        throw new Error(`网络错误：${e.message}`)
      }
      throw e
    }
    const content = res.data?.choices?.[0]?.message?.content
    if (!content) throw new Error('AI 接口返回格式异常：缺少 choices[0].message.content')
    return content
  }

  /** 请求单个批次，返回解析后的赛道数组；网络/解析失败在内部重试一次，仍失败返回 null */
  private async fetchBatch(batch: IntelTarget[], today: string): Promise<IntelIndustryParsed[] | null> {
    const userPrompt = buildIntelPrompt(batch, today)
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]
    let raw = ''
    try {
      raw = await this.chat(messages)
      return intelResultSchema.parse(extractJson(raw)).industries
    } catch {
      // 解析失败（或请求失败）再给模型一次修复机会
      try {
        const retryRaw = await this.chat([
          ...messages,
          { role: 'assistant', content: (raw || '').slice(0, 2000) },
          { role: 'user', content: RETRY_PROMPT },
        ])
        return intelResultSchema.parse(extractJson(retryRaw)).industries
      } catch {
        return null
      }
    }
  }

  async fetchIndustries(settings: IntelSettings, onProgress?: IntelProgressCb): Promise<IntelIndustry[]> {
    const targets: IntelTarget[] = settings.monitored.map((id) => {
      const known = INTEL_CATALOG.find((s) => s.id === id)
      if (known) return { id, name: known.name, tags: known.tags }
      const custom = settings.customIndustries.find((c) => c.id === id)
      return { id, name: custom?.name || id, tags: ['自定义监控'] }
    })
    if (targets.length === 0) return []

    const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    const batches: IntelTarget[][] = []
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      batches.push(targets.slice(i, i + BATCH_SIZE))
    }

    let doneBatches = 0
    let failedBatches = 0
    const parsedByBatch: (IntelIndustryParsed[] | null)[] = new Array(batches.length).fill(null)

    await runPool(batches, MAX_CONCURRENCY, async (batch, idx) => {
      parsedByBatch[idx] = await this.fetchBatch(batch, today)
      if (!parsedByBatch[idx]) failedBatches += 1
      doneBatches += 1
      onProgress?.(doneBatches, batches.length, failedBatches)
    })

    const parsed = parsedByBatch.filter((b): b is IntelIndustryParsed[] => !!b).flat()
    if (parsed.length === 0) {
      throw new Error('全部批次在线采集失败（网络错误或服务不可用）')
    }

    // 以本地兜底结果为底板，按名称模糊匹配 AI 返回并覆盖（缺失/失败的赛道自动补本地）
    const fallback = localFallbackIndustries(settings, new Date())
    const usedAI = new Set<number>()
    const merged = fallback.map((base) => {
      const target = targets.find((t) => t.id === base.id)
      const idx = parsed.findIndex((ind, i) => {
        if (usedAI.has(i)) return false
        const n1 = normName(ind.name)
        const n2 = normName(target?.name || base.name)
        return n1 === n2 || n1.includes(n2) || n2.includes(n1)
      })
      if (idx === -1) return base
      usedAI.add(idx)
      const ai = parsed[idx]
      return {
        ...base,
        name: target?.name || ai.name,
        tags: ai.tags.length ? ai.tags : base.tags,
        heatScore: Math.round(ai.heatScore),
        heatLevel: ai.heatLevel,
        demandLevel: Math.round(ai.demandLevel),
        competition: Math.round(ai.competition),
        trend: ai.trend,
        heatDelta: 0,
        summary: ai.summary,
        hotSkills: ai.hotSkills.length ? ai.hotSkills : base.hotSkills,
        decliningSkills: ai.decliningSkills,
        signals: ai.signals.length ? ai.signals : base.signals,
        opportunities: ai.opportunities.length ? ai.opportunities : base.opportunities,
        risks: ai.risks.length ? ai.risks : base.risks,
        salaryJunior: ai.salaryJunior,
        salaryMid: ai.salaryMid,
        salaryYoY: Math.round(ai.salaryYoY),
      }
    })
    return merged
  }
}

import { defaultAIConfig } from '@/utils/storage'
export const aiIntelAdapter = new AIIntelAdapter(defaultAIConfig)
