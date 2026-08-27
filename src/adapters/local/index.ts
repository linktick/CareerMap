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
import { findTemplate } from './growthTemplates'
import { levelToInvolution } from '@/utils/format'
import {
  extrapolateLongCycle,
  localRunMarketResearch,
  localValidateSandbox,
} from './research'
import type {
  MarketResearchReport,
  ResearchInput,
  ResearchStepState,
  ResumeParseResult,
  SandboxValidation,
  ValidationInput,
} from '@/types/research'

// 简单确定性字符串 hash，用来产生稳定的扰动
function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

/**
 * 城市薪资系数表（以新一线 = 1.0 为锚点，与 dataset.ts 的基础薪资区间对齐）。
 * 数据依据：2024–2025 年各大招聘平台（脉脉/猎聘/BOSS）城镇职工平均工资及互联网/
 * 金融/制造业岗位薪酬报告，结合生活成本与岗位密度综合估算。数据集里的基础薪资
 * （如初级前端 10–16K）大致对应成都/武汉的市场水平，故新一线取 1.0。
 *
 * 分层说明：
 * - 港澳：香港整体薪酬显著高于内地，澳门博彩/文旅外的岗位溢价小于香港
 * - 北京/上海/深圳：互联网、金融、硬科技总部集中，明显高于广州
 * - 广州：传统商贸+部分互联网，整体略低于北上深
 * - 杭州（互联网）、苏州（制造业/外资）：高于普通新一线
 * - 新一线：成都、武汉、南京等 13 城，岗位密度与薪资接近
 * - 强二线：长三角/珠三角制造业强市及发达省会，薪资约为新一线 9 折
 * - 普通二线及强三线：约为新一线 8 折
 * - 其余地级市/县城：约为新一线 7 折
 */
const CITY_FACTORS: Record<string, number> = {
  // 港澳
  '香港': 1.35,
  '澳门': 1.15,
  // 一线头部
  '北京': 1.15,
  '上海': 1.15,
  '深圳': 1.15,
  // 一线
  '广州': 1.05,
  // 强新一线（高于普通新一线）
  '杭州': 1.08,
  '苏州': 1.05,
  // 新一线（baseline = 1.0）
  '成都': 1.0,
  '武汉': 1.0,
  '南京': 1.0,
  '长沙': 1.0,
  '重庆': 1.0,
  '天津': 1.0,
  '合肥': 1.0,
  '青岛': 1.0,
  '西安': 1.0,
  '宁波': 1.0,
  '东莞': 1.0,
  '佛山': 1.0,
  '郑州': 1.0,
  // 强二线 / 经济强市（≈ 新一线 9 折）
  '厦门': 0.95,
  '无锡': 0.92,
  '珠海': 0.92,
  '济南': 0.9,
  '福州': 0.9,
  '常州': 0.9,
  '南通': 0.9,
  '温州': 0.88,
  '大连': 0.88,
  '泉州': 0.85,
  // 普通二线省会 / 强三线（≈ 新一线 8 折）
  '沈阳': 0.82,
  '哈尔滨': 0.78,
  '长春': 0.78,
  '石家庄': 0.8,
  '太原': 0.8,
  '南昌': 0.82,
  '贵阳': 0.8,
  '南宁': 0.8,
  '昆明': 0.8,
  '海口': 0.82,
  '兰州': 0.78,
  '乌鲁木齐': 0.82,
  '呼和浩特': 0.8,
  '烟台': 0.82,
  '潍坊': 0.8,
  '徐州': 0.82,
  '嘉兴': 0.85,
  '绍兴': 0.85,
  '金华': 0.85,
  '台州': 0.82,
  '中山': 0.85,
  '惠州': 0.85,
  '唐山': 0.8,
  '洛阳': 0.78,
  '襄阳': 0.78,
  '宜昌': 0.8,
}

// 默认系数：未在表中列出的地级市/县城（≈ 新一线 7 折）
const DEFAULT_CITY_FACTOR = 0.7

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

function cityFactor(city: string): number {
  if (Object.prototype.hasOwnProperty.call(CITY_FACTORS, city)) {
    return CITY_FACTORS[city]
  }
  // 兜底：用 includes 处理可能出现的"市/区"后缀
  const hit = Object.keys(CITY_FACTORS).find((c) => city.includes(c))
  return hit ? CITY_FACTORS[hit] : DEFAULT_CITY_FACTOR
}

