import type {
  CareerAdapter,
  CareerRoute,
  CareerSandbox,
  CompareResult,
  GrowthPlan,
  LearningTask,
  UserProfile,
} from '@/types/career'
import { RAW_ROUTES, type RawRoute } from './dataset'
import { findTemplate, buildAdvancedTailMonths } from './growthTemplates'
import { levelToInvolution } from '@/utils/format'
import {
  localRunMarketResearch,
  localValidateSandbox,
} from './research'
import {
  aiRouteRelevant,
  BAND_ENTRY_YEARS,
  bandAtYears,
  bottleneckFor,
  cityBandFactor,
  cityBandFactorMid,
  cityFactor,
  experienceYears,
  isExamPrepRoute,
  relevantYears,
  riskForRoute,
  salaryCurveFor,
  schoolTierFactors,
  seniorBandFor,
} from './benchmark'
import type {
  MarketResearchReport,
  ResearchInput,
  ResearchStepState,
  ResumeParseResult,
  SandboxValidation,
  ValidationInput,
} from '@/types/research'

// 城市薪资系数 / 学历系数 / 行业风险参数统一由写实基准库 benchmark.ts 提供
// （cityFactor、schoolTierFactors、riskForRoute 等），此处不再重复维护。

// 用于"异地工作意愿"筛选：tier1 = 一线+港澳；new_tier1 = 再加新一线/强新一线
const TIER1_CITIES = ['北京', '上海', '深圳', '广州', '香港', '澳门']
const NEW_TIER1_CITIES = [
  '杭州', '苏州', '成都', '武汉', '南京', '长沙', '重庆', '天津',
  '合肥', '青岛', '西安', '宁波', '东莞', '佛山', '郑州',
]
function cityMatches(city: string, accept: UserProfile['acceptRelocate']): boolean {
  if (accept === true) return true
  if (accept === false) return false
  if (accept === 'tier1') {
    return TIER1_CITIES.some((c) => city.includes(c))
  }
  if (accept === 'new_tier1') {
    return [...TIER1_CITIES, ...NEW_TIER1_CITIES].some((c) => city.includes(c))
  }
  return true
}

/**
 * 院校层次对薪资的综合系数（排序打分为单值场景使用）。
 * 实际薪资计算用 benchmark.schoolTierFactors 的非对称 [下限,上限] 系数；
 * 这里取二者均值用于评分等近似场景。
 */
function schoolTierFactor(tier: UserProfile['schoolTier'] | undefined): number {
  const [lo, hi] = schoolTierFactors(tier)
  return (lo + hi) / 2
}

/**
 * 身份（在校生 / 应届 / 已有职场经历）决定起点阶段。
 * 在校生与应届从 current 开始；已有职场经历的用户从 current 起步，
 * 以"当前状态 + 未来 3 年"的视角推演。
 */
function identityStartIndex(identity: UserProfile['identity']): number {
  switch (identity) {
    case 'student':
    case 'fresh':
    case 'professional':
    default:
      return 0
  }
}

/** 判断两段文本是否语义相关：双向子串匹配（忽略大小写）。
 *  例：用户意向"电商" 能命中关键词"电商运营"；用户专业"电子商务"能命中关键词"电商"。 */
function textMatches(a: string, b: string): boolean {
  const x = a.toLowerCase().trim()
  const y = b.toLowerCase().trim()
  if (!x || !y) return false
  return x.includes(y) || y.includes(x)
}

/**
 * 专业/行业同义词归一化。
 * 解决子串匹配的盲区：例如"电子商务"并不连续包含"电商"（中间隔了"子"），
 * 直接 includes 会漏匹配，导致学电商却被推前端。这里把常见写法展开为规范关键词。
 */
