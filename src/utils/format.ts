import type { InvolutionLevel } from '@/types/career'

export function involutionColor(level: InvolutionLevel): string {
  return level === 'low' ? '#52c41a' : level === 'medium' ? '#faad14' : '#ff4d4f'
}

export function involutionText(level: InvolutionLevel): string {
  return level === 'low' ? '低内卷' : level === 'medium' ? '中等内卷' : '高度内卷'
}

export function salaryRangeText(range: [number, number]): string {
  return `${range[0]}-${range[1]}K`
}

export function levelToInvolution(score: number): InvolutionLevel {
  if (score <= 4) return 'low'
  if (score <= 7) return 'medium'
  return 'high'
}

export function scoreStars(n: number, max = 5): string {
  return '★'.repeat(n) + '☆'.repeat(max - n)
}

export function genId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
