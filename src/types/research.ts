// 职途星图 - 深度市场调研 & 沙盘事实校验 & 简历视觉解析 类型定义
// 与核心沙盘模块解耦：AI 链式 Agent 与本地模拟器输出都必须满足此结构

import type { AppMode, CareerRoute, UserProfile, SchoolTier } from './career'

// ============ 简历视觉解析 ============

export interface ResumeEducation {
  /** 学校名称 */
  school?: string
  /** 院校层次（985/211/master/phd/regular/junior/overseas/other） */
  tier?: SchoolTier | string
  /** 专业 */
  major?: string
  /** 学历（本科/硕士/博士/专科） */
  degree?: string
}

export interface ResumeParseResult {
  education: ResumeEducation
  /** 从简历中识别出的技能 */
  skills: string[]
  /** 工作经历（提炼后的条目，含公司/岗位/时长） */
  workExperience: string[]
  /** 项目经验（提炼后的条目） */
  projects: string[]
  /** 短板信息（经历断层、技能缺口、学历/经验门槛风险等） */
  weaknesses: string[]
  /** 简历整体摘要（一两段话） */
  rawSummary: string
  /** 识别出的从业月数（无法判断为 null） */
  yearsOfExperience?: number | null
  /** 推断的身份（student/fresh/professional，无法判断为 null） */
  identity?: UserProfile['identity'] | null
  parsedAt: string
}

// ============ Agent 链式市场调研 ============

export type ResearchStepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped'

/** 链式调研中单个步骤的实时状态（用于前端进度展示） */
export interface ResearchStepState {
  id: string
  title: string
  status: ResearchStepStatus
  detail?: string
}

/** Agent 链第一步「任务拆解」产出的搜索任务 */
export interface ResearchTask {
  id: string
  title: string
  /** 调研对象：某岗位 / 某行业 / 某舆情主题 */
  target: string
  /** 检索关键词（模拟搜索 query） */
  keywords: string[]
}

export type SignalCategory = 'jd' | 'hiring' | 'heat' | 'sentiment' | 'risk'
export type SignalDirection = 'positive' | 'neutral' | 'negative'
export type TrendDirection = 'up' | 'flat' | 'down'

/** 岗位 JD 调研结论（按路线） */
export interface JdInsight {
  routeId: string
  routeName: string
  /** 对标的市场岗位名称 */
  role: string
  /** 近 3~6 个月市场月薪区间 K */
  salaryRange: [number, number]
  /** 岗位需求趋势 */
  demandTrend: TrendDirection
  /** JD 中高频出现的新要求（技能/学历/经验） */
  hotRequirements: string[]
  /** 正在从 JD 中消失的旧要求 */
  decliningRequirements: string[]
  /** 代表性岗位标题 */
  sampleTitles: string[]
  note: string
}

/** 单条市场信号（招聘动态 / 热度变化 / 舆情 / 风险资讯） */
export interface MarketSignal {
  category: SignalCategory
  title: string
  detail: string
  direction: SignalDirection
  /** 来源描述，如「BOSS直聘近3个月JD聚合」「脉脉舆情」 */
  source: string
  /** 真实来源链接（来自实时搜索结果；模型知识生成时必须留空，严禁编造） */
  url?: string
  /** 来源发布时间（YYYY-MM 或 YYYY-MM-DD，无则空） */
  publishedAt?: string
  /** 来源可靠性评级：high=招聘平台/政府/权威财经，medium=主流媒体/社区，low=其他 */
  reliability?: 'high' | 'medium' | 'low'
}

/** /api/search 归一化后的实时搜索结果 */
export interface WebSearchResult {
  title: string
  url: string
  snippet: string
  publishedAt?: string
  reliability: 'high' | 'medium' | 'low'
  /** 实际提供结果的渠道：ark=方舟内置联网 / bocha=博查 / tavily */
  provider?: string
}

export interface HeatChange {
  track: string
  direction: TrendDirection
  detail: string
}

export interface MarketResearchReport {
  id: string
  createdAt: string
  /** ai = 全链路线上生成；local = 本地模拟；mixed = 部分步骤失败后本地兜底 */
  source: AppMode | 'mixed'
  /** 是否有真实联网搜索证据支撑（≥3 条信号带可核验 URL） */
  grounded?: boolean
  /** Agent 实际执行的检索词（实时搜索轨迹，供 UI 展示与导出） */
  searchQueries?: string[]
  /** 调研覆盖的推演年限 */
  horizon: number
  /** 数据时间窗说明（如「2026年3月~2026年8月公开招聘数据」） */
  periodNote: string
  /** 任务拆解结果 */
  tasks: ResearchTask[]
  jdInsights: JdInsight[]
  signals: MarketSignal[]
  heatChanges: HeatChange[]
  /** 职场舆情总结 */
  sentimentSummary: string
  /** 行业风险资讯条目 */
  riskNews: string[]
  summary: string
  /** 链上各步骤的最终执行状态 */
  stepStatus: ResearchStepState[]
}

// ============ 沙盘事实校验 / 自洽性检查 ============

export type IssueSeverity = 'high' | 'medium' | 'low'

export interface ValidationIssue {
  routeId?: string
  routeName?: string
  /** 问题定位的字段/维度，如「salaryCurve」「matchScore」 */
  field: string
  severity: IssueSeverity
  message: string
  suggestion: string
  /** rule = 本地确定性规则检出；ai = 模型交叉比对检出 */
  source: 'rule' | 'ai'
  /** AI 核验该问题时引用的真实搜索来源链接（可点击核验） */
  evidenceUrl?: string
}

/** 校验 Agent 对单条市场断言的实时核验结果（用于置信度 grounding 计算） */
export interface ClaimVerification {
  /** 被核验的断言，如「杭州 Java 后端 3 年经验市场月薪 25-40K」 */
  claim: string
  /** confirmed=与搜索证据一致；partly=部分一致/有偏差；contradicted=与证据矛盾 */
  verdict: 'confirmed' | 'partly' | 'contradicted'
  /** 核验依据链接（实时搜索结果） */
  url?: string
}

export interface RiskCorrection {
  routeId?: string
  routeName: string
  severity: IssueSeverity
  suggestion: string
}

export interface SandboxValidation {
  /** 置信度 0~100 */
  confidenceScore: number
  checksPassed: number
  checksTotal: number
  issues: ValidationIssue[]
  /** 市场动态更新提示（沙盘结论与最新市场相比需要注意的变化） */
  marketUpdates: string[]
  /** 赛道风险修正建议 */
  riskCorrections: RiskCorrection[]
  summary: string
  source: AppMode
  validatedAt: string
  /** 经实时搜索外部核验的断言数量（0 表示未做外部核验，置信度不含 grounding 权重） */
  groundedChecks?: number
  /** 逐条断言的核验结果，供置信度计算与 UI 展示 */
  verifications?: ClaimVerification[]
}

// ============ 适配器入参 ============

export interface ResearchInput {
  profile: UserProfile
  sandbox: {
    routes: CareerRoute[]
    summary: string
    horizon: number
  }
}

export interface ValidationInput {
  profile: UserProfile
  sandbox: {
    routes: CareerRoute[]
    summary: string
    horizon: number
  }
  research: MarketResearchReport
}