const ALIASES: Record<string, string[]> = {
  电子商务: ['电商'],
  电商: ['电子商务', '电商运营', '店铺运营'],
  网店: ['电商', '店铺运营'],
  软件工程: ['软件', '计算机', '后端', '前端'],
  计算机: ['软件', '后端', '前端'],
  软件开发: ['软件', '后端', '前端'],
  人工智能: ['算法', 'AI', '大模型', '机器学习'],
  机器学习: ['算法', 'AI', '人工智能'],
  会计: ['财务', '会计'],
  财务管理: ['财务', '会计'],
  金融: ['财务', '银行', '金融科技'],
  市场营销: ['市场', '营销', '运营', '品牌'],
  人力资源: ['人力', 'HR', '人事'],
  机械: ['嵌入式', '硬件', '自动化'],
  自动化: ['嵌入式', '硬件'],
  电子信息: ['嵌入式', '硬件', '通信'],
  通信工程: ['嵌入式', '硬件', '通信'],
  视觉传达: ['UI', '设计', '视觉', '工业设计'],
  数字媒体: ['UI', '设计', '新媒体', '短视频', '影视'],
  播音主持: ['直播', '主播', '短视频', '影视'],
  新闻传播: ['新媒体', '内容运营', '市场', '影视'],
  汉语言文学: ['新媒体', '内容运营', '市场', '教师', '编辑'],
  英语: ['跨境电商', '外贸', '教育', '培训'],
  商务英语: ['跨境电商', '外贸'],
  国际贸易: ['跨境电商', '外贸', '供应链'],
  物流管理: ['物流', '供应链', '采购'],
  工业工程: ['供应链', '制造', '机械'],
  机械工程: ['机械', '制造', '工业设计'],
  机械设计: ['机械', '制造', '工业设计'],
  材料: ['新能源', '半导体', '芯片', '制造'],
  电气: ['嵌入式', '新能源', '自动化', '硬件'],
  电气工程: ['嵌入式', '新能源', '自动化', '硬件'],
  土木工程: ['建筑', '施工', '工程'],
  工程管理: ['建筑', '工程', '供应链'],
  建筑学: ['建筑', '设计', '工业设计'],
  临床医学: ['医疗', '医生', '临床'],
  护理学: ['护士', '医疗', '护理'],
  药学: ['医疗', '医药', '药企'],
  法学: ['法律', '律师', '法务'],
  师范: ['教师', '教育', '培训'],
  教育学: ['教师', '教育', '培训'],
  学前教育: ['教师', '教育', '培训'],
  汉语言: ['新媒体', '教师', '编辑', '内容运营'],
  广告学: ['市场', '营销', '品牌', '新媒体'],
  广播电视: ['影视', '编导', '新媒体', '短视频'],
  编导: ['影视', '编导', '短视频', '新媒体'],
  动画: ['影视', '游戏', '设计', 'UI'],
  游戏设计: ['游戏', '策划', '设计'],
  集成电路: ['芯片', '半导体', 'IC', '验证'],
  微电子: ['芯片', '半导体', 'IC', '嵌入式'],
  光电信息: ['芯片', '半导体', '硬件', '嵌入式'],
  能源与动力: ['新能源', '制造', '机械'],
  新能源材料: ['新能源', '电池', '制造'],
  产品设计: ['工业设计', '设计', '产品'],
  环境设计: ['工业设计', '设计', '建筑'],
  工商管理: ['销售', '市场', '运营', '供应链', '咨询'],
  行政管理: ['人力', '行政', '公务员', 'HR'],
  公共事业管理: ['公务员', '事业编', '行政'],
  社会学: ['公务员', '人力', '市场', '咨询'],
  经济学: ['财务', '金融', '咨询', '银行'],
  国际经济: ['外贸', '跨境电商', '咨询', '金融'],
  统计学: ['数据分析', '算法', '咨询'],
  应用数学: ['算法', '数据分析', '芯片'],
  物理学: ['芯片', '半导体', '新能源', '算法'],
  化学: ['新能源', '材料', '医药', '制造'],
  生物医学: ['医疗', '医药', '器械'],
  生物工程: ['医药', '医疗', '新能源'],
  // ===== 向导里的宽泛行业标签（旧版目标行业选项/历史草稿兼容）→ 展开关键词 =====
  // 这些是宽泛行业词，必须展开才能在专业/行业匹配时命中正确赛道；
  // 新版向导已改为细分「目标岗位」，岗位名可直接命中路线关键词/路线名
  '国企/银行': ['国企', '银行', '央企', '金融', '财务', '会计', '体制', '公务员', '事业编', '柜员', '风控', '合规'],
  '金融科技': ['金融', '银行', '支付', '互联网金融', '金融科技', '科技'],
  'AI/大数据': ['人工智能', '算法', '数据', '大模型', '机器学习', 'AI'],
  '硬件/半导体': ['芯片', '半导体', '嵌入式', '硬件', 'IC', '集成电路'],
  '医疗健康': ['医疗', '医药', '健康', '生物', '护理', '临床'],
  '企业服务': ['企业服务', 'SaaS', 'B端', '软件', '服务', '咨询'],
  互联网: ['前端', '后端', '产品', '运营', '软件', '计算机'],
  // ===== 目标岗位手动输入/岗位选项中的常见叫法 → 展开关键词 =====
  // 注意：别名展开走的是双向子串匹配，这里不要放「前端」这类短词，
  // 否则会误命中含该子串的跨域关键词（如「数字前端」是芯片岗）。
  // 移动端岗位已直接写入前端路线的 keywords，无需在此展开。
  大数据开发: ['后端', '大数据', 'java', '软件'],
}

function expandAliases(text: string): string[] {
  const extra = new Set<string>()
  for (const [alias, kws] of Object.entries(ALIASES)) {
    if (text.includes(alias)) kws.forEach((k) => extra.add(k))
  }
  return Array.from(extra)
}

/** 带同义词扩展的相关性匹配：text 中任一关键词（含别名）命中 kw 即视为相关 */
function keywordMatches(text: string, kw: string): boolean {
  if (textMatches(text, kw)) return true
  return expandAliases(text).some((alias) => textMatches(alias, kw))
}

