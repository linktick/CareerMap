import { z } from 'zod'

// 与 schemas/career.ts 同样的容错思路：AI 返回什么都尽量兜住，不让一次脏数据搞垮页面

/** 容错 number：接受数字 / 数字字符串 / 布尔 */
function num(opts?: { min?: number; max?: number; default: number }) {
  let inner = z.number()
  if (opts?.min !== undefined) inner = inner.min(opts.min)
  if (opts?.max !== undefined) inner = inner.max(opts.max)
  const preprocessed = z.preprocess((v) => {
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
      const n = Number(v.trim().replace('%', ''))
      return Number.isFinite(n) ? n : v
    }
    if (typeof v === 'boolean') return v ? 1 : 0
    return v
  }, inner)
  return opts?.default !== undefined ? preprocessed.default(opts.default) : preprocessed
}

/** 容错字符串数组：逗号分隔字符串 / 单值 / 数组都接受 */
function strArray(fallback: string[] = []) {
  return z.preprocess((v) => {
    if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean)
    if (typeof v === 'string') {
      return v.split(/[、,，;；\n]/).map((s) => s.trim()).filter(Boolean)
    }
    return fallback
  }, z.array(z.string())).default(fallback)
}

/** 枚举容错，失败回退默认值 */
function looseEnum<T extends string>(values: readonly T[], fallback: T) {
  return z.preprocess((v) => {
    if (typeof v !== 'string') return fallback
    const lower = v.toLowerCase().trim()
    for (const val of values) {
      if (val.toLowerCase() === lower) return val
    }
    // 中文同义词兜底
    if (/热|风口|火爆|上升|热门/.test(v)) return 'hot'
    if (/缩|冷|降|下行|衰退|预警|收缩/.test(v)) return 'cooling'
    if (/蓝海|冷门|小众|潜力/.test(v)) return 'blueocean'
    if (/稳|平/.test(v)) return 'steady'
    return fallback
  }, z.enum(values as [T, ...T[]])) as unknown as z.ZodType<T>
}

/** 薪资二元组容错：[a,b] / [a] / 非数组 → 兜底 */
function salaryTuple(fallback: [number, number]): z.ZodType<[number, number]> {
  return z.preprocess((v) => {
    if (!Array.isArray(v)) return fallback
    const nums = v.map((x) => {
      const n = typeof x === 'number' ? x : Number(String(x).trim())
      return Number.isFinite(n) ? n : 0
    })
    if (nums.length === 0) return fallback
    if (nums.length === 1) return [nums[0], nums[0]]
    return [nums[0], nums[1]]
  }, z.tuple([z.number(), z.number()])) as unknown as z.ZodType<[number, number]>
}

export const intelIndustrySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).default('未知赛道'),
  tags: strArray([]),
  heatScore: num({ min: 0, max: 100, default: 50 }),
  heatLevel: looseEnum(['hot', 'cooling', 'blueocean', 'steady'] as const, 'steady'),
  demandLevel: num({ min: 1, max: 5, default: 3 }),
  competition: num({ min: 1, max: 5, default: 3 }),
  trend: looseEnum(['up', 'flat', 'down'] as const, 'flat'),
  summary: z.string().default('暂无动态摘要。'),
  hotSkills: strArray([]),
  decliningSkills: strArray([]),
  signals: strArray([]),
  opportunities: strArray([]),
  risks: strArray([]),
  salaryJunior: salaryTuple([6, 10]),
  salaryMid: salaryTuple([15, 25]),
  salaryYoY: num({ default: 0 }),
})

export const intelResultSchema = z.object({
  industries: z.preprocess((v) => {
    if (Array.isArray(v)) return v
    if (v && typeof v === 'object' && Array.isArray((v as any).industries)) {
      return (v as any).industries
    }
    return []
  }, z.array(intelIndustrySchema)),
})

export type IntelIndustryParsed = z.infer<typeof intelIndustrySchema>
