// 职途星图 - 核心数据类型定义
// AI 返回与本地模拟器返回都必须满足此结构

export type AppMode = 'ai' | 'local'

export type Identity = 'student' | 'fresh' | 'professional'

export type RiskPreference = 'conservative' | 'neutral' | 'aggressive'

export type InvolutionLevel = 'low' | 'medium' | 'high'

export type Stage =
  | 'current'
  | 'year1'
  | 'year2'
  | 'year3'
  | 'year4'
  | 'year5'
  | 'year6'
  | 'year7'
  | 'year8'

export type RelocateChoice = boolean | 'tier1' | 'new_tier1'

export type SchoolTier =
  | '985'        // 985 院校
  | '211'        // 211 院校（非 985）
  | 'regular'    // 普通本科
  | 'junior'     // 专科/高职
  | 'master'     // 硕士（985/211）
  | 'phd'        // 博士
  | 'overseas'   // 海外院校
  | 'other'      // 其他 / 不愿透露

export interface UserProfile {
  identity: Identity
  majorOrJob: string
  city: string
  schoolTier: SchoolTier
  yearsOfExperience: number
  targetIndustries: string[]
  preferences: string[]
  acceptRelocate: RelocateChoice
  acceptOvertime: boolean
  maxOvertimeHours: number
  minSalaryK: number
  riskPreference: RiskPreference
  skills: string[]
  /** 长周期深度推演：false=3 年期；true=5~8 年超长周期连贯路线 */
  deepMode?: boolean
  /** 简历视觉解析结果（上传简历后自动填充） */
  resume?: import('./research').ResumeParseResult | null
}

export interface RouteNode {
  stage: Stage
  title: string
  salaryRange: [number, number]
  demandLevel: number
  bottleneck: string
  requiredSkills: string[]
  certificates: string[]
}

export interface SalaryPoint {
  stage: Stage
  min: number
  max: number
}

export interface CareerRoute {
  id: string
  name: string
  summary: string
  industry: string
  involutionLevel: InvolutionLevel
  involutionScore: number
  matchScore: number
  nodes: RouteNode[]
  salaryCurve: SalaryPoint[]
  pitfalls: string[]
  entryCost: number
  switchDifficulty: number
  ceiling: string
  riskLevel: number
}

export interface CareerSandbox {
  routes: CareerRoute[]
  summary: string
  generatedAt?: string
  mode?: AppMode
  /** 推演年限：3 = 常规 3 年期；5~8 = 长周期深度推演 */
  horizon?: number
  /** 推演后自动执行的链式市场调研报告 */
  research?: import('./research').MarketResearchReport | null
  /** 沙盘事实校验 / 自洽性检查结果 */
  validation?: import('./research').SandboxValidation | null
}

export interface LearningTask {
  task: string
  done: boolean
  type: 'new' | 'review'
}

export interface MonthPlan {
  month: number
  theme: string
  learningTasks: LearningTask[]
  practiceProjects: string[]
  jobActions: string
  certPrep: string
  keyReminder: string
}

export interface GrowthPlan {
  routeId: string
  routeName: string
  targetRole: string
  goalSummary: string
  targetSalary: [number, number]
  months: MonthPlan[]
}

export interface CompareRow {
  routeId: string
  entryCost: number
  threeYearSalaryMax: number
  involution: number
  switchDifficulty: number
  ceiling: string
  riskLevel: number
  matchScore: number
}

export interface CompareResult {
  comparison: CompareRow[]
  advice: string
}

export interface HistoryRecord {
  id: string
  createdAt: string
  mode: AppMode
  profile: UserProfile
  sandbox: CareerSandbox
  selectedRouteId?: string
}

export interface CareerAdapter {
  readonly name: AppMode
  generateRoutes(input: UserProfile): Promise<CareerSandbox>
  generateGrowthPlan(input: {
    profile: UserProfile
    route: CareerRoute
  }): Promise<GrowthPlan>
  compareRoutes(input: {
    profile: UserProfile
    routes: CareerRoute[]
  }): Promise<CompareResult>
  /** 简历图片视觉解析：识别学历、技能、工作/项目经历、短板并回填画像参数 */
  parseResume(input: {
    imageDataUrl: string
    fileName?: string
  }): Promise<import('./research').ResumeParseResult>
  /** Agent 链式深度市场调研（任务拆解 → JD → 招聘动态 → 热度 → 舆情 → 风险 → 汇总） */
  runMarketResearch(
    input: import('./research').ResearchInput,
    onStep?: (step: import('./research').ResearchStepState) => void
  ): Promise<import('./research').MarketResearchReport>
  /** 对整套沙盘做事实校验、交叉比对与自洽性检查 */
  validateSandbox(
    input: import('./research').ValidationInput
  ): Promise<import('./research').SandboxValidation>
}