function scoreRoute(raw: RawRoute, profile: UserProfile): number {
  let score = 50
  const majorOrJob = profile.majorOrJob || ''
  const skills = profile.skills
  // 字段名沿用 targetIndustries，语义已升级为「目标岗位」（可含具体岗位名/行业方向关键词）
  const targets = profile.targetIndustries

  // 关键词命中：对每个关键词，检查它是否出现在「专业/岗位」「技能」「目标岗位」任一字段中（双向匹配）
  let hits = 0
  let majorHits = 0
  let skillHits = 0
  let industryHits = 0
  for (const kw of raw.keywords) {
    const inMajor = keywordMatches(majorOrJob, kw)
    const inSkill = skills.some((s) => keywordMatches(s, kw))
    const inIndustry = targets.some((ind) => keywordMatches(ind, kw))
    if (inMajor) { hits++; majorHits++ }
    if (inSkill) { hits++; skillHits++ }
    if (inIndustry) { hits++; industryHits++ }
  }
  score += hits * 10

  // 目标岗位强命中：用户选/填了目标岗位时，相关赛道大幅加分；不相关赛道重罚（避免推荐出完全不相关的方向）
  if (targets.length > 0) {
    // 岗位名「点名」路线：用户目标与路线名直接对应（如"前端工程师"→"前端工程师深耕路线"），
    // 这是比行业关键词更强的意向信号，每条点名命中给 18 分（最多计 2 条，防止堆标签）
    const positionNameHits = targets.filter((t) => textMatches(raw.name, t)).length
    const targetMatched =
      positionNameHits > 0 ||
      industryHits > 0 ||
      targets.some(
        (t) => textMatches(raw.industry, t) || raw.keywords.some((kw) => keywordMatches(t, kw))
      )
    if (targetMatched) {
      score += 30 + industryHits * 5 + Math.min(positionNameHits, 2) * 18
    } else {
      // 目标岗位不相关重罚；如果用户同时填了专业（意向明确），惩罚再加重
      score -= majorOrJob ? 50 : 40
    }
  }

  // 专业/岗位强命中：专业相关赛道大幅加成；填写了专业但完全不相关的赛道重罚
  if (majorOrJob) {
    if (majorHits > 0) {
      score += 15 + majorHits * 5
    } else if (targets.length === 0) {
      // 用户既没有选目标岗位、专业又完全不沾边——降权，避免推荐出风马牛不相及的方向
      score -= 25
    } else {
      // 用户既填了专业又选了目标岗位，但这条路线两不沾——重罚（之前只在没选行业时才罚，是 bug）
      score -= 30
    }
  }

  // 技能命中小幅加成（不能压过专业/行业相关性）
  if (skillHits > 0) score += skillHits * 3

  // ===== 薪资适配（核心：让期望薪资真正改变路线排序）=====
  // 城市系数按资历段压缩：year1≈P2(band1)、year3≈P4(band3)，
  // 与沙盘实际展示的薪资曲线同源，避免排序依据与展示数值脱节
  const cF = cityFactor(profile.city)
  const sF = schoolTierFactor(profile.schoolTier)
  const f1 = cityBandFactorMid(cF, 1) * sF
  const f3 = cityBandFactorMid(cF, 3) * sF
  const y1Min = raw.stages.year1.salary[0] * f1
  const y1Max = raw.stages.year1.salary[1] * f1
  const y3Max = raw.stages.year3.salary[1] * f3
  const minSal = profile.minSalaryK || 0

  if (minSal > 0) {
    if (y1Max < minSal * 0.7) {
      // 入职 1 年内顶薪都摸不到期望的 7 成
      if (y3Max < minSal) {
        // 连 3 年天花板都够不着期望 → 这条路根本到不了目标，重罚
        score -= 55
      } else {
        // 3 年后能达到：属于"先苦后甜"的成长型路线，按差距线性惩罚
        score -= Math.min(35, 15 + (minSal - y1Max) * 2)
      }
    } else if (y1Min >= minSal) {
      // 起步薪资即可达到期望 → 达标加分
      score += 12
    } else {
      // 薪资区间横跨期望值：够得着但有门槛，按缺口小幅扣分
      score -= (minSal - y1Min) * 1.2
    }

    // 3 年天花板都够不着期望 → 对长期薪资目标没有价值
    if (y3Max < minSal * 0.9) {
      score -= 30
    } else if (
      y3Max >= minSal * 2 &&
      (profile.preferences.includes('高薪收入') || profile.preferences.includes('长期发展空间'))
    ) {
      // 长期翻倍空间 + 用户看重发展 → 小幅加成
      score += 6
    }
  } else {
    // 用户未填期望薪资：低门槛、高需求岗位小幅加分（帮助先就业）
    if (raw.entryCost <= 2 && raw.stages.year1.demand >= 4) score += 4
  }

  // 低期望（≤5K）：优先好就业、低门槛岗位，惩罚培养周期长的高门槛路线
  if (minSal > 0 && minSal <= 5) {
    if (raw.entryCost <= 2 && raw.stages.year1.demand >= 4) score += 10
    if (raw.entryCost >= 4) score -= 12
  }

  // ===== 偏好（提高权重上限，让偏好能真正撬动排序）=====
  const prefs = profile.preferences
  let prefBonus = 0
  if (prefs.includes('高薪收入')) {
    prefBonus += Math.min(18, (y3Max - 15) * 0.5)
  }
  if (prefs.includes('工作稳定') || prefs.includes('稳定')) {
    prefBonus += (6 - raw.riskLevel) * 3
  }
  if (prefs.includes('低加班')) {
    prefBonus += (10 - raw.involutionScore) * 1.5
  }
  if (prefs.includes('长期发展空间')) {
    prefBonus += y3Max > 25 ? 8 : 0
  }
  if (prefs.includes('创造性')) {
    if (/前端|设计|产品|算法|游戏|市场|品牌|内容|直播|短视频/.test(raw.name + raw.industry)) prefBonus += 6
  }
  if (prefs.includes('社会影响力')) {
    if (/教育|医疗|国企|银行|公务员|事业/.test(raw.industry + raw.name)) prefBonus += 6
  }
  if (prefs.includes('工作自由度')) {
    prefBonus += (raw.riskLevel - 2) * 1.5
  }
  score += Math.min(prefBonus, 35)

  // 风险偏好（加大权重）
  if (profile.riskPreference === 'conservative') {
    score += (6 - raw.riskLevel) * 4
  } else if (profile.riskPreference === 'aggressive') {
    score += (raw.riskLevel - 3) * 4
  }

  // 加班过滤：不接受加班时，高内卷赛道重罚；接受但有小时上限时，按强度软惩罚
  if (!profile.acceptOvertime) {
    if (raw.involutionScore >= 8) score -= 35
    else if (raw.involutionScore >= 6) score -= 12
  } else if (profile.maxOvertimeHours > 0 && profile.maxOvertimeHours < 10) {
    if (raw.involutionScore >= 8) score -= 18
  }

  // 异地意愿：若不接受异地，则对"主要机会集中在一线、本地又够不着期望薪资"的赛道降权
  if (profile.acceptRelocate === false) {
    if (raw.involutionScore >= 7 && y1Min < minSal) {
      score -= 12
    }
  }

  // 院校门槛：高门槛赛道（算法/芯片等）对非 985/211/硕士重罚
  const isHighEducationBar =
    raw.keywords.includes('算法') ||
    raw.keywords.includes('人工智能') ||
    raw.keywords.includes('芯片') ||
    raw.keywords.includes('ic')
  if (isHighEducationBar) {
    const tier = profile.schoolTier
    if (tier === 'junior' || tier === 'regular' || tier === 'other' || tier === undefined) {
      score -= 28
    } else if (tier === '211') {
      score -= 10
    }
  }

  // 经验加成：已工作 6 年以上用户对命中赛道有额外加分（画像字段单位为月，需换算成年）
  if (experienceYears(profile) >= 6 && hits > 0) {
    score += 8
  }

  return score
}

