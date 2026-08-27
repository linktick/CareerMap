import { z } from 'zod'

/**
 * 可容错的 number schema：
 * - 接受 number / 字符串数字 ("8", "8.5") / 布尔值
 * - 可选 min/max/default
 */
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

/** 枚举容错：大小写不敏感、前后空白，失败时回退到默认值 */
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

/** 固定长度数组容错：非数组/不足补默认值，多余截断 */
function fixedLength<T extends z.ZodTypeAny>(
  schema: T,
  len: number,
  padFn: (idx: number) => z.infer<T>
) {
  return z.preprocess((v) => {
    if (!Array.isArray(v)) {
      return Array.from({ length: len }, (_, i) => padFn(i))
    }
    if (v.length < len) {
      const padded = [...v]
      for (let i = v.length; i < len; i++) padded.push(padFn(i))
      return padded
    }
    if (v.length > len) return v.slice(0, len)
    return v
  }, z.array(schema).length(len))
}

/**
 * 变长数组容错：长度允许 [minLen, maxLen]。
 * 不足 minLen 时按 padFn 补齐（长周期推演下 AI 漏返 yearN 节点时兜底），
 * 超过 maxLen 截断。常规 3 年期为 4 节点（current+year1~3），
 * 长周期深度推演最长 9 节点（current+year1~8）。
 */
function variableLength<T extends z.ZodTypeAny>(
  schema: T,
  minLen: number,
  maxLen: number,
  padFn: (idx: number) => z.infer<T>
) {
  return z.preprocess((v) => {
    if (!Array.isArray(v)) {
      return Array.from({ length: minLen }, (_, i) => padFn(i))
    }
    if (v.length < minLen) {
      const padded = [...v]
      for (let i = v.length; i < minLen; i++) padded.push(padFn(i))
      return padded
    }
    if (v.length > maxLen) return v.slice(0, maxLen)
    return v
  }, z.array(schema).min(minLen).max(maxLen))
}

/** 薪资二元组容错：[a,b,c] → [a,b]，[a] → [a,a]，非数组 → [0,0] */
function salaryTuple() {
  return z.preprocess((v) => {
    if (!Array.isArray(v)) return [0, 0]
    if (v.length >= 2) return [v[0], v[1]]
    if (v.length === 1) return [v[0], v[0]]
    return [0, 0]
  }, z.tuple([num(), num()]))
}

const STAGES = [
  'current', 'year1', 'year2', 'year3',
  'year4', 'year5', 'year6', 'year7', 'year8',
] as const
const defaultNode = (i: number) => ({
  stage: STAGES[Math.min(i, STAGES.length - 1)],
  title: '',
  salaryRange: [0, 0] as [number, number],
  demandLevel: 3,
  bottleneck: '',
  requiredSkills: [],
  certificates: [],
})
const defaultSalaryPoint = (i: number) => ({
  stage: STAGES[Math.min(i, STAGES.length - 1)],
  min: 0,
  max: 0,
})
const defaultMonth = (i: number) => ({
  month: i + 1,
  theme: '',
  learningTasks: [],
  practiceProjects: [],
  jobActions: '',
  certPrep: '',
  keyReminder: '',
})

export const stageSchema = z.enum([
  'current', 'year1', 'year2', 'year3',
  'year4', 'year5', 'year6', 'year7', 'year8',
])
export const involutionSchema = looseEnum(['low', 'medium', 'high'] as const, 'medium')

export const routeNodeSchema = z.object({
  stage: looseEnum(STAGES, 'current'),
  title: z.string().default(''),
  salaryRange: salaryTuple(),
  demandLevel: num({ min: 1, max: 5, default: 3 }),
  bottleneck: z.string().default(''),
  requiredSkills: z.array(z.string()).default([]),
  certificates: z.array(z.string()).default([]),
})

export const salaryPointSchema = z.object({
  stage: looseEnum(STAGES, 'current'),
  min: num({ default: 0 }),
  max: num({ default: 0 }),
})

export const careerRouteSchema = z.object({
  id: z.string().default(''),
  name: z.string().default(''),
  summary: z.string().default(''),
  industry: z.string().default(''),
  involutionLevel: involutionSchema,
  involutionScore: num({ min: 1, max: 10, default: 5 }),
  matchScore: num({ min: 0, max: 100, default: 50 }),
  nodes: variableLength(routeNodeSchema, 4, 9, defaultNode),
  salaryCurve: variableLength(salaryPointSchema, 4, 9, defaultSalaryPoint),
  pitfalls: z.array(z.string()).default([]),
  entryCost: num({ min: 1, max: 5, default: 3 }),
  switchDifficulty: num({ min: 1, max: 5, default: 3 }),
  ceiling: z.string().default(''),
  riskLevel: num({ min: 1, max: 5, default: 3 }),
})

export const sandboxSchema = z.object({
  routes: z.array(careerRouteSchema).min(1),
  summary: z.string().default(''),
  horizon: num({ min: 3, max: 8, default: 3 }).optional(),
})

export const learningTaskSchema = z.object({
  task: z.string().default(''),
  done: z.boolean().default(false),
  type: looseEnum(['new', 'review'] as const, 'new'),
})

export const monthPlanSchema = z.object({
  month: num({ min: 1, max: 12, default: 1 }),
  theme: z.string().default(''),
  learningTasks: z.array(learningTaskSchema).default([]),
  practiceProjects: z.array(z.string()).default([]),
  jobActions: z.string().default(''),
  certPrep: z.string().default(''),
  keyReminder: z.string().default(''),
})

export const growthPlanSchema = z.object({
  routeId: z.string().default(''),
  routeName: z.string().default(''),
  targetRole: z.string().default(''),
  goalSummary: z.string().default(''),
  targetSalary: salaryTuple(),
  months: fixedLength(monthPlanSchema, 12, defaultMonth),
})

export const compareRowSchema = z.object({
  routeId: z.string().default(''),
  entryCost: num({ min: 1, max: 5, default: 3 }),
  threeYearSalaryMax: num({ default: 0 }),
  involution: num({ min: 1, max: 5, default: 3 }),
  switchDifficulty: num({ min: 1, max: 5, default: 3 }),
  ceiling: z.string().default(''),
  riskLevel: num({ min: 1, max: 5, default: 3 }),
  matchScore: num({ min: 0, max: 100, default: 50 }),
})

export const compareResultSchema = z.object({
  comparison: z.array(compareRowSchema).min(1),
  advice: z.string().default(''),
})
