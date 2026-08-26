// 示例沙盘数据：电子商务专业 → 电商行业
// 首页"查看示例沙盘"按钮使用此数据，直接展示 12 个月成长方案。
// 数据完全由本地规则引擎基于真实岗位数据集生成，结构与真实推演一致。

import type { CareerSandbox, GrowthPlan, UserProfile } from '@/types/career'
import { __localInternals } from './index'

/**
 * 演示用户画像：电子商务专业在校生，目标电商行业，坐标杭州。
 */
export const DEMO_PROFILE: UserProfile = {
  identity: 'student',
  majorOrJob: '电子商务',
  city: '杭州',
  schoolTier: 'regular',
  yearsOfExperience: 0,
  targetIndustries: ['电商'],
  preferences: ['长期发展空间', '创造性'],
  acceptRelocate: 'new_tier1',
  acceptOvertime: true,
  maxOvertimeHours: 10,
  minSalaryK: 8,
  riskPreference: 'neutral',
  skills: ['Excel', '淘宝/拼多多后台', '客服沟通'],
}

let cachedSandbox: CareerSandbox | null = null
let cachedGrowth: GrowthPlan | null = null

/** 生成（并缓存）示例沙盘的 4 条职业路线，电商运营匹配度最高排第一。 */
export function getDemoSandbox(): CareerSandbox {
  if (!cachedSandbox) {
    cachedSandbox = __localInternals.generateRoutes(DEMO_PROFILE)
    cachedSandbox.generatedAt = new Date().toISOString()
    cachedSandbox.mode = 'local'
  }
  return cachedSandbox
}

/**
 * 生成（并缓存）示例 12 个月成长方案。
 * 基于示例沙盘中匹配度最高的路线（电商运营路线），
 * 套用电商专用成长模板，内容涵盖平台规则、数据分析、付费投放、
 * 大促活动、短视频/直播、供应链等真实电商运营工作。
 */
export function getDemoGrowthPlan(): GrowthPlan {
  if (!cachedGrowth) {
    const sandbox = getDemoSandbox()
    const topRoute = sandbox.routes[0]
    cachedGrowth = __localInternals.generateGrowthPlan({
      profile: DEMO_PROFILE,
      route: topRoute,
    })
  }
  return cachedGrowth
}