/** 资深段（P5~P7）补充技能：在 year3 顶尖技能之上叠加管理/战略能力 */
const SENIOR_STAGE_SKILLS: Record<number, string[]> = {
  4: ['复杂项目主导', '跨部门协作', '指导初级成员'],
  5: ['团队管理', '技术/业务规划', '人才培养'],
  6: ['战略洞察', '组织建设', '商业决策'],
}

const STAGE_KEYS_3 = ['current', 'year1', 'year2', 'year3'] as const
const STAGE_KEYS_8 = [
  'current', 'year1', 'year2', 'year3', 'year4', 'year5', 'year6', 'year7', 'year8',
] as const

/**
 * 基于写实基准库构建一条路线。
 * 关键点：
 * - 薪资不再用 hash 随机抖动，而是由「资历段基准 × 城市系数 × 学历非对称系数」确定性算出，
 *   并被该路线 P7 硬天花板封顶；
 * - 工作经验真正决定起点段：职场人（尤其同方向）从对应资历段切入，转行者降维到初中级；
 * - 资深段（P5+）的岗位 title / 瓶颈来自基准库（体制/医生/律师等序列有专属瓶颈），
 *   不再所有路线共用一套"总监"文案。
 */
function buildRoute(
  raw: RawRoute,
  index: number,
  profile: UserProfile,
  relevant: boolean
): CareerRoute {
  const deep = !!profile.deepMode
  const nodeCount = deep ? 9 : 4
  const stageKeys = deep ? STAGE_KEYS_8 : STAGE_KEYS_3

  // 起点累计相关经验年数：学生/应届=0；职场人同方向按实际年数，转行降维。
  // 体制内备考路线（公务员/事业编/教师编）例外：往届工龄不抵体制内职级，
  // current 永远是备考期（无收入），year1 才是试用期——有工作经验的转行者
  // 不能被"转行降维"逻辑直接塞进科员/骨干教师节点。
  const startExp = isExamPrepRoute(raw.name, raw.industry)
    ? 0
    : relevantYears(profile, relevant)

  // P1~P4 基准区间取自内置岗位数据集（新一线·普通本科锚点）
  const juniorBands: [number, number][] = STAGE_KEYS_3.map((k) => raw.stages[k].salary)
  // 整条薪资曲线由基准引擎计算（确定性、被天花板约束）
  const curve = salaryCurveFor(
    profile,
    { juniorBands, routeName: raw.name, industry: raw.industry, relevant },
    startExp,
    nodeCount
  )

  const senior = seniorBandFor(raw.name, raw.industry)

  const stages = stageKeys.map((stageKey, i) => {
    const exp = startExp + i
    const { band } = bandAtYears(exp)
    const [min, max] = curve[i]

    let title: string
    let bottleneck: string
    let skills: string[]
    let certs: string[]
    let demand: number

    if (band <= 3) {
      // 初中级段（P1~P4）：直接用内置岗位数据集的岗位/瓶颈/技能/证书
      const s = raw.stages[STAGE_KEYS_3[band as 0 | 1 | 2 | 3]]
      title = s.title
      bottleneck = s.bottleneck
      skills = s.skills
      certs = s.certs
      demand = s.demand
    } else {
      // 资深段（P5~P7）：用基准库的岗位 title 与序列专属瓶颈
      title = senior.titles[band - 4]
      bottleneck = bottleneckFor(senior.track, band)
      skills = [...new Set([...(SENIOR_STAGE_SKILLS[band] || SENIOR_STAGE_SKILLS[6]), ...raw.stages.year3.skills.slice(0, 2)])]
      certs = raw.stages.year3.certs
      // 资深岗 HC 收缩：每升一段需求降 1 档，不低于 1
      demand = Math.max(1, raw.stages.year3.demand - (band - 3))
    }

    return {
      stage: stageKey,
      title,
      salaryRange: [min, max] as [number, number],
      demandLevel: demand,
      bottleneck,
      requiredSkills: skills,
      certificates: certs,
    }
  })

  const matchScore = Math.max(40, Math.min(98, Math.round(scoreRoute(raw, profile))))
  const involutionLevel = levelToInvolution(raw.involutionScore)

  // 行业风险基准注记：把内置风险库中与用户偏好冲突的关键点提示出来
  const risk = riskForRoute(raw.name, raw.industry)
  const riskNotes: string[] = []
  if (risk.aiReplace >= 0.65 && /低加班|稳定|工作稳定/.test(profile.preferences.join(','))) {
    riskNotes.push('该方向初级/执行岗 AI 替代风险较高，需尽早向策略、管理或复合业务方向分流')
  }
  if (risk.agePenalty >= 0.7) {
    riskNotes.push('行业 35 岁分水岭明显，第 5~6 年须完成管理/专家/资源的分流卡位')
  }

  const schoolNote = (() => {
    switch (profile.schoolTier) {
      case '985':
      case 'master':
        return '985/硕士学历在简历筛选中具有明显优势'
      case 'phd':
        return '博士学历在算法/研究类岗位有显著优势'
      case '211':
        return '211 学历基本满足大部分岗位门槛'
      case 'overseas':
        return '海外院校背景在外企/大厂有一定加分'
      case 'junior':
        return '专科学历在大厂校招中处于劣势，建议优先考虑中小型公司或技能密集型岗位'
      case 'regular':
      case 'other':
      default:
        return '普通本科学历，需要靠项目经验和技能弥补院校差距'
    }
  })()

  return {
    id: `route_${index + 1}`,
    name: raw.name,
    summary: raw.summary,
    industry: raw.industry,
    involutionLevel,
    involutionScore: raw.involutionScore,
    matchScore,
    nodes: stages,
    salaryCurve: stages.map((s) => ({
      stage: s.stage,
      min: s.salaryRange[0],
      max: s.salaryRange[1],
    })),
    pitfalls: [...raw.pitfalls, ...riskNotes, schoolNote],
    entryCost: raw.entryCost,
    switchDifficulty: raw.switchDifficulty,
    ceiling: raw.ceiling,
    riskLevel: raw.riskLevel,
  }
}

