// 深度调研 / 事实校验 / 简历解析 的 Zod 容错 schema
// 与 schemas/career.ts 同样的容错策略：类型宽松、缺字段补默认、枚举大小写不敏感
import { z } from 'zod'

function num(opts?: { min?: number; max?: number; default?: number }) {
  let inner = z.number()
  if (opts?.min !== undefined) inner = inner.min(opts.min)
  if (opts?.max !== undefined) inner = inner.max(opts.max)
  const preprocessed = z.preprocess((v) => {
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
      const n = Number(v.trim())
      return Number.isFinite(n) ? n : v
    }
    if (typeof v === 'boolean') return v ? 1 : 0
    return v
  }, inner)
  if (opts?.default !== undefined) return preprocessed.default(opts.default)
  return preprocessed
}

function looseEnum<T extends string>(values: readonly T[], fallback: T): z.ZodType<T> {
  return z.preprocess((v) => {
    if (typeof v !== 'string') return fallback
    const lower = v.toLowerCase().trim()
    for (const val of values) {
      if (val.toLowerCase() === lower) return val
    }
    return fallback
  }, z.enum(values as [T, ...T[]])) as unknown as z.ZodType<T>
}

function strArray() {
  return z.preprocess((v) => {
    if (Array.isArray(v)) return v.filter((x) => typeof x === 'string' && x.trim())
    if (typeof v === 'string') return v ? [v] : []
    return []
  }, z.array(z.string())).default([])
}

function salaryTuple() {
  return z.preprocess((v) => {
    if (!Array.isArray(v)) return [0, 0]
    if (v.length >= 2) return [v[0], v[1]]
    if (v.length === 1) return [v[0], v[0]]
    return [0, 0]
  }, z.tuple([num({ default: 0 }), num({ default: 0 })]))
}

// ============ 简历解析 ============

export const resumeSchema = z.object({
  education: z
    .object({
      school: z.string().optional().default(''),
      tier: z.string().optional().default(''),
      major: z.string().optional().default(''),
      degree: z.string().optional().default(''),
    })
    .default({}),
  skills: strArray(),
  workExperience: strArray(),
  projects: strArray(),
  weaknesses: strArray(),
  rawSummary: z.string().default(''),
  yearsOfExperience: num({ min: 0, max: 600 }).nullable().optional(),
  identity: looseEnum(['student', 'fresh', 'professional'] as const, 'professional').nullable().optional(),
})

// ============ Agent 链式调研 ============

export const researchTaskSchema = z.object({
  id: z.string().default(''),
  title: z.string().default(''),
  target: z.string().default(''),
  keywords: strArray(),
})

export const jdInsightSchema = z.object({
  routeId: z.string().default(''),
  routeName: z.string().default(''),
  role: z.string().default(''),
  salaryRange: salaryTuple(),
  demandTrend: looseEnum(['up', 'flat', 'down'] as const, 'flat'),
  hotRequirements: strArray(),
  decliningRequirements: strArray(),
  sampleTitles: strArray(),
  note: z.string().default(''),
})

export const marketSignalSchema = z.object({
  category: looseEnum(
    ['jd', 'hiring', 'heat', 'sentiment', 'risk'] as const,
    'hiring'
  ),
  title: z.string().default(''),
  detail: z.string().default(''),
  direction: looseEnum(['positive', 'neutral', 'negative'] as const, 'neutral'),
  source: z.string().default('公开招聘市场综合'),
  // 实时搜索证据：url 必须来自工具返回，模型知识生成时留空（严禁编造）
  url: z.string().default(''),
  publishedAt: z.string().default(''),
  reliability: z.optional(looseEnum(['high', 'medium', 'low'] as const, 'medium')),
})

export const heatChangeSchema = z.object({
  track: z.string().default(''),
  direction: looseEnum(['up', 'flat', 'down'] as const, 'flat'),
  detail: z.string().default(''),
})

/** 任务拆解步骤产出 */
export const researchPlanSchema = z.object({
  tasks: z.array(researchTaskSchema).default([]),
})

/** JD 调研步骤产出 */
export const jdResearchSchema = z.object({
  jdInsights: z.array(jdInsightSchema).default([]),
  signals: z.array(marketSignalSchema).default([]),
})

/** 招聘动态 + 赛道热度步骤产出 */
export const hiringResearchSchema = z.object({
  signals: z.array(marketSignalSchema).default([]),
  heatChanges: z.array(heatChangeSchema).default([]),
})

/** 职场舆情 + 行业风险步骤产出 */
export const sentimentRiskSchema = z.object({
  sentimentSummary: z.string().default(''),
  sentimentSignals: z.array(marketSignalSchema).default([]),
  riskNews: strArray(),
  riskSignals: z.array(marketSignalSchema).default([]),
})

/** 汇总步骤产出 */
export const researchSummarySchema = z.object({
  summary: z.string().default(''),
  periodNote: z.string().default(''),
  // 汇总步骤允许对前序信号做补充/修正
  extraSignals: z.array(marketSignalSchema).default([]),
})

/** Agent tool-use 循环最终一次性产出的完整调研报告 */
export const researchReportSchema = z.object({
  tasks: z.array(researchTaskSchema).default([]),
  jdInsights: z.array(jdInsightSchema).default([]),
  signals: z.array(marketSignalSchema).default([]),
  heatChanges: z.array(heatChangeSchema).default([]),
  sentimentSummary: z.string().default(''),
  riskNews: strArray(),
  summary: z.string().default(''),
  periodNote: z.string().default(''),
  // 是否基于真实搜索证据：模型在搜索不可用时必须显式返回 false
  grounded: z
    .preprocess((v) => v === true || v === 'true' || v === 1, z.boolean())
    .default(false),
})

// ============ 沙盘事实校验 ============

export const validationIssueSchema = z.object({
  routeId: z.string().optional().default(''),
  routeName: z.string().optional().default(''),
  field: z.string().default('general'),
  severity: looseEnum(['high', 'medium', 'low'] as const, 'medium'),
  message: z.string().default(''),
  suggestion: z.string().default(''),
  // 实时搜索核验链接（无外部证据时留空）
  evidenceUrl: z.string().default(''),
})

/** 单条断言的外部核验结果（置信度 grounding 计算用） */
export const claimVerificationSchema = z.object({
  claim: z.string().default(''),
  verdict: looseEnum(['confirmed', 'partly', 'contradicted'] as const, 'partly'),
  url: z.string().default(''),
})

export const riskCorrectionSchema = z.object({
  routeId: z.string().optional().default(''),
  routeName: z.string().default(''),
  severity: looseEnum(['high', 'medium', 'low'] as const, 'medium'),
  suggestion: z.string().default(''),
})

export const validationSchema = z.object({
  confidenceScore: num({ min: 0, max: 100, default: 70 }),
  issues: z.array(validationIssueSchema).default([]),
  marketUpdates: strArray(),
  riskCorrections: z.array(riskCorrectionSchema).default([]),
  summary: z.string().default(''),
  // 经实时搜索核验的断言数（未使用搜索工具时为 0）
  groundedChecks: num({ min: 0, max: 20, default: 0 }),
  verifications: z.array(claimVerificationSchema).default([]),
})