/**
 * 院校层次对 offer 质量（起薪 + 简历过筛率）的影响。
 * - 985 / 硕博：有明显加成
 * - 211：小幅加成
 * - 普通本科：基线
 * - 专科：在部分高门槛赛道被显著折扣
 */
function schoolTierFactor(tier: UserProfile['schoolTier'] | undefined): number {
  switch (tier) {
    case '985':
    case 'master':
      return 1.12
    case 'phd':
      return 1.18
    case '211':
      return 1.05
    case 'overseas':
      return 1.08
    case 'regular':
      return 1.0
    case 'junior':
      return 0.9
    case 'other':
    default:
      return 1.0
  }
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
  // ===== 向导里的目标行业标签 → 展开关键词 =====
  // 这些是向导下拉里的宽泛标签，必须展开才能在专业/行业匹配时命中正确赛道
  '国企/银行': ['国企', '银行', '央企', '金融', '财务', '会计', '体制', '公务员', '事业编', '柜员', '风控', '合规'],
  '金融科技': ['金融', '银行', '支付', '互联网金融', '金融科技', '科技'],
  'AI/大数据': ['人工智能', '算法', '数据', '大模型', '机器学习', 'AI'],
  '硬件/半导体': ['芯片', '半导体', '嵌入式', '硬件', 'IC', '集成电路'],
  '医疗健康': ['医疗', '医药', '健康', '生物', '护理', '临床'],
  '企业服务': ['企业服务', 'SaaS', 'B端', '软件', '服务', '咨询'],
  互联网: ['前端', '后端', '产品', '运营', '软件', '计算机'],
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
  const targetIndustries = profile.targetIndustries

  // 关键词命中：对每个关键词，检查它是否出现在「专业/岗位」「技能」「意向行业」任一字段中（双向匹配）
  let hits = 0
  let majorHits = 0
  let skillHits = 0
  let industryHits = 0
  for (const kw of raw.keywords) {
    const inMajor = keywordMatches(majorOrJob, kw)
    const inSkill = skills.some((s) => keywordMatches(s, kw))
    const inIndustry = targetIndustries.some((ind) => keywordMatches(ind, kw))
    if (inMajor) { hits++; majorHits++ }
    if (inSkill) { hits++; skillHits++ }
    if (inIndustry) { hits++; industryHits++ }
  }
  score += hits * 10

  // 意向行业强命中：用户选了意向行业时，行业相关赛道大幅加分；不相关赛道重罚（避免推荐出完全不相关的方向）
  if (targetIndustries.length > 0) {
    const industryMatched =
      industryHits > 0 ||
      targetIndustries.some(
        (ind) => textMatches(raw.industry, ind) || raw.keywords.some((kw) => keywordMatches(ind, kw))
      )
    if (industryMatched) {
      score += 30 + industryHits * 5
    } else {
      // 行业不相关重罚；如果用户同时填了专业（意向明确），惩罚再加重
      score -= majorOrJob ? 50 : 40
    }
  }

  // 专业/岗位强命中：专业相关赛道大幅加成；填写了专业但完全不相关的赛道重罚
  if (majorOrJob) {
    if (majorHits > 0) {
      score += 15 + majorHits * 5
    } else if (targetIndustries.length === 0) {
      // 用户既没有选行业、专业又完全不沾边——降权，避免推荐出风马牛不相及的方向
      score -= 25
    } else {
      // 用户既填了专业又选了行业，但这条路线两不沾——重罚（之前只在没选行业时才罚，是 bug）
      score -= 30
    }
  }

  // 技能命中小幅加成（不能压过专业/行业相关性）
  if (skillHits > 0) score += skillHits * 3

  // ===== 薪资适配（核心：让期望薪资真正改变路线排序）=====
  const factor = cityFactor(profile.city) * schoolTierFactor(profile.schoolTier)
  const y1Min = raw.stages.year1.salary[0] * factor
  const y1Max = raw.stages.year1.salary[1] * factor
  const y3Max = raw.stages.year3.salary[1] * factor
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

  // 经验加成：已工作用户对命中赛道有额外加分
  if (profile.yearsOfExperience >= 6 && hits > 0) {
    score += 8
  }

  return score
}