/** 计算路线与用户背景的"原始相关性"——只看专业/技能/目标岗位关键词命中，不掺偏好和薪资 */
function relevanceHits(raw: RawRoute, profile: UserProfile): number {
  const majorOrJob = profile.majorOrJob || ''
  const targets = profile.targetIndustries
  let hits = 0
  for (const kw of raw.keywords) {
    if (keywordMatches(majorOrJob, kw)) hits++
    if (profile.skills.some((s) => keywordMatches(s, kw))) hits++
    if (targets.some((ind) => keywordMatches(ind, kw))) hits++
  }
  // 目标岗位与路线名直接对应（如"前端工程师"→"前端工程师深耕路线"）：强相关，计 3 次命中，
  // 保证用户点名的岗位路线不会因其他因素被挤出展示位
  if (targets.some((t) => textMatches(raw.name, t))) hits += 3
  return hits
}

/**
 * 路线与用户「已有背景」（专业/当前岗位 + 技能）的相关性——不含目标岗位意向。
 * 用于决定职场人是否"转行降维"：目标岗位只代表意向，不代表已有相关经验，
 * 机械专业应届生/老手转行做前端，仍应从初中级段切入而非按 3 年前端定薪。
 */
function backgroundHits(raw: RawRoute, profile: UserProfile): number {
  const majorOrJob = profile.majorOrJob || ''
  let hits = 0
  for (const kw of raw.keywords) {
    if (keywordMatches(majorOrJob, kw)) hits++
    if (profile.skills.some((s) => keywordMatches(s, kw))) hits++
  }
  return hits
}

