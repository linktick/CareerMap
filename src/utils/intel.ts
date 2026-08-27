import type { HeatLevel, TrendDirection } from '@/types/intel'

// 热力分级配色（调色板经 CVD/对比度校验，使用处均同时带文字标签，不单靠颜色区分）
export const HEAT_COLORS: Record<HeatLevel, string> = {
  hot: '#f43f5e',
  cooling: '#4f46e5',
  blueocean: '#0d9488',
  steady: '#64748b',
}

export const HEAT_LABELS: Record<HeatLevel, string> = {
  hot: '热门风口',
  cooling: '收缩预警',
  blueocean: '蓝海冷门',
  steady: '平稳型',
}

export const HEAT_ICONS: Record<HeatLevel, string> = {
  hot: '🔥',
  cooling: '🧊',
  blueocean: '🌊',
  steady: '➖',
}

/** 浅色标签底色（主色约 12% 不透明度） */
export const HEAT_SOFT: Record<HeatLevel, string> = {
  hot: '#fff1f2',
  cooling: '#eef2ff',
  blueocean: '#f0fdfa',
  steady: '#f8fafc',
}

export const TREND_META: Record<TrendDirection, { icon: string; text: string; color: string }> = {
  up: { icon: '▲', text: '上升', color: '#f43f5e' },
  flat: { icon: '—', text: '持平', color: '#94a3b8' },
  down: { icon: '▼', text: '回落', color: '#4f46e5' },
}

export function heatDots(level: number, max = 5): string {
  return '●'.repeat(level) + '○'.repeat(max - level)
}
