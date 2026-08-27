// 职途星图 - 职业动态预览模块（行业情报雷达）类型定义
// 与核心沙盘模块相互独立：AI 返回与本地模拟器输出都必须满足此结构

import type { AppMode } from './career'

/** 赛道热力分级 */
export type HeatLevel =
  | 'hot'        // 热门风口赛道
  | 'cooling'    // 收缩预警赛道
  | 'blueocean'  // 蓝海冷门赛道
  | 'steady'     // 平稳型（不进入三类热力标签）

/** 近期走势方向 */
export type TrendDirection = 'up' | 'flat' | 'down'

/** 情报数据来源：ai = 在线大模型生成；local = 本地内置数据集模拟 */
export type IntelSource = AppMode

/** 采集周期（天） */
export type CycleDays = 1 | 3 | 7 | 14

/** 单个行业在某一次快照中的完整情报 */
export interface IntelIndustry {
  /** 赛道唯一标识（内置赛道为固定 slug，自定义赛道为 custom:xxx） */
  id: string
  /** 赛道名称 */
  name: string
  /** 标签（如「AI 应用」「新能源」「政策扶持」） */
  tags: string[]
  /** 热度指数 0~100（招聘需求、讨论度、资本关注的综合分） */
  heatScore: number
  /** 热力分级 */
  heatLevel: HeatLevel
  /** 招聘需求强度 1~5 */
  demandLevel: number
  /** 竞争/内卷强度 1~5 */
  competition: number
  /** 近一个采集周期的走势 */
  trend: TrendDirection
  /** 热度相对上一次快照的变化值（正升负降），由 store 统一计算 */
  heatDelta: number
  /** 简短动态摘要（一两句话） */
  summary: string
  /** 当下热门技能 */
  hotSkills: string[]
  /** 正在降温/贬值的技能 */
  decliningSkills: string[]
  /** 关键动向信号（招聘放量、政策、大厂动作等） */
  signals: string[]
  /** 机会点 */
  opportunities: string[]
  /** 风险与预警 */
  risks: string[]
  /** 初级岗位月薪区间 K */
  salaryJunior: [number, number]
  /** 中级（3~5 年）岗位月薪区间 K */
  salaryMid: [number, number]
  /** 薪资同比变化（%） */
  salaryYoY: number
}

/** 一次采集得到的全量快照 */
export interface IntelSnapshot {
  id: string
  /** 采集时间 ISO 字符串 */
  createdAt: string
  source: IntelSource
  /** 本次采集使用的周期（天） */
  cycleDays: number
  industries: IntelIndustry[]
}

/** 用户自定义赛道（本地数据集没有，AI 模式下交给大模型生成情报） */
export interface CustomIndustry {
  id: string
  name: string
}

/** 模块设置（持久化到 localStorage） */
export interface IntelSettings {
  /** 采集周期 */
  cycleDays: CycleDays
  /** 监控中的赛道 id 列表（内置 slug + custom:xxx） */
  monitored: string[]
  /** 是否开启定时自动采集 */
  autoRefresh: boolean
  /** 用户自定义赛道 */
  customIndustries: CustomIndustry[]
}

/** 采集进度回调：doneBatches/totalBatches 为批次进度，failedBatches 为失败批次数 */
export type IntelProgressCb = (doneBatches: number, totalBatches: number, failedBatches: number) => void

/** 情报适配器：本地模拟器与 AI 在线模式各自实现 */
export interface IntelAdapter {
  readonly name: IntelSource
  /**
   * 抓取/生成一批赛道的最新情报。
   * @param monitored 监控中的赛道（内置 id 直接查目录；未知 id 走通用模板/AI 自由生成）
   * @param onProgress 批次进度回调（AI 分批并发采集时使用，本地适配器可忽略）
   */
  fetchIndustries(monitored: IntelSettings, onProgress?: IntelProgressCb): Promise<IntelIndustry[]>
}