function generateRoutes(input: UserProfile): CareerSandbox {
  const scored = RAW_ROUTES.map((raw, idx) => ({
    raw,
    idx,
    score: scoreRoute(raw, input),
    relevance: relevanceHits(raw, input),
    // 仅专业/技能背景命中才算"同方向"，用于转行降维；目标岗位意向不计入
    background: backgroundHits(raw, input),
  })).sort((a, b) => b.score - a.score)

  // 选取展示的 4 条路线：
  // 1. 相关赛道按分数降序排前；
  // 2. 但如果一条相关赛道因薪资硬门槛被打到很低分（<25），说明它够不着用户的期望薪资，
  //    用分数更高的其他赛道补位，避免"全是达不到薪资期望的相关路线"这种无效结果；
  // 3. 零相关赛道只在相关赛道不足或分数被打穿时按分数补位。
  const relevant = scored.filter((s) => s.relevance > 0)
  const irrelevant = scored.filter((s) => s.relevance === 0)
  const viableRelevant = relevant.filter((s) => s.score >= 25)
  const top = [...viableRelevant, ...irrelevant, ...relevant.filter((s) => s.score < 25)].slice(0, 4)
  top.sort((a, b) => b.score - a.score)
  // 背景相关性决定职场人是否"转行降维"：同方向路线按实际经验定起点，
  // 转行路线（仅目标岗位命中、专业/技能不沾边）从初中级切入
  const baseRoutes = top.map((item, i) => buildRoute(item.raw, i, input, item.background > 0))

  // 长周期深度推演：buildRoute 已直接按资历段基准生成 9 个节点（current + year1~8），
  // 资深段薪资被 P7 天花板封顶、岗位 title/瓶颈走基准库，无需再做指数外推
  const deep = !!input.deepMode
  const horizon = deep ? 8 : 3
  const routes = baseRoutes

  const identityText = {
    student: '在校生',
    fresh: '应届毕业生',
    professional: '有职场规划需求的人',
  }[input.identity]

  const cityText = input.city
  const topIndustry = routes[0]?.industry || '通用'
  const topRoute = routes[0]
  const terminalCurve = topRoute?.salaryCurve[topRoute.salaryCurve.length - 1]
  const salaryTop = terminalCurve?.max ?? 0
  const salaryStart = topRoute?.salaryCurve[0]
    ? Math.round((topRoute.salaryCurve[0].min + topRoute.salaryCurve[0].max) / 2)
    : 0
  const minSal = input.minSalaryK || 0
  const yearText = deep ? '8 年' : '3 年'

  // 薪资诊断文案：根据期望薪资与推荐路线的实际可达区间动态生成
  let salaryNote = ''
  if (minSal > 0) {
    if (salaryStart >= minSal) {
      salaryNote = `你期望的 ${minSal}K/月在首选路线起步阶段即可达到，`
    } else if (salaryTop >= minSal) {
      salaryNote = `你期望的 ${minSal}K/月需要在首选路线上积累若干年才能达到，`
    } else {
      salaryNote = `在${cityText}市场、你当前背景下，推荐路线${yearText}内稳定达到 ${minSal}K/月有一定压力，建议同时考虑提升学历/技能或放宽城市，`
    }
  }

  const overtimeNote = !input.acceptOvertime
    ? '由于你不接受加班，已自动降低高内卷赛道权重。'
    : input.maxOvertimeHours < 10
    ? `你每周最多接受 ${input.maxOvertimeHours} 小时加班，高强度赛道已被降权。`
    : ''
  const relocateNote =
    input.acceptRelocate === false
      ? '你不接受异地工作，机会范围将集中在' + cityText + '本地。'
      : input.acceptRelocate === 'tier1'
      ? '你仅接受一线城市机会。'
      : input.acceptRelocate === 'new_tier1'
      ? '你仅接受一线/新一线城市机会。'
      : ''

  // 用户显式填写了目标岗位时，概览中点名回应（强化"推演围绕你的目标岗位展开"的感知）
  const targetText = input.targetIndustries.length
    ? `围绕你目标的${input.targetIndustries.map((t) => `「${t}」`).join('、')}岗位，`
    : ''

  const summary =
    `作为一名${identityText}，你所在的${cityText}市场中，${targetText}${topIndustry}方向与你的背景（${
      input.majorOrJob || '未填写专业'
    }）匹配度最高，起步薪资约 ${salaryStart}K/月，${yearText}薪资上限约 ${salaryTop}K/月。` +
    (deep ? '本次为 8 年长周期深度推演，第 5~6 年是管理/专家分岔关键期。' : '') +
    salaryNote +
    (overtimeNote ? overtimeNote : '') +
    (relocateNote ? relocateNote : '') +
    '建议同时准备 2 条路线，避免单押。'

  return { routes, summary, horizon }
}