function buildRoute(raw: RawRoute, index: number, profile: UserProfile): CareerRoute {
  const cFactor = cityFactor(profile.city)
  const sFactor = schoolTierFactor(profile.schoolTier)
  const factor = cFactor * sFactor
  const hash = hashString(profile.majorOrJob + raw.name + (profile.schoolTier || ''))
  const jitter = (hash % 100) / 100 // 0~0.99

  // 根据身份决定起点：在校生 / 应届 / 已有职场经历，均从 current 开始
  const startIdx = identityStartIndex(profile.identity)
  const allStages = (['current', 'year1', 'year2', 'year3'] as const).map((stageKey) => {
    const s = raw.stages[stageKey]
    const min = Math.round(s.salary[0] * factor * (0.95 + jitter * 0.05))
    const max = Math.round(s.salary[1] * factor * (0.98 + jitter * 0.06))
    return {
      stage: stageKey,
      title: s.title,
      salaryRange: [min, max] as [number, number],
      demandLevel: s.demand,
      bottleneck: s.bottleneck,
      requiredSkills: s.skills,
      certificates: s.certs,
    }
  })

  // 取从起点开始的 4 个节点（不足则回退到 current）
  const stages = allStages.slice(startIdx, startIdx + 4)
  while (stages.length < 4) stages.unshift(allStages[0])

  const matchScore = Math.max(40, Math.min(98, Math.round(scoreRoute(raw, profile))))
  const involutionLevel = levelToInvolution(raw.involutionScore)

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
    pitfalls: [...raw.pitfalls, schoolNote],
    entryCost: raw.entryCost,
    switchDifficulty: raw.switchDifficulty,
    ceiling: raw.ceiling,
    riskLevel: raw.riskLevel,
  }
}

/** 计算路线与用户背景的"原始相关性"——只看专业/技能/行业关键词命中，不掺偏好和薪资 */
function relevanceHits(raw: RawRoute, profile: UserProfile): number {
  const majorOrJob = profile.majorOrJob || ''
  let hits = 0
  for (const kw of raw.keywords) {
    if (keywordMatches(majorOrJob, kw)) hits++
    if (profile.skills.some((s) => keywordMatches(s, kw))) hits++
    if (profile.targetIndustries.some((ind) => keywordMatches(ind, kw))) hits++
  }
  return hits
}

function generateRoutes(input: UserProfile): CareerSandbox {
  const scored = RAW_ROUTES.map((raw, idx) => ({
    raw,
    idx,
    score: scoreRoute(raw, input),
    relevance: relevanceHits(raw, input),
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
  const baseRoutes = top.map((item, i) => buildRoute(item.raw, i, input))

  // 长周期深度推演：把 3 年期路线外推到 8 年（资深→专家→负责人→总监的连贯轨迹）
  const deep = !!input.deepMode
  const horizon = deep ? 8 : 3
  const routes = deep ? baseRoutes.map((r) => extrapolateLongCycle(r, input)) : baseRoutes

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

  const summary =
    `作为一名${identityText}，你所在的${cityText}市场中，${topIndustry}方向与你的背景（${
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
  const tpl = findTemplate(route)
  const factor = cityFactor(profile.city) * schoolTierFactor(profile.schoolTier)
  const targetSalary: [number, number] = [
    Math.round(tpl.targetSalary[0] * factor),
    Math.round(tpl.targetSalary[1] * factor),
  ]

  const months = tpl.months.map((m, i) => {
    const learningTasks: LearningTask[] = m.learningTasks.map((task) => {
      const isReview = profile.skills.some((s) => task.toLowerCase().includes(s.toLowerCase()))
      return {
        task,
        done: false,
        type: isReview ? ('review' as const) : ('new' as const),
      }
    })
    return {
      month: i + 1,
      theme: m.theme,
      learningTasks,
      practiceProjects: m.practiceProjects,
      jobActions: m.jobActions,
      certPrep: m.certPrep,
      keyReminder: m.keyReminder,
    }
  })

  return {
    routeId: route.id,
    routeName: route.name,
    targetRole: tpl.targetRole,
    goalSummary: tpl.goalSummary,
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
    const scale = (s: [number, number]): [number, number] => [
      Math.round(s[0] * factor),
      Math.round(s[1] * factor),
    ]
    return {
      track: raw.name,
      industry: raw.industry,
      city: city || '未指定（按全国基准 0.7 系数）',
      cityFactor: Number(factor.toFixed(2)),
      startSalaryK: scale(raw.stages.current.salary),
      year1SalaryK: scale(raw.stages.year1.salary),
      year3SalaryK: scale(raw.stages.year3.salary),
      note: '本地内置数据集参考值（非实时数据），需与实时搜索结果交叉验证',
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
