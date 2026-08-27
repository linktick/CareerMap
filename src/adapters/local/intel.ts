// 职业动态模块 - 本地情报模拟器
// 基于内置数据集 + 确定性伪随机扰动，按日期生成"采集快照"：
// 同一日期永远生成同一份数据（可复现），不同日期热度沿长期动量缓慢漂移，
// 从而在离线模式下也能演示周期采集、热度走势、风口/收缩/蓝海分类。

import type {
  HeatLevel,
  IntelAdapter,
  IntelIndustry,
  IntelSettings,
  IntelSnapshot,
  TrendDirection,
} from '@/types/intel'
import { INTEL_CATALOG, findSeed, genericSeed, type IntelSeed } from './intelDataset'

const DAY_MS = 24 * 60 * 60 * 1000
/** 动量基准日期：热度漂移从这一天开始累计 */
const EPOCH = new Date('2025-01-01T00:00:00').getTime()

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

/** 离散确定性噪声：-1 ~ 1 */
function rawNoise(seed: string): number {
  return (hashString(seed) % 1000) / 500 - 1
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/**
 * 平滑噪声：相邻月份数值连续变化（smoothstep 插值），
 * 保证热度曲线是缓慢漂移而不是锯齿跳变。
 * @param t 连续时间（月）
 */
function smoothNoise(seed: string, t: number): number {
  const i = Math.floor(t)
  const f = t - i
  const a = rawNoise(`${seed}@${i}`)
  const b = rawNoise(`${seed}@${i + 1}`)
  const s = f * f * (3 - 2 * f)
  return a + (b - a) * s
}

function monthsSinceEpoch(date: Date): number {
  return (date.getTime() - EPOCH) / (30 * DAY_MS)
}

/** 某赛道在某日期的热度（长期动量 + 平滑噪声） */
function heatAt(seed: IntelSeed, date: Date): number {
  const t = monthsSinceEpoch(date)
  // 动量按月折算到很小的系数，保证一两年尺度上只漂移几个~十几个点
  let slope = seed.momentum * t * 0.35
  // 临近上下界时阻尼：已经很热的赛道不会被长期动量死死顶在天花板上，
  // 给周期噪声留出波动空间，趋势线才不会是一条贴边直线
  if (slope > 0) slope = Math.min(slope, Math.max(0, 94 - seed.baseHeat))
  if (slope < 0) slope = Math.max(slope, Math.min(0, 16 - seed.baseHeat))
  const noise = smoothNoise(`heat:${seed.id}`, t) * seed.volatility * 1.0
  return Math.round(clamp(seed.baseHeat + slope + noise, 12, 96))
}

function demandAt(seed: IntelSeed, date: Date): number {
  const t = monthsSinceEpoch(date)
  const n = smoothNoise(`demand:${seed.id}`, t) * 0.9
  return clamp(seed.baseDemand + Math.round(n), 1, 5)
}

function salaryAt(seed: IntelSeed, date: Date): { junior: [number, number]; mid: [number, number]; yoy: number } {
  const t = monthsSinceEpoch(date)
  const f = 1 + smoothNoise(`sal:${seed.id}`, t) * 0.05
  const round = (v: number) => Math.round(v)
  return {
    junior: [round(seed.salaryJunior[0] * f), round(seed.salaryJunior[1] * f)],
    mid: [round(seed.salaryMid[0] * f), round(seed.salaryMid[1] * f)],
    yoy: Math.round(seed.baseYoY + smoothNoise(`yoy:${seed.id}`, t) * 2.5),
  }
}

function classify(
  heat: number,
  demand: number,
  competition: number,
  momentum: number
): HeatLevel {
  // 1. 热度低迷 → 收缩预警
  if (heat < 40) return 'cooling'
  // 2. 热度不高且处于长期下行通道 → 收缩预警
  if (heat <= 58 && momentum < 0) return 'cooling'
  // 3. 高热度 → 热门风口
  if (heat >= 72) return 'hot'
  // 4. 热度不高、竞争温和但需求旺/在上升通道 → 蓝海冷门
  if (heat <= 66 && competition <= 3 && (demand >= 4 || momentum > 0)) return 'blueocean'
  return 'steady'
}

/** 长期走势方向取自动量系数（月度漂移太慢，直接看热度差会频繁判成"持平"） */
function trendOf(momentum: number): TrendDirection {
  if (momentum >= 0.6) return 'up'
  if (momentum <= -0.6) return 'down'
  return 'flat'
}

function seedFor(settings: IntelSettings, id: string): IntelSeed {
  const known = findSeed(id)
  if (known) return known
  const custom = settings.customIndustries.find((c) => c.id === id)
  return genericSeed(id, custom?.name || id)
}

export function generateIndustry(
  settings: IntelSettings,
  id: string,
  date: Date
): IntelIndustry {
  const seed = seedFor(settings, id)
  const heat = heatAt(seed, date)
  const trend = trendOf(seed.momentum)
  const demand = demandAt(seed, date)
  const sal = salaryAt(seed, date)

  return {
    id: seed.id,
    name: seed.name,
    tags: [...seed.tags],
    heatScore: heat,
    heatLevel: classify(heat, demand, seed.competition, seed.momentum),
    demandLevel: demand,
    competition: seed.competition,
    trend,
    heatDelta: 0, // 由 store 对比上一快照后统一回填
    summary: seed.summary,
    hotSkills: [...seed.hotSkills],
    decliningSkills: [...seed.decliningSkills],
    signals: [...seed.signals],
    opportunities: [...seed.opportunities],
    risks: [...seed.risks],
    salaryJunior: sal.junior,
    salaryMid: sal.mid,
    salaryYoY: sal.yoy,
  }
}

export function generateIndustries(settings: IntelSettings, date: Date): IntelIndustry[] {
  return settings.monitored.map((id) => generateIndustry(settings, id, date))
}

export function generateSnapshot(
  settings: IntelSettings,
  date: Date,
  source: 'local' | 'ai' = 'local'
): IntelSnapshot {
  return {
    id: `snap_${date.getTime()}`,
    createdAt: date.toISOString(),
    source,
    cycleDays: settings.cycleDays,
    industries: generateIndustries(settings, date),
  }
}

/**
 * 首次使用时回填历史：当前 1 条 + 过去 6 个周期共 7 条快照，
 * 让趋势图一上来就有走势可看，而不是一条直线。
 */
export function seedHistory(settings: IntelSettings): IntelSnapshot[] {
  const now = Date.now()
  const snapshots: IntelSnapshot[] = []
  for (let k = 6; k >= 1; k--) {
    const date = new Date(now - k * settings.cycleDays * DAY_MS)
    snapshots.push(generateSnapshot(settings, date, 'local'))
  }
  snapshots.push(generateSnapshot(settings, new Date(now), 'local'))
  return snapshots
}

/** 供 AI 模式兜底：自定义/未返回赛道的情报模板 */
export function localFallbackIndustries(settings: IntelSettings, date: Date): IntelIndustry[] {
  return generateIndustries(settings, date)
}

export const localIntelAdapter: IntelAdapter = {
  name: 'local',
  async fetchIndustries(settings: IntelSettings): Promise<IntelIndustry[]> {
    // 模拟采集延迟，让刷新动画可见
    await new Promise((r) => setTimeout(r, 700))
    return generateIndustries(settings, new Date())
  },
}

export { INTEL_CATALOG }