function generateGrowthPlan(input: { profile: UserProfile; route: CareerRoute }): GrowthPlan {
  const { route, profile } = input
  const text = route.name + route.industry
  const isTeacherRoute = /教师|老师|教培|师范|教学|教师编|教招|特岗|支教|幼师/.test(text)
  const examPrep = isExamPrepRoute(route.name, route.industry)

  const tpl = findTemplate(route)

  // 已持有教师资格证（技能/简历经历中体现）：跳过考证阶段，直接从教招备考开始
  const backgroundText = [
    profile.majorOrJob || '',
    ...(profile.skills || []),
    ...(profile.resume?.workExperience || []),
  ].join(' ')
  const hasTeacherCert = isTeacherRoute && /教师资格|教资|教师证/.test(backgroundText)
  const useCertified = hasTeacherCert && !!tpl.certifiedMonths
  const baseMonths = useCertified ? tpl.certifiedMonths! : tpl.months
  const baseGoal = useCertified && tpl.certifiedGoalSummary ? tpl.certifiedGoalSummary : tpl.goalSummary

  // 计划起点：
  // - 体制内备考（公务员/事业编）与教师考证考编路线：备考从零开始，往届工龄不抵考编；
  // - 普通职场路线：按已有「相关」工作年限跳过入门月份，不足 12 个月用进阶月份补齐，
  //   不能让工作多年的人再从"了解岗位是什么"的第一个月学起。
  const relevant = aiRouteRelevant(route.name, route.industry, profile)
  const expYears = examPrep || isTeacherRoute ? 0 : relevantYears(profile, relevant)
  const { band } = bandAtYears(expYears)
  // 各资历段跳过的入门月数：P1(0年)=0，P2(1~2年)=3，P3(3~4年)=6，P4(5~6年)=8，P5+=9
  const skipTable = [0, 3, 6, 8, 9, 9, 9]
  const skip =
    examPrep || isTeacherRoute
      ? 0
      : Math.min(skipTable[band], Math.max(0, baseMonths.length - 3))

  let monthTpls = baseMonths.slice(skip)
  if (skip > 0) {
    // 有经验者：模板尾部的"应届求职月"（简历/面试/谈薪/入职）与进阶月份的
    // 完整节奏重复且顺序错位，剔除后由进阶月份统一承接（进阶月以能力建设开头、
    // 以跳槽/晋升收尾，顺序才对）
    const JOB_HUNT_THEME_RE = /简历|面试|谈薪|offer|入职|投递|求职|找工作/
    monthTpls = monthTpls.filter((m) => !JOB_HUNT_THEME_RE.test(m.theme))
  }
  if (monthTpls.length < 12) {
    monthTpls = [...monthTpls, ...buildAdvancedTailMonths(route, 12 - monthTpls.length)]
  }

  // 目标岗位/薪资：零基础沿用模板目标（≈中级）；有经验者对齐 12 个月后（year1 节点）
  // 的资历段——route.nodes 已按用户实际工作年限定薪，直接取第二个节点即可
  const factor = cityBandFactorMid(cityFactor(profile.city), 2) * schoolTierFactor(profile.schoolTier)
  let targetRole = tpl.targetRole
  let goalSummary = baseGoal
  let targetSalary: [number, number] = [
    Math.round(tpl.targetSalary[0] * factor),
    Math.round(tpl.targetSalary[1] * factor),
  ]
  if (!examPrep && !isTeacherRoute && band >= 1 && route.nodes.length > 1) {
    // 目标对齐「下一次晋升」资历段：找到达到下一档位所需年数对应的节点
    // （route.nodes 第 i 个节点 = 起点经验 + i 年），比机械取 year1 更贴近真实晋升节奏
    const nextBandEntry = BAND_ENTRY_YEARS[Math.min(band + 1, 6)]
    const targetIndex = Math.max(
      1,
      Math.min(nextBandEntry - expYears, route.nodes.length - 1)
    )
    const targetNode = route.nodes[targetIndex]
    targetRole = targetNode.title
    targetSalary = [targetNode.salaryRange[0], targetNode.salaryRange[1]]
    goalSummary = `结合你 ${expYears} 年相关工作经验，12 个月内补齐向「${targetNode.title}」进阶的短板，完成晋升或跳槽涨薪`
  }

  // 已掌握技能（用户填写的技能 + 当前资历节点要求的技能）→ 相关任务标 review
  const knownSkills = new Set(
    [
      ...(profile.skills || []),
      ...(route.nodes[0]?.requiredSkills || []),
    ]
      .map((s) => s.toLowerCase())
      .filter((s) => s.length >= 2)
  )

  const months = monthTpls.map((m, i) => {
    const learningTasks: LearningTask[] = m.learningTasks.map((task) => {
      const lower = task.toLowerCase()
      const isReview = Array.from(knownSkills).some((s) => lower.includes(s))
      return {
        task,
        done: false,
        type: isReview ? ('review' as const) : ('new' as const),
      }
    })
    let keyReminder = m.keyReminder
    // 在职备考提示（仅第一个月追加一次）
    if (i === 0 && profile.identity === 'professional') {
      if (examPrep) {
        keyReminder += ' 在职备考不建议裸辞：工作日每天保证 2~3 小时有效学习、周末整块时间刷套卷，收入断了心态更容易崩。'
      } else if (isTeacherRoute) {
        keyReminder += ' 在职备考别裸辞：教学/带班经验本身就是面试资产，把每天的工作当成试讲与结构化练习。'
      }
    }
    return {
      month: i + 1,
      theme: m.theme,
      learningTasks,
      practiceProjects: m.practiceProjects,
      jobActions: m.jobActions,
      certPrep: m.certPrep,
      keyReminder,
    }
  })

  return {
    routeId: route.id,
    routeName: route.name,
    targetRole,
    goalSummary,
    targetSalary,
    months,
  }
}

function compareRoutes(input: { routes: CareerRoute[]; profile: UserProfile }): CompareResult {
  const { routes, profile } = input
  // 终点薪资：常规模式取 year3，长周期模式取路线最后一个阶段
  const terminalMax = (r: CareerRoute) => r.salaryCurve[r.salaryCurve.length - 1]?.max ?? 0
  const horizon = routes[0]?.salaryCurve ? routes[0].salaryCurve.length - 1 : 3
  const yearLabel = horizon >= 5 ? `${horizon} 年` : '3 年'
  const comparison = routes.map((r) => ({
    routeId: r.id,
    entryCost: r.entryCost,
    threeYearSalaryMax: terminalMax(r),
    involution: Math.ceil(r.involutionScore / 2),
    switchDifficulty: r.switchDifficulty,
    ceiling: r.ceiling,
    riskLevel: r.riskLevel,
    matchScore: r.matchScore,
  }))

  const sorted = [...routes].sort((a, b) => b.matchScore - a.matchScore)
  const stablePick = [...routes].sort((a, b) => a.riskLevel - b.riskLevel)[0]
  const salaryPick = [...routes].sort(
    (a, b) => terminalMax(b) - terminalMax(a)
  )[0]

  const pref = profile.preferences
  let advice = ''
  if (pref.includes('高薪收入')) {
    advice += `如果你最看重高薪：${salaryPick.name} ${yearLabel}薪资上限可达 ${terminalMax(salaryPick)}K，但其内卷评分 ${salaryPick.involutionScore}/10、风险 ${salaryPick.riskLevel}/5，需要承受相应压力。\n\n`
  }
  if (
    pref.includes('工作稳定') ||
    pref.includes('稳定') ||
    profile.riskPreference === 'conservative'
  ) {
    advice += `如果你最看重稳定：${stablePick.name} 在风险与加班维度表现最好，但天花板为"${stablePick.ceiling}"，薪资上限相对有限。\n\n`
  }
  advice += `综合匹配度最高的是 ${sorted[0].name}（${sorted[0].matchScore} 分），各维度无明显短板。\n\n`
  if (!profile.acceptOvertime) {
    advice += '注意：你选择了不接受加班，高内卷赛道已被降权，但实际 offer 的加班情况仍需在面试中确认。\n\n'
  }
  if (profile.acceptRelocate === false) {
    advice += `你不接受异地工作，推荐结果已偏向${profile.city}本地机会；若本地机会有限，可考虑远程或周边城市。\n\n`
  }
  advice +=
    '风险提示：以上建议基于市场公开 JD 数据与你的输入生成，城市、行业周期、个人能力与运气都会显著影响实际结果。建议结合兴趣、身体状况与家庭情况综合决策，不要单凭数据选择职业。'

  return { comparison, advice }
}

/**
 * 本地确定性薪资锚点：供 Agent 的 salary_benchmark 工具调用。
 * 基于内置 RAW_ROUTES 数据集（参考 2024–2025 年脉脉/猎聘/BOSS 薪酬报告估算）
 * × 城市薪资系数，给出岗位在指定城市的起薪/1 年/3 年薪资区间，
 * 作为模型薪资断言的「本地事实锚」，与实时搜索结果交叉对照。
 */
export function localSalaryBenchmark(city: string, jobKeyword: string) {
  const factor = cityFactor(city || '')
  const kw = (jobKeyword || '').trim()
  const scored = RAW_ROUTES.map((raw) => {
    let hit = 0
    if (kw) {
      for (const k of raw.keywords) if (keywordMatches(kw, k)) hit++
      if (textMatches(kw, raw.name)) hit += 2
      if (textMatches(kw, raw.industry)) hit++
    }
    return { raw, hit }
  })
    .filter((x) => x.hit > 0)
    .sort((a, b) => b.hit - a.hit)
    .slice(0, 3)

  const matches = scored.map(({ raw }) => {
    // 各资历段分别套用随资历压缩的城市系数：低线城市资深岗天花板塌缩远大于起薪
    const scaleBand = (s: [number, number], band: 0 | 1 | 3 | 4 | 6): [number, number] => [
      Math.round(s[0] * cityBandFactor(factor, band, 'min')),
      Math.round(s[1] * cityBandFactor(factor, band, 'max')),
    ]
    // 资深段天花板锚点（P5~P7），帮助模型判断高薪断言是否离谱
    const senior = seniorBandFor(raw.name, raw.industry)
    return {
      track: raw.name,
      industry: raw.industry,
      city: city || '未指定（按全国三四线基准 0.62 系数）',
      cityFactor: Number(factor.toFixed(2)),
      startSalaryK: scaleBand(raw.stages.current.salary, 0),
      year1SalaryK: scaleBand(raw.stages.year1.salary, 1),
      year3SalaryK: scaleBand(raw.stages.year3.salary, 3),
      // P5（资深，约 7~9 年）/ P7（总监·专家，约 13 年+）薪资区间
      seniorSalaryK: scaleBand(senior.bands[0], 4),
      ceilingSalaryK: scaleBand(senior.bands[2], 6),
      note: '本地内置薪资基准（非实时数据，参考薪酬报告估算），资深段已按城市等级压缩，需与实时搜索结果交叉验证；超出 ceilingSalaryK 的薪资断言基本不可信',
    }
  })

  return {
    queried: { city: city || '', jobKeyword: kw },
    matched: matches.length,
    matches,
  }
}

export const localAdapter: CareerAdapter = {
  name: 'local',
  async generateRoutes(input: UserProfile): Promise<CareerSandbox> {
    // 模拟一下延迟，让 loading 动画可见
    await new Promise((r) => setTimeout(r, 1500))
    return generateRoutes(input)
  },
  async generateGrowthPlan(input: {
    profile: UserProfile
    route: CareerRoute
  }): Promise<GrowthPlan> {
    await new Promise((r) => setTimeout(r, 800))
    return generateGrowthPlan(input)
  },
  async compareRoutes(input: {
    profile: UserProfile
    routes: CareerRoute[]
  }): Promise<CompareResult> {
    await new Promise((r) => setTimeout(r, 500))
    return compareRoutes(input)
  },
  async parseResume(): Promise<ResumeParseResult> {
    // 本地模式没有视觉模型，无法识别图片；明确引导用户切换在线 AI 模式
    throw new Error(
      '简历图片视觉解析需要在线 AI 模式（本地模拟器无法识别图片）。请在右上角切换到「在线 AI 推演」，并确认后端配置了视觉模型（如 doubao-vision / qwen-vl）。'
    )
  },
  async runMarketResearch(
    input: ResearchInput,
    onStep?: (step: ResearchStepState) => void
  ): Promise<MarketResearchReport> {
    return localRunMarketResearch(input, onStep)
  },
  async validateSandbox(input: ValidationInput): Promise<SandboxValidation> {
    await new Promise((r) => setTimeout(r, 400))
    return localValidateSandbox(input)
  },
}

// 暴露内部函数供单元测试 / 调试 / 示例数据使用
export const __localInternals = {
  scoreRoute,
  buildRoute,
  schoolTierFactor,
  cityFactor,
  identityStartIndex,
  cityMatches,
  generateRoutes,
  generateGrowthPlan,
}
