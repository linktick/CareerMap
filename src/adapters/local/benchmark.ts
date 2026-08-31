// 写实基准数据库 + 约束引擎
// ============================================================
// 本地模拟器的「事实层」。离线推演时优先读取本文件的基准数据做确定性计算，
// 再交给上层生成文案；AI 模式下也用本文件对模型返回的数值做钳制，杜绝离谱值。
//
// 数据来源（2024–2026 年公开口径综合估算，非精确统计，仅作规划参考）：
//   - 国家统计局城镇单位就业人员平均工资（分行业、分地区）
//   - 脉脉《人才迁徙报告》、猎聘《中高端人才报告》、BOSS 直聘薪酬观察
//   - 各省考/国考录用公示、医院/高校公开招聘待遇、券商/咨询行业薪酬披露
// 所有薪资单位均为「税前 K/月」，基准锚点 = 新一线城市（成都/武汉等）普通本科、
// 正常绩效、中位数公司；城市/学历/个体差异通过系数在基准上调整。
//
// 三类基准库：
//   1. 薪资基准  SENIOR_BANDS（P5~P7 资深段）+ RAW_ROUTES（P1~P4 初中级段）
//   2. 行业风险参数 RISK_PROFILES（裁员/AI 替代/政策/周期/35 岁/晋升放缓）
//   3. 岗位瓶颈库 SENIOR_BOTTLENECKS + GENERIC_BOTTLENECK（按资历段的真实卡点）

import type { UserProfile } from '@/types/career'
import { RAW_ROUTES } from './dataset'

// ------------------------------------------------------------
// 资历段（Seniority Band）
// 职业发展按「段位」而非自然年份推进：晋升通常每 2 年左右一档，
// 同一段位内薪资随经验在 [min,max] 区间内从低位向高位移动。
// P1~P4 的区间直接取自 RAW_ROUTES（current/year1/year2/year3），
// P5~P7 在下方 SENIOR_BANDS 中补齐（这是原来缺失、导致长周期外推离谱的根源）。
// ------------------------------------------------------------
export type SeniorityBand = 0 | 1 | 2 | 3 | 4 | 5 | 6 // P1..P7 下标

/** 各段位对应的「累计相关工作经验年数」门槛 */
export const BAND_ENTRY_YEARS = [0, 1, 3, 5, 7, 10, 13] as const

export type TrackType =
  | 'tech'      // 技术/工程/研发专业线
  | 'business'  // 运营/市场/产品/职能等经营管理线
  | 'gov'       // 公务员/事业编
  | 'medical'   // 医疗医药
  | 'legal'     // 法律/咨询专业服务
  | 'sales'     // 销售/商务（提成驱动，方差大）
  | 'content'   // 内容/直播/影视（项目制，方差大）
  | 'design'    // 设计/创意专业线

export type RiskKey =
  | 'internet'
  | 'ai'
  | 'finance'
  | 'semiconductor'
  | 'manufacture'
  | 'gov'
  | 'medical'
  | 'legal'
  | 'consulting'
  | 'construction'
  | 'content'
  | 'ecom'
  | 'sales'
  | 'logistics'
  | 'design'

interface SeniorBandEntry {
  /** 用路线名包含的关键词匹配（路线名高度差异化，命中即用） */
  nameIncludes: string[]
  track: TrackType
  risk: RiskKey
  /** P5 / P6 / P7 三档薪资区间（K/月，新一线·普通本科锚点） */
  bands: [[number, number], [number, number], [number, number]]
  /** P5 / P6 / P7 三档岗位 title */
  titles: [string, string, string]
}

/**
 * 资深段（P5~P7）薪资与岗位基准。
 * 说明：销售/直播/咨询/法律合伙人等档位含提成/分红/股权激励，方差极大，
 * 区间宽度刻意拉大；体制内/教师/客服等序列天花板低，区间明显压缩。
 */
export const SENIOR_BANDS: SeniorBandEntry[] = [
  { nameIncludes: ['前端'], track: 'tech', risk: 'internet',
    bands: [[32, 48], [40, 60], [50, 72]],
    titles: ['资深前端工程师', '前端技术专家', '前端架构师/前端负责人'] },
  { nameIncludes: ['后端'], track: 'tech', risk: 'internet',
    bands: [[35, 52], [45, 66], [55, 80]],
    titles: ['资深后端工程师', '后端架构师', '架构师/技术负责人'] },
  { nameIncludes: ['算法'], track: 'tech', risk: 'ai',
    bands: [[50, 80], [65, 105], [80, 130]],
    titles: ['高级算法专家', '算法负责人/资深科学家', '算法总监/首席科学家'] },
  { nameIncludes: ['数据分析'], track: 'tech', risk: 'internet',
    bands: [[27, 42], [36, 56], [45, 68]],
    titles: ['资深数据分析师', '数据专家/分析负责人', '数据总监/业务分析负责人'] },
  { nameIncludes: ['互联网产品经理', '电商产品经理'], track: 'business', risk: 'internet',
    bands: [[34, 52], [44, 65], [55, 80]],
    titles: ['资深产品经理', '产品专家/产品总监', '产品总监/业务负责人'] },
  { nameIncludes: ['互联网运营'], track: 'business', risk: 'internet',
    bands: [[23, 36], [30, 48], [38, 60]],
    titles: ['运营经理', '高级运营经理', '运营总监/业务负责人'] },
  { nameIncludes: ['国企银行科技'], track: 'tech', risk: 'finance',
    bands: [[24, 34], [30, 44], [38, 55]],
    titles: ['技术骨干/项目经理', '部门技术主管', '部门经理/技术总监'] },
  { nameIncludes: ['测试开发', '测试'], track: 'tech', risk: 'internet',
    bands: [[27, 40], [33, 50], [40, 62]],
    titles: ['资深测开工程师', '测试架构师', '质量负责人/测试总监'] },
  { nameIncludes: ['运维', 'DevOps'], track: 'tech', risk: 'internet',
    bands: [[29, 45], [38, 56], [45, 68]],
    titles: ['资深 SRE/DevOps 专家', '基础设施架构师', '基础设施负责人'] },
  { nameIncludes: ['UI/UX', 'UI'], track: 'design', risk: 'design',
    bands: [[25, 38], [32, 50], [38, 60]],
    titles: ['资深设计师', '设计专家', '设计总监/设计负责人'] },
  { nameIncludes: ['嵌入式'], track: 'tech', risk: 'semiconductor',
    bands: [[29, 44], [37, 55], [45, 66]],
    titles: ['资深嵌入式工程师', '嵌入式专家/系统架构师', '硬件系统架构师/研发经理'] },
  { nameIncludes: ['B 端销售', '销售'], track: 'sales', risk: 'sales',
    bands: [[30, 70], [45, 100], [60, 150]],
    titles: ['销售经理/大客户经理', '高级销售经理', '销售总监/大区负责人'] },
  { nameIncludes: ['电商运营路线', '电商运营'], track: 'business', risk: 'ecom',
    bands: [[25, 42], [33, 52], [42, 66]],
    titles: ['电商运营经理', '高级运营经理', '电商运营总监/品牌合伙人'] },
  { nameIncludes: ['直播', '短视频电商'], track: 'content', risk: 'content',
    bands: [[35, 80], [50, 120], [65, 160]],
    titles: ['直播负责人/资深操盘手', 'MCN 负责人/品牌自播负责人', '头部主播/直播业务合伙人'] },
  { nameIncludes: ['市场营销', '市场'], track: 'business', risk: 'internet',
    bands: [[26, 44], [35, 56], [44, 70]],
    titles: ['市场经理/品牌经理', '高级市场经理', '市场总监/CMO'] },
  { nameIncludes: ['人力资源', 'HR'], track: 'business', risk: 'internet',
    bands: [[22, 34], [28, 46], [35, 55]],
    titles: ['HR 经理/HRBP 负责人', 'HRD/组织发展负责人', 'CHO/人力行政总监'] },
  { nameIncludes: ['财务', '会计'], track: 'business', risk: 'finance',
    bands: [[24, 38], [31, 50], [40, 62]],
    titles: ['财务经理', '财务高级经理/财务总监', '财务总监/CFO'] },
  { nameIncludes: ['游戏策划', '游戏'], track: 'business', risk: 'internet',
    bands: [[30, 48], [40, 60], [48, 72]],
    titles: ['资深策划/主策划', '制作人/策划负责人', '游戏制作人/工作室负责人'] },
  { nameIncludes: ['教师', '教培'], track: 'gov', risk: 'gov',
    bands: [[18, 30], [23, 38], [28, 48]],
    titles: ['骨干教师/教研主管', '学科带头人/教研负责人', '分校负责人/教学总监'] },
  { nameIncludes: ['医疗', '医药'], track: 'medical', risk: 'medical',
    bands: [[24, 40], [32, 55], [40, 70]],
    titles: ['主治医师/药企医学经理', '副主任医师/医学总监', '主任医师/药企医学负责人'] },
  { nameIncludes: ['律师', '法务'], track: 'legal', risk: 'legal',
    bands: [[30, 60], [45, 90], [60, 160]],
    titles: ['资深律师/法务经理', '授薪合伙人/法务总监', '权益合伙人/法务负责人'] },
  { nameIncludes: ['建筑', '土木'], track: 'tech', risk: 'construction',
    bands: [[23, 36], [29, 45], [36, 55]],
    titles: ['项目工程师/专业负责人', '项目经理/设计负责人', '项目总监/总监理工程师'] },
  { nameIncludes: ['机械设计', '机械'], track: 'tech', risk: 'manufacture',
    bands: [[22, 33], [27, 42], [34, 52]],
    titles: ['资深设计工程师', '技术主管/研发经理', '研发总监/总工程师'] },
  { nameIncludes: ['新能源'], track: 'tech', risk: 'manufacture',
    bands: [[29, 44], [37, 55], [45, 68]],
    titles: ['资深工程师/技术专家', '研发/工艺负责人', '技术总监/研发负责人'] },
  { nameIncludes: ['跨境电商', '外贸'], track: 'business', risk: 'ecom',
    bands: [[25, 40], [32, 52], [42, 68]],
    titles: ['跨境业务主管', '跨境业务经理', '跨境业务负责人/独立站创始人'] },
  // 注意：仓储条目必须排在「供应链/物流」之前——仓储路线名含「物流管理」，
  // 若先命中供应链条目会错用供应链总监档薪资（仓储经理实际封顶低得多）
  { nameIncludes: ['仓储'], track: 'business', risk: 'logistics',
    bands: [[13, 21], [16, 26], [19, 32]],
    titles: ['仓储经理', '物流运营经理', '区域物流负责人'] },
  { nameIncludes: ['供应链', '物流', '采购'], track: 'business', risk: 'logistics',
    bands: [[21, 33], [27, 43], [33, 55]],
    titles: ['供应链/采购经理', '高级供应链经理', '供应链总监/采购总监'] },
  { nameIncludes: ['公务员', '事业编'], track: 'gov', risk: 'gov',
    bands: [[15, 24], [18, 30], [22, 38]],
    titles: ['正科级/业务骨干', '副处级/部门中层', '处级干部/单位负责人'] },
  { nameIncludes: ['新媒体', '内容创作', '自媒体'], track: 'content', risk: 'content',
    bands: [[26, 48], [35, 62], [45, 90]],
    titles: ['内容负责人/资深主理人', '内容总监', '内容总监/个人 IP 创始人'] },
  { nameIncludes: ['影视', '编导'], track: 'content', risk: 'content',
    bands: [[25, 42], [33, 55], [42, 70]],
    titles: ['资深导演/制作主管', '导演/制片人', '制作总监/内容负责人'] },
  { nameIncludes: ['芯片', 'IC'], track: 'tech', risk: 'semiconductor',
    bands: [[44, 68], [58, 90], [70, 120]],
    titles: ['资深 IC 工程师/专家', 'IC 架构师/技术负责人', 'IC 研发总监/首席工程师'] },
  { nameIncludes: ['工业', '产品设计师'], track: 'design', risk: 'manufacture',
    bands: [[21, 33], [27, 43], [33, 52]],
    titles: ['资深产品设计师', '设计主管/设计专家', '设计总监/产品设计负责人'] },
  { nameIncludes: ['电商客服', '客服'], track: 'business', risk: 'ecom',
    bands: [[10, 16], [12, 20], [15, 26]],
    titles: ['客服主管', '客户体验经理', '客服中心负责人/转岗运营'] },
  { nameIncludes: ['电商视觉', '美工'], track: 'design', risk: 'ecom',
    bands: [[16, 25], [20, 31], [25, 38]],
    titles: ['资深电商设计师', '电商设计主管', '电商设计主管/品牌视觉负责人'] },
  { nameIncludes: ['广告投放', '投放'], track: 'business', risk: 'ecom',
    bands: [[24, 38], [32, 50], [40, 65]],
    titles: ['投放经理/增长负责人', '增长经理/投放总监', '增长负责人/营销总监'] },
  { nameIncludes: ['选品', '商品运营'], track: 'business', risk: 'ecom',
    bands: [[21, 32], [26, 42], [32, 52]],
    titles: ['品类经理', '高级品类经理', '品类总监/商品负责人'] },
  { nameIncludes: ['银行', '金融业务'], track: 'business', risk: 'finance',
    bands: [[19, 32], [26, 44], [34, 58]],
    titles: ['团队主管/支行部门负责人', '支行副行长/部门总经理', '支行行长/区域负责人'] },
  { nameIncludes: ['风控', '合规'], track: 'business', risk: 'finance',
    bands: [[24, 38], [32, 50], [40, 65]],
    titles: ['风控/合规经理', '风控高级经理', '风控总监/首席风险官'] },
  { nameIncludes: ['咨询', '行业研究', '行研'], track: 'legal', risk: 'consulting',
    // 头部 MBB/顶级投行咨询集中在北京上海（合伙人 150K+），新一线多为二线咨询/
    // 行研/四大咨询，锚点取后者；一线经 1.15 系数后仍能覆盖头部机构水平
    bands: [[40, 68], [55, 95], [75, 140]],
    titles: ['项目经理/资深顾问', '董事/研究总监', '合伙人/战略负责人'] },
]

/** 各 track 类型的兜底资深段（路线未命中上表时使用，数值取保守中位） */
const FALLBACK_SENIOR: Record<TrackType, { bands: SeniorBandEntry['bands']; titles: [string, string, string] }> = {
  tech: { bands: [[27, 42], [36, 56], [45, 70]], titles: ['资深工程师', '技术专家', '技术总监/架构师'] },
  business: { bands: [[22, 36], [29, 47], [36, 58]], titles: ['业务经理', '高级经理', '业务总监/负责人'] },
  gov: { bands: [[14, 24], [18, 30], [22, 40]], titles: ['业务骨干/中层副职', '部门中层', '单位/部门负责人'] },
  medical: { bands: [[24, 40], [31, 52], [40, 68]], titles: ['中级职称骨干', '副高/部门负责人', '正高/专业负责人'] },
  legal: { bands: [[27, 52], [40, 75], [55, 130]], titles: ['资深专业人士', '部门负责人', '合伙人/总监'] },
  sales: { bands: [[26, 50], [40, 75], [55, 120]], titles: ['销售经理', '高级销售经理', '销售总监/大区负责人'] },
  content: { bands: [[24, 42], [33, 55], [44, 78]], titles: ['资深内容负责人', '内容总监', '内容总监/创始人'] },
  design: { bands: [[21, 34], [28, 46], [35, 58]], titles: ['资深设计师', '设计专家', '设计总监/设计负责人'] },
}

/** 判断路线的 track 类型（用于兜底匹配与文案） */
export function trackTypeOf(routeName: string, industry = ''): TrackType {
  const text = routeName + industry
  if (/公务员|事业编|教师|教培/.test(text)) return 'gov'
  if (/医疗|医药|医生|护士|临床/.test(text)) return 'medical'
  if (/律师|法务|法律|咨询|行研|行业研究/.test(text)) return 'legal'
  if (/销售|BD|商务/.test(text)) return 'sales'
  if (/直播|短视频|影视|编导|新媒体|内容|自媒体/.test(text)) return 'content'
  // 设计线需在 business 之前判定（"电商视觉/美工""产品设计师"同时含电商/产品关键词）
  if (/设计|UI|UX|美工|视觉|创意/.test(text)) return 'design'
  if (/运营|市场|品牌|产品|HR|人力|行政|财务|客服|电商|投放|选品|商品|供应链|采购|仓储|银行|风控|合规/.test(text)) return 'business'
  return 'tech'
}

/** 找到路线对应的资深段基准（命中关键词，否则按 track 兜底） */
export function seniorBandFor(routeName: string, industry = ''): SeniorBandEntry & { fallback: boolean } {
  for (const e of SENIOR_BANDS) {
    if (e.nameIncludes.some((k) => routeName.includes(k) || industry.includes(k))) {
      return { ...e, fallback: false }
    }
  }
  const track = trackTypeOf(routeName, industry)
  const fb = FALLBACK_SENIOR[track]
  return {
    nameIncludes: [],
    track,
    risk: track === 'tech' ? 'internet' : track === 'business' ? 'internet' : (track as RiskKey),
    bands: fb.bands,
    titles: fb.titles,
    fallback: true,
  }
}

/** 通用初中级兜底基准（路线未命中内置岗位数据集时使用，新一线·普通本科锚点） */
const FALLBACK_JUNIOR_BANDS: [number, number][] = [
  [5, 9],   // P1 实习/助理
  [8, 14],  // P2 初级
  [12, 21], // P3 中级
  [17, 30], // P4 高级
]

const JUNIOR_STAGE_KEYS = ['current', 'year1', 'year2', 'year3'] as const

/** 按关键词重叠度把路线名/行业匹配到最接近的内置岗位赛道（得分 <2 视为未命中） */
export function matchRawRoute(
  routeName: string,
  industry = ''
): (typeof RAW_ROUTES)[number] | null {
  const text = (routeName + ' ' + industry).toLowerCase()
  let best: (typeof RAW_ROUTES)[number] | null = null
  let bestScore = 0
  for (const raw of RAW_ROUTES) {
    let score = 0
    for (const kw of raw.keywords) {
      const k = kw.toLowerCase()
      if (k.length >= 2 && text.includes(k)) score += k.length >= 3 ? 2 : 1
    }
    // 路线名高度命中（如模型返回"前端工程师路线"）给强权重
    const nameHead = raw.name.slice(0, 2)
    if (nameHead && routeName.includes(nameHead)) score += 3
    if (score > bestScore) {
      bestScore = score
      best = raw
    }
  }
  return best && bestScore >= 2 ? best : null
}

/**
 * 解析路线名/行业对应的 P1~P4 薪资基准（来自内置岗位数据集 RAW_ROUTES）。
 * 用关键词重叠度匹配最接近的内置赛道；命中返回该赛道的 4 段区间，未命中返回通用兜底。
 */
export function juniorBandsFor(routeName: string, industry = ''): {
  juniorBands: [number, number][]
  matched: boolean
} {
  const best = matchRawRoute(routeName, industry)
  if (best) {
    return {
      juniorBands: JUNIOR_STAGE_KEYS.map((k) => best.stages[k].salary),
      matched: true,
    }
  }
  return { juniorBands: FALLBACK_JUNIOR_BANDS, matched: false }
}

/** 初中级段（P1~P4）的岗位 title/瓶颈/技能/需求基准（来自内置岗位数据集），未命中返回 null */
export function juniorStageFor(routeName: string, industry: string, band: SeniorityBand) {
  if (band > 3) return null
  const raw = matchRawRoute(routeName, industry)
  if (!raw) return null
  const stage = raw.stages[JUNIOR_STAGE_KEYS[band as 0 | 1 | 2 | 3]]
  return {
    title: stage.title,
    bottleneck: stage.bottleneck,
    skills: stage.skills,
    certs: stage.certs,
    demand: stage.demand,
  }
}

// ------------------------------------------------------------
// 城市薪资系数（以新一线 = 1.0 为锚点，与 RAW_ROUTES 基础薪资对齐）
// 依据：2024–2025 各地城镇职工平均工资 + BOSS/职友集/猎聘分城市岗位薪酬报告
//
// 重要：这里的系数是「初中级岗」的城市系数。资深岗（P5+）的城市折算是
// 非线性的——低线城市的高端岗位极度稀缺（本地企业没有专家/总监 HC，
// 资深人才也往往被一线虹吸），薪资天花板塌缩得比起薪狠得多
// （见 cityBandFactor）。因此本表只刻画"起薪/初中级"层面的城市差异。
// ------------------------------------------------------------
const CITY_FACTORS: Record<string, number> = {
  // ===== 港澳 / 一线 =====
  '香港': 1.35, '澳门': 1.15,
  '北京': 1.15, '上海': 1.15, '深圳': 1.15,
  '广州': 1.05,
  // ===== 新一线 / 强二线（锚点 = 1.0）=====
  '杭州': 1.08,
  '成都': 1.0, '武汉': 1.0, '南京': 1.0, '长沙': 1.0, '重庆': 1.0, '天津': 1.0,
  '合肥': 1.0, '青岛': 1.0, '西安': 1.0, '郑州': 1.0, '苏州': 1.0,
  '宁波': 0.95, '东莞': 0.88, '佛山': 0.85,
  // ===== 二线 / 强三线 =====
  '厦门': 0.92, '无锡': 0.9, '珠海': 0.9,
  '济南': 0.85, '福州': 0.85, '常州': 0.85, '南通': 0.85,
  '温州': 0.8, '大连': 0.8,
  '嘉兴': 0.8, '绍兴': 0.8, '金华': 0.8,
  '泉州': 0.72, '台州': 0.78, '徐州': 0.78, '中山': 0.78, '惠州': 0.78, '扬州': 0.78,
  '沈阳': 0.75, '南昌': 0.75, '海口': 0.75, '乌鲁木齐': 0.75, '烟台': 0.75,
  '石家庄': 0.72, '太原': 0.72, '贵阳': 0.72, '南宁': 0.72, '昆明': 0.72,
  '呼和浩特': 0.72, '宜昌': 0.72,
  '唐山': 0.7, '潍坊': 0.7, '哈尔滨': 0.7, '长春': 0.7, '兰州': 0.7, '洛阳': 0.7, '襄阳': 0.7,
  '银川': 0.7, '柳州': 0.7,
  // ===== 广东地市 =====
  '汕头': 0.68, '肇庆': 0.66, '江门': 0.68, '湛江': 0.65, '清远': 0.65,
  '茂名': 0.62, '韶关': 0.62, '阳江': 0.62,
  '梅州': 0.6, '汕尾': 0.6, '河源': 0.6, '潮州': 0.6, '揭阳': 0.6, '云浮': 0.6,
  // ===== 江苏地市 =====
  '镇江': 0.75, '泰州': 0.72, '盐城': 0.7, '淮安': 0.66, '连云港': 0.66, '宿迁': 0.62,
  // ===== 浙江地市 =====
  '湖州': 0.72, '舟山': 0.72, '衢州': 0.65, '丽水': 0.62,
  // ===== 山东地市 =====
  '淄博': 0.72, '威海': 0.72, '东营': 0.72, '济宁': 0.68, '泰安': 0.66, '日照': 0.66, '滨州': 0.66,
  '临沂': 0.66, '德州': 0.64, '聊城': 0.64, '枣庄': 0.62, '菏泽': 0.6,
  // ===== 四川地市 =====
  '绵阳': 0.72, '德阳': 0.68, '宜宾': 0.66, '攀枝花': 0.66,
  '自贡': 0.62, '泸州': 0.62, '乐山': 0.62, '南充': 0.62, '眉山': 0.62, '遂宁': 0.6, '内江': 0.6,
  '广安': 0.6, '达州': 0.6, '雅安': 0.6,
  '广元': 0.58, '阿坝': 0.58, '甘孜': 0.6, '巴中': 0.56, '凉山': 0.56,
  // ===== 湖北地市 =====
  '黄石': 0.68, '十堰': 0.65, '荆门': 0.66, '鄂州': 0.66, '孝感': 0.65, '荆州': 0.65,
  '随州': 0.62, '黄冈': 0.6, '咸宁': 0.6, '恩施': 0.58,
  // ===== 湖南地市 =====
  '株洲': 0.7, '湘潭': 0.68, '岳阳': 0.66, '衡阳': 0.65, '常德': 0.65,
  '张家界': 0.6, '益阳': 0.6, '郴州': 0.6, '娄底': 0.6,
  '邵阳': 0.58, '永州': 0.58, '怀化': 0.58, '湘西': 0.56,
  // ===== 河南地市 =====
  '许昌': 0.66, '开封': 0.65, '新乡': 0.65, '焦作': 0.64,
  '平顶山': 0.62, '安阳': 0.62, '南阳': 0.62, '三门峡': 0.62, '济源': 0.66,
  '濮阳': 0.6, '漯河': 0.6, '信阳': 0.6, '鹤壁': 0.6,
  '商丘': 0.58, '周口': 0.58, '驻马店': 0.58,
  // ===== 河北地市 =====
  '廊坊': 0.72, '保定': 0.66, '秦皇岛': 0.66, '沧州': 0.65,
  '邯郸': 0.62, '张家口': 0.62,
  '邢台': 0.6, '衡水': 0.6, '承德': 0.6,
  // ===== 福建地市（莆田：鞋业/医疗民营经济为主，白领技术岗容量小）=====
  '漳州': 0.66, '龙岩': 0.65, '宁德': 0.65,
  '莆田': 0.62, '三明': 0.62, '南平': 0.6,
  // ===== 安徽地市 =====
  '芜湖': 0.72, '马鞍山': 0.68,
  '蚌埠': 0.65, '滁州': 0.66,
  '淮南': 0.62, '淮北': 0.62, '安庆': 0.62, '黄山': 0.62, '池州': 0.62, '六安': 0.62, '宣城': 0.64,
  '铜陵': 0.66, '阜阳': 0.6, '宿州': 0.6, '亳州': 0.58,
  // ===== 江西地市 =====
  '九江': 0.66,
  '景德镇': 0.62, '萍乡': 0.62, '鹰潭': 0.62, '赣州': 0.62, '上饶': 0.62, '新余': 0.65,
  '吉安': 0.6, '宜春': 0.6, '抚州': 0.6,
  // ===== 辽宁地市 =====
  '盘锦': 0.68, '营口': 0.64, '鞍山': 0.62, '辽阳': 0.6, '锦州': 0.6,
  '抚顺': 0.58, '本溪': 0.58, '丹东': 0.58, '朝阳': 0.58, '葫芦岛': 0.58,
  '阜新': 0.56, '铁岭': 0.56,
  // ===== 吉林地市 =====
  '吉林': 0.66, '延边': 0.62, '松原': 0.6, '四平': 0.6,
  '辽源': 0.58, '通化': 0.58, '白山': 0.58, '白城': 0.56,
  // ===== 黑龙江地市 =====
  '大庆': 0.68, '齐齐哈尔': 0.6, '佳木斯': 0.58, '牡丹江': 0.58,
  '鸡西': 0.56, '双鸭山': 0.56, '伊春': 0.56, '七台河': 0.56, '黑河': 0.56, '绥化': 0.56,
  '鹤岗': 0.52, '大兴安岭': 0.58,
  // ===== 山西地市 =====
  '晋城': 0.68, '朔州': 0.66, '大同': 0.64, '长治': 0.64, '晋中': 0.64,
  '阳泉': 0.6, '运城': 0.6, '忻州': 0.6, '临汾': 0.6, '吕梁': 0.62,
  // ===== 陕西地市 =====
  '榆林': 0.72, '宝鸡': 0.65, '咸阳': 0.64, '延安': 0.66,
  '铜川': 0.6, '渭南': 0.6, '汉中': 0.6, '安康': 0.58, '商洛': 0.58,
  // ===== 广西地市 =====
  '桂林': 0.65, '北海': 0.66,
  '梧州': 0.6, '钦州': 0.6, '玉林': 0.6, '防城港': 0.62,
  '贵港': 0.58, '贺州': 0.58, '来宾': 0.58,
  '百色': 0.56, '河池': 0.56, '崇左': 0.56,
  // ===== 云南地市 =====
  '玉溪': 0.66, '曲靖': 0.62, '大理': 0.62, '丽江': 0.6, '普洱': 0.6, '西双版纳': 0.6, '楚雄': 0.6, '德宏': 0.6, '怒江': 0.6, '迪庆': 0.6,
  '保山': 0.58, '昭通': 0.58, '红河': 0.58, '临沧': 0.56, '文山': 0.56,
  // ===== 贵州地市 =====
  '遵义': 0.64, '六盘水': 0.62, '安顺': 0.6, '黔南': 0.6,
  '毕节': 0.56, '铜仁': 0.56, '黔西南': 0.58, '黔东南': 0.58,
  // ===== 甘肃地市 =====
  '嘉峪关': 0.66, '酒泉': 0.62, '金昌': 0.62,
  '白银': 0.6, '张掖': 0.6, '庆阳': 0.6,
  '天水': 0.58, '武威': 0.56, '平凉': 0.56, '定西': 0.56, '陇南': 0.56, '临夏': 0.56, '甘南': 0.58,
  // ===== 青海地市 =====
  '西宁': 0.68, '海西': 0.66,
  '海东': 0.6, '海北': 0.6, '黄南': 0.62, '海南': 0.6, '果洛': 0.6, '玉树': 0.62,
  // ===== 海南地市 =====
  '三亚': 0.68, '儋州': 0.6, '三沙': 0.6,
  // ===== 内蒙古地市 =====
  '鄂尔多斯': 0.75, '包头': 0.68,
  '乌海': 0.62, '阿拉善盟': 0.62, '赤峰': 0.6, '通辽': 0.6, '呼伦贝尔': 0.6,
  '巴彦淖尔': 0.6, '锡林郭勒盟': 0.6, '乌兰察布': 0.58, '兴安盟': 0.58,
  // ===== 宁夏地市 =====
  '石嘴山': 0.62, '吴忠': 0.6, '中卫': 0.58, '固原': 0.56,
  // ===== 新疆地市 =====
  '克拉玛依': 0.7, '昌吉': 0.66, '巴音郭楞': 0.62, '哈密': 0.62, '伊犁': 0.62,
  '吐鲁番': 0.6, '博尔塔拉': 0.6, '阿克苏': 0.6, '塔城': 0.6, '阿勒泰': 0.62,
  '克孜勒苏': 0.58, '喀什': 0.58, '和田': 0.56,
  // ===== 西藏地市（体制内/援藏补贴抬高账面工资）=====
  '拉萨': 0.72, '阿里': 0.66, '日喀则': 0.62, '昌都': 0.6, '林芝': 0.62, '山南': 0.62, '那曲': 0.62,
  // ===== 台湾地区（按人民币 K/月口径折算）=====
  '台北': 0.95, '新北': 0.85, '桃园': 0.78, '台中': 0.75, '高雄': 0.7, '台南': 0.68,
}
/** 未收录城市（手动输入/县级市）默认按普通三四线地级市处理 */
const DEFAULT_CITY_FACTOR = 0.62

export function cityFactor(city: string): number {
  if (!city) return DEFAULT_CITY_FACTOR
  if (Object.prototype.hasOwnProperty.call(CITY_FACTORS, city)) return CITY_FACTORS[city]
  const hit = Object.keys(CITY_FACTORS).find((c) => city.includes(c))
  return hit ? CITY_FACTORS[hit] : DEFAULT_CITY_FACTOR
}

/**
 * 城市系数随资历段的非线性压缩。
 *
 * 现实依据：一线/新一线的薪资优势集中在中高端岗位。三四线城市：
 *   - 初级岗约为新一线的 60%~70%（本地最低工资与服务业价格托底，差距不算悬殊）；
 *   - 但 P5 资深/专家、P6/P7 总监级岗位在本地几乎不存在——本地企业没有这类 HC，
 *     付不出、也不需要这份薪水，资深人才要么被一线虹吸、要么转行做管理/生意。
 *     实际薪资只有锚点城市的 35%~50%。
 * 若对所有段位统一乘城市系数，小城市会算出"测试总监 40K""架构师 50K"
 * 这种当地根本不存在的岗位薪资。故 f<1 时，系数随 band 指数收紧：
 *   factor(band) = f ^ (1 + band/6 × k)
 * f>=1（一线/新一线）不压缩——高端岗位供给充足，城市溢价在资深段反而更大。
 *
 * @param side 'min' 压缩较弱（低薪端有刚性），'max' 压缩较强（高薪端在小城市塌缩）
 */
export function cityBandFactor(
  f: number,
  band: SeniorityBand,
  side: 'min' | 'max'
): number {
  if (f >= 1) return f
  const k = side === 'max' ? 1.15 : 0.7
  return Math.pow(f, 1 + (band / 6) * k)
}

/** 某资历段城市系数的下限/上限均值（评分、成长方案目标薪资等单值场景使用） */
export function cityBandFactorMid(f: number, band: SeniorityBand): number {
  return (cityBandFactor(f, band, 'min') + cityBandFactor(f, band, 'max')) / 2
}

/**
 * 学历对薪资的非对称影响：[下限系数, 上限系数]。
 * - 名校/高学历：起薪与上限都有加成（上限加成更大，因为能进大厂/核心岗）
 * - 专科：起薪小幅折扣，上限明显折扣（难进头部平台，天花板更低）
 */
export function schoolTierFactors(tier: UserProfile['schoolTier'] | undefined): [number, number] {
  switch (tier) {
    case 'phd': return [1.10, 1.30]
    case '985':
    case 'master': return [1.05, 1.18]
    case 'overseas': return [1.03, 1.12]
    case '211': return [1.02, 1.08]
    case 'junior': return [0.92, 0.82]
    case 'regular':
    case 'other':
    default: return [1.0, 1.0]
  }
}

// ------------------------------------------------------------
// 行业风险参数库
// 所有维度 0~1，越高越「强/严重」。由规则引擎用于：
//   - 路线风险分、排序扣分、风险文案
//   - 长周期薪资增速（高风险/高成长 vs 稳定/低成长）
//   - 35 岁、AI 替代等预警
// ------------------------------------------------------------
export interface IndustryRisk {
  key: RiskKey
  label: string
  layoffProne: number    // 裁员/业务收缩敏感度
  aiReplace: number     // 初级/执行岗被 AI 替代风险
  policyRisk: number    // 政策监管/体制波动风险
  cycleVolatility: number // 行业周期波动（产能/融资/预算）
  agePenalty: number    // 35 岁分水岭严重度
  salaryGrowth: number  // 长期薪资成长性
  stability: number     // 稳定性（越高越稳）
  /** 晋升/涨薪明显放缓的起始资历段（P 下标），到达后增速递减 */
  slowdownBand: SeniorityBand
  notes: string[]
}

export const RISK_PROFILES: Record<RiskKey, IndustryRisk> = {
  internet: {
    key: 'internet', label: '互联网/软件',
    layoffProne: 0.7, aiReplace: 0.6, policyRisk: 0.3, cycleVolatility: 0.7,
    agePenalty: 0.8, salaryGrowth: 0.8, stability: 0.4, slowdownBand: 4,
    notes: ['业务线调整频繁，HC 随预算收缩，35 岁后纯执行岗安全感下降', '初级编码/测试/运营工作正被 AI 工具压缩，需向架构/业务/复合方向走'],
  },
  ai: {
    key: 'ai', label: 'AI/算法',
    layoffProne: 0.5, aiReplace: 0.3, policyRisk: 0.3, cycleVolatility: 0.6,
    agePenalty: 0.6, salaryGrowth: 0.95, stability: 0.4, slowdownBand: 5,
    notes: ['研究岗卡名校硕士，应用工程岗更看重落地项目', '技术迭代极快，纯调参岗被工程化取代，需持续跟进'],
  },
  finance: {
    key: 'finance', label: '金融/银行/财务',
    layoffProne: 0.3, aiReplace: 0.4, policyRisk: 0.5, cycleVolatility: 0.4,
    agePenalty: 0.3, salaryGrowth: 0.6, stability: 0.8, slowdownBand: 4,
    notes: ['持牌机构稳定性高，但柜员/基础记账/流水线信审岗正在被系统替代', '收入与网点/团队业绩强相关，地区差异巨大；证书（CPA/FRM/CFP）是硬通货'],
  },
  semiconductor: {
    key: 'semiconductor', label: '半导体/芯片/硬科技',
    layoffProne: 0.5, aiReplace: 0.2, policyRisk: 0.4, cycleVolatility: 0.8,
    agePenalty: 0.3, salaryGrowth: 0.8, stability: 0.5, slowdownBand: 5,
    notes: ['行业有明显周期，融资退潮时中小公司裁员风险高', '设计岗卡硕士，本科多从验证/版图/测试切入；方向极细分，选错转型成本大'],
  },
  manufacture: {
    key: 'manufacture', label: '先进制造/新能源/机械',
    layoffProne: 0.4, aiReplace: 0.3, policyRisk: 0.3, cycleVolatility: 0.7,
    agePenalty: 0.2, salaryGrowth: 0.6, stability: 0.6, slowdownBand: 4,
    notes: ['新能源/储能有产能周期，扩张期猛招人、过剩期裁员也猛', '基地多在偏远园区，制造岗常需倒班/驻厂；越老越吃经验但起薪偏低'],
  },
  gov: {
    key: 'gov', label: '体制内/事业单位/教培',
    layoffProne: 0.1, aiReplace: 0.2, policyRisk: 0.4, cycleVolatility: 0.2,
    agePenalty: 0.1, salaryGrowth: 0.35, stability: 0.95, slowdownBand: 5,
    notes: ['编制岗极稳定但薪资天花板低、晋升受职数限制', '考编/考公报录比极高；基层加班迎检驻村并不轻松；教培受政策影响大'],
  },
  medical: {
    key: 'medical', label: '医疗/医药',
    layoffProne: 0.2, aiReplace: 0.2, policyRisk: 0.5, cycleVolatility: 0.3,
    agePenalty: 0.1, salaryGrowth: 0.6, stability: 0.85, slowdownBand: 5,
    notes: ['临床硕士几乎是三甲门槛，规培期长、薪资低、值班多', '医药代表受集采与合规冲击，纯销售型岗位收缩；职称与科研决定上限'],
  },
  legal: {
    key: 'legal', label: '法律/专业服务',
    layoffProne: 0.3, aiReplace: 0.4, policyRisk: 0.3, cycleVolatility: 0.4,
    agePenalty: 0.2, salaryGrowth: 0.7, stability: 0.6, slowdownBand: 5,
    notes: ['法考是第一关，实习律师前两年收入极低', '收入两极分化：案源/资源决定上限，授薪与合伙人差距巨大'],
  },
  consulting: {
    key: 'consulting', label: '咨询/行业研究',
    layoffProne: 0.4, aiReplace: 0.5, policyRisk: 0.2, cycleVolatility: 0.6,
    agePenalty: 0.4, salaryGrowth: 0.85, stability: 0.5, slowdownBand: 5,
    notes: ['头部机构极度看重名校背景，非 target school 难度大', '出差强度高；基础案头研究正被 AI 提效工具压缩，壁垒在行业认知与客户信任'],
  },
  construction: {
    key: 'construction', label: '建筑/房地产/土木',
    layoffProne: 0.6, aiReplace: 0.3, policyRisk: 0.7, cycleVolatility: 0.8,
    agePenalty: 0.4, salaryGrowth: 0.35, stability: 0.4, slowdownBand: 4,
    notes: ['房地产处于下行周期，设计院降本增效、施工岗驻场艰苦', '优先央企/国企施工单位或基建、新能源厂房方向，谨慎进入纯地产链'],
  },
  content: {
    key: 'content', label: '内容/直播/影视',
    layoffProne: 0.6, aiReplace: 0.7, policyRisk: 0.5, cycleVolatility: 0.8,
    agePenalty: 0.5, salaryGrowth: 0.7, stability: 0.3, slowdownBand: 4,
    notes: ['项目制/平台算法依赖强，流量成本上涨，收入波动极大', '基础剪辑/文案/场控岗正被 AI 与矩阵化压缩，需往创意、操盘、IP 走'],
  },
  ecom: {
    key: 'ecom', label: '电商/零售',
    layoffProne: 0.5, aiReplace: 0.6, policyRisk: 0.4, cycleVolatility: 0.7,
    agePenalty: 0.5, salaryGrowth: 0.6, stability: 0.45, slowdownBand: 4,
    notes: ['大促节点加班极强；客服/美工/基础运营/投放执行岗最容易被 AI 与自动化替代', '平台规则变化快，过度依赖单一平台/单一品类风险高'],
  },
  sales: {
    key: 'sales', label: '销售/商务',
    layoffProne: 0.5, aiReplace: 0.3, policyRisk: 0.2, cycleVolatility: 0.5,
    agePenalty: 0.4, salaryGrowth: 0.7, stability: 0.35, slowdownBand: 4,
    notes: ['底薪低、提成驱动，收入两极分化，前期生存压力大', '行业与平台比个人努力更重要；无资源积累的销售 35 岁后被动'],
  },
  logistics: {
    key: 'logistics', label: '物流/供应链',
    layoffProne: 0.4, aiReplace: 0.5, policyRisk: 0.2, cycleVolatility: 0.4,
    agePenalty: 0.3, salaryGrowth: 0.5, stability: 0.6, slowdownBand: 4,
    notes: ['基础仓配/单据岗体力消耗大、易被系统化替代，应往计划/采购/数字化走', '懂数据与系统的供应链人才有溢价'],
  },
  design: {
    key: 'design', label: '设计/创意',
    layoffProne: 0.5, aiReplace: 0.7, policyRisk: 0.2, cycleVolatility: 0.5,
    agePenalty: 0.5, salaryGrowth: 0.5, stability: 0.45, slowdownBand: 4,
    notes: ['纯视觉/美工执行岗受 AI 生图冲击明显，需求收缩', '必须懂产品/交互/商业，向设计策略与体系化方向走才能拉开差距'],
  },
}

/** 根据路线名/行业匹配风险参数 */
export function riskForRoute(routeName: string, industry = ''): IndustryRisk {
  const text = routeName + industry
  const rules: [RegExp, RiskKey][] = [
    [/算法|AI|大模型|人工智能/, 'ai'],
    [/芯片|半导体|IC|嵌入式/, 'semiconductor'],
    [/新能源|电池|机械|制造|工业|储能|光伏/, 'manufacture'],
    [/公务员|事业编|教师|教培|选调/, 'gov'],
    [/医疗|医药|医生|护士|临床|护理|药/, 'medical'],
    [/咨询|行研|行业研究/, 'consulting'],
    [/律师|法务|法律/, 'legal'],
    [/建筑|土木|房地产|施工|造价|工程/, 'construction'],
    [/直播|短视频|影视|编导|新媒体|内容|自媒体|传媒/, 'content'],
    [/客服|美工|电商|投放|选品|商品|跨境|外贸|店铺|仓储/, 'ecom'],
    [/销售|BD|商务/, 'sales'],
    [/物流|供应链|采购|仓储|快递/, 'logistics'],
    [/设计|UI|视觉|美工|工业设计/, 'design'],
    [/银行|金融|财务|会计|风控|合规|国企|央企|保险|证券|审计/, 'finance'],
    [/前端|后端|测试|运维|软件|互联网|数据|产品|运营|游戏/, 'internet'],
  ]
  for (const [re, key] of rules) {
    if (re.test(text)) return RISK_PROFILES[key]
  }
  return RISK_PROFILES.internet
}

// ------------------------------------------------------------
// 岗位瓶颈库
// P1~P4 的具体瓶颈已在 RAW_ROUTES 每阶段给出（贴近岗位），
// 这里补齐 P5~P7 的通用资历段瓶颈 + 特殊序列的专属瓶颈。
// ------------------------------------------------------------

/** 通用资历段瓶颈（所有赛道共性的职业卡点） */
export const GENERIC_BOTTLENECK: Record<SeniorityBand, string> = {
  0: '经验不足，对真实业务/生产环境没有概念，能力停留在课本与 demo 层面',
  1: '只能在指导下完成明确任务，独立负责与排查问题的能力弱',
  2: '能独立干活但缺乏体系化深度，复杂问题与跨部门协作 hold 不住',
  3: '从执行者到负责人的跨越：能否独当一面主导完整项目或业务线',
  4: '管理线与专家线分岔：首次带团队或深耕专业深度的关键选择窗口',
  5: '35 岁前后职业安全分水岭：行业人脉与不可替代性必须成型',
  6: '总监/专家层岗位稀缺，晋升依赖业务结果与机遇，跳槽溢价明显收窄',
}

/** 特殊序列的资深段瓶颈（覆盖通用文案，更贴合体制/医生/律师等） */
const TRACK_SENIOR_BOTTLENECK: Partial<Record<TrackType, [string, string, string]>> = {
  gov: [
    '晋升受编制与职数限制，能否提为正科/副处取决于岗位空缺与机遇',
    '从业务骨干到中层管理者：协调资源、带队伍、写材料的综合能力是门槛',
    '处级以上岗位稀少且选拔严格，多数人终其职级止步于中层',
  ],
  medical: [
    '主治医师到副主任医师：科研论文、亚专科方向与职称评审是硬门槛',
    '副主任/高级职称竞争激烈，临床、科研、教学三线并行压力大',
    '科室主任/学科带头人岗位极少，药企方向则看产品与商业化结果',
  ],
  legal: [
    '从授薪到独立案源：能否自己开发客户决定律师收入上限',
    '授薪合伙人/法务总监：专业化方向与客户信任需要长期沉淀',
    '权益合伙人两极分化，案源与团队决定收入，法务则受限于组织职数',
  ],
  sales: [
    '从个人开单到带团队：能否复制打法、管理大客户与回款',
    '行业资源与标杆客户成为核心资产，平台依赖与个人资源需平衡',
    '大区/总监岗稀少，收入高度绑定行业景气与团队业绩',
  ],
  content: [
    '从单条爆款到稳定矩阵：能否建立可复制的内容生产与变现体系',
    '平台算法与流量成本风险集中，多平台/私域/个人品牌必须成型',
    '头部 IP/合伙人位置极少，生命周期与身体消耗是长期约束',
  ],
}

/** 取某 track 某资历段的瓶颈文案 */
export function bottleneckFor(track: TrackType, band: SeniorityBand): string {
  if (band >= 4) {
    const special = TRACK_SENIOR_BOTTLENECK[track]
    if (special) return special[band - 4]
  }
  return GENERIC_BOTTLENECK[band]
}

// ------------------------------------------------------------
// 约束计算引擎
// ------------------------------------------------------------

/** 由累计相关工作经验年数 → 资历段下标 + 段内进度（0~1） */
export function bandAtYears(years: number): { band: SeniorityBand; frac: number } {
  const y = Math.max(0, years)
  let band: SeniorityBand = 0
  for (let i = 0; i < BAND_ENTRY_YEARS.length; i++) {
    if (y >= BAND_ENTRY_YEARS[i]) band = i as SeniorityBand
  }
  const entry = BAND_ENTRY_YEARS[band]
  const next = band < 6 ? BAND_ENTRY_YEARS[band + 1] : entry + 5 // P7 之后按 5 年缓慢爬满
  const span = Math.max(1, next - entry)
  const frac = Math.min(1, (y - entry) / span)
  return { band, frac }
}

/**
 * 画像中的从业月数 → 相关经验年数。
 * 注意：向导页与简历视觉解析采集的 yearsOfExperience 字段单位都是「月」
 * （向导上限 600 个月、简历解析 schema 上限 600），
 * 而资历段 BAND_ENTRY_YEARS / 薪资曲线全部按「年」计算，
 * 必须在此统一换算，否则 36 个月会被当成 36 年直接跳到 P7 总监档。
 */
export function experienceYears(profile: UserProfile): number {
  const months = Math.max(0, Number(profile.yearsOfExperience) || 0)
  return Math.floor(months / 12)
}

/**
 * 用户在某路线上的「相关经验年数」。
 * - 学生/应届：0
 * - 职场人 + 路线与背景相关：按实际年数
 * - 职场人转行（路线与其专业/技能背景不沾边；目标岗位意向不算已有经验）：
 *   相关经验打折，转行通常从初中级重新切入，故封顶到 2 年相关经验（降维入行）
 */
export function relevantYears(
  profile: UserProfile,
  isRouteRelevant: boolean
): number {
  if (profile.identity !== 'professional') return 0
  const yrs = experienceYears(profile)
  return isRouteRelevant ? yrs : Math.min(yrs, 2)
}

const clampNum = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const roundK = (v: number) => Math.max(0, Math.round(v))

export interface StageSalaryInput {
  /** P1~P4 的基准区间（来自 RAW_ROUTES，新一线锚点） */
  juniorBands: [number, number][] // 长度 4，对应 P1..P4
  routeName: string
  industry: string
  /** 该路线是否与用户背景相关（用于转行降维） */
  relevant: boolean
}

/**
 * 计算某路线在指定「累计经验年数」下的薪资区间（K/月）。
 * 全程基于基准库 + 系数，不使用随机数：
 *   基准段位区间 × 城市系数（随资历段非线性压缩，见 cityBandFactor）
 *   × 学历系数（下限/上限非对称），
 *   段内随经验从低位向高位插值，并被资深段硬天花板封顶。
 */
export function salaryAtExperience(
  profile: UserProfile,
  input: StageSalaryInput,
  expYears: number
): [number, number] {
  const senior = seniorBandFor(input.routeName, input.industry)
  // 合并 P1~P4（RAW_ROUTES）与 P5~P7（基准库）为完整 7 段
  const allBands: [number, number][] = [
    ...(input.juniorBands.slice(0, 4) as [number, number][]),
    ...senior.bands,
  ]

  const { band, frac } = bandAtYears(expYears)
  const [bMin, bMax] = allBands[band]
  // 段内随经验从中低位向高位移动（下限移动慢、上限移动快，体现绩效分化）
  const baseMin = bMin + (bMax - bMin) * frac * 0.55
  const baseMax = bMin + (bMax - bMin) * (0.35 + frac * 0.65)

  const cFactor = cityFactor(profile.city)
  const [sMinFactor, sMaxFactor] = schoolTierFactors(profile.schoolTier)
  // 城市系数按资历段压缩：低线城市高端岗位稀缺，薪资天花板塌缩远大于起薪
  const fLo = cityBandFactor(cFactor, band, 'min')
  const fHi = cityBandFactor(cFactor, band, 'max')

  let min = baseMin * fLo * sMinFactor
  let max = baseMax * fHi * sMaxFactor

  // 硬天花板：不超过该路线 P7 上限 × P7 段城市压缩系数 × 学历上限系数 × 1.05 余量
  const hardCap =
    senior.bands[2][1] * cityBandFactor(cFactor, 6, 'max') * Math.max(sMaxFactor, 1) * 1.05
  max = clampNum(max, 0, hardCap)
  // 硬地板：正常在岗薪资不低于 2K（备考/无收入阶段由数据本身给出 0）
  min = bMin > 0 ? clampNum(min, 2, hardCap) : 0

  // 区间宽度保障：低线城市资深段两端被压缩后可能贴近甚至四舍五入成同一个数，
  // 至少保留约 18% 的带宽（不超过硬天花板）
  if (bMin > 0 && max < min * 1.12) max = Math.min(hardCap, min * 1.18)
  return [roundK(min), roundK(max)]
}

/**
 * 生成一条路线在整个推演周期上的薪资序列（确定性、被基准约束）。
 * @param startExp 起点累计相关经验年数
 * @param nodes    节点数（3 年期=4；长周期=9）
 */
export function salaryCurveFor(
  profile: UserProfile,
  input: StageSalaryInput,
  startExp: number,
  nodes: number
): [number, number][] {
  const curve: [number, number][] = []
  let prevMax = 0
  let prevMin = 0
  for (let i = 0; i < nodes; i++) {
    const exp = startExp + i // current 阶段 = 起点经验，yearN = 起点经验 + N
    let [lo, hi] = salaryAtExperience(profile, input, exp)
    // 单调性：同一路线上经验只增不减，薪资上下限都不得倒挂/跳水
    // （段间插值在低线城市压缩后可能出现 1~2K 的边界回落，这里强制抬平）
    if (prevMax > 0 && hi < prevMax) hi = prevMax
    if (lo < prevMin) lo = prevMin
    if (hi < lo) hi = lo
    curve.push([lo, hi])
    prevMax = hi
    prevMin = lo
  }
  return curve
}

// ------------------------------------------------------------
// AI 返回值约束层：把模型给出的薪资/分数钳进基准允许的范围
// ------------------------------------------------------------

export interface ClampableNode {
  stage?: string
  salaryRange?: [number, number] | number[]
}
export interface ClampableRoute {
  name?: string
  industry?: string
  involutionScore?: number
  riskLevel?: number
  matchScore?: number
  entryCost?: number
  switchDifficulty?: number
  nodes?: ClampableNode[]
}

/**
 * 用基准库约束 AI 返回的路线数值：
 * - 每个节点薪资钳到「该城市/学历/经验/资历段下基准区间的 0.75~1.15 倍」带宽内，
 *   城市系数随资历段非线性压缩（低线城市资深岗天花板塌缩），并受 P7 硬天花板限制；
 * - 修 min>max、修曲线倒挂；
 * - 分数钳到合法域。
 * 返回钳制说明列表（空数组表示完全合规）。
 */
export function clampRouteToBenchmark(
  route: ClampableRoute,
  profile: UserProfile,
  startExp: number
): string[] {
  const notes: string[] = []
  const routeName = route.name || ''
  const industry = route.industry || ''
  const senior = seniorBandFor(routeName, industry)
  const { juniorBands } = juniorBandsFor(routeName, industry)
  // 完整 7 段参考区间（P1~P4 来自岗位数据集，P5~P7 来自资深基准库）
  const refBands: [number, number][] = [...juniorBands, ...senior.bands]
  const cFactor = cityFactor(profile.city)
  const [sMinFactor, sMaxFactor] = schoolTierFactors(profile.schoolTier)
  const hardCap = roundK(
    senior.bands[2][1] * cityBandFactor(cFactor, 6, 'max') * Math.max(sMaxFactor, 1) * 1.05
  )

  const nodes = route.nodes || []
  let prevMax = 0
  nodes.forEach((node, i) => {
    if (!node.salaryRange || node.salaryRange.length < 2) return
    const exp = startExp + i
    const { band } = bandAtYears(exp)
    const [rbMin, rbMax] = refBands[Math.min(band, 6)]

    // 无收入阶段（如公务员备考期）：不应出现薪资，直接置 0
    if (rbMax === 0) {
      if (Number(node.salaryRange[1]) > 0) {
        notes.push(`${routeName} ${node.stage || ''} 为备考/在校无收入阶段，不应有薪资，已置 0`)
      }
      node.salaryRange = [0, 0]
      return
    }

    // 基准区间 × 城市系数（按资历段压缩）× 学历非对称系数（下限用 sMin、上限用 sMax）
    const fLo = cityBandFactor(cFactor, band, 'min')
    const fHi = cityBandFactor(cFactor, band, 'max')
    const lo = rbMin * fLo * sMinFactor
    const hi = Math.min(rbMax * fHi * sMaxFactor, hardCap)
    // 允许带宽：基准的 0.75 倍下限 ~ 1.15 倍上限（给模型少量浮动空间，拦住离谱值）；
    // 资深段上限受 P7 硬天花板封死，不许借带宽穿透
    const floor = Math.max(2, roundK(lo * 0.75))
    const ceil = Math.min(roundK(hi * 1.15), hardCap)

    let [a, b] = [Number(node.salaryRange[0]), Number(node.salaryRange[1])]
    if (!Number.isFinite(a)) a = floor
    if (!Number.isFinite(b)) b = ceil
    const rawA = roundK(a)
    const rawB = roundK(b)
    let ca = clampNum(rawA, 0, ceil)
    const cb = clampNum(rawB, 0, ceil)
    // 下限钳制实际生效：低于市场地板的非零值上调到地板
    if (ca > 0 && ca < floor) {
      notes.push(`${routeName} ${node.stage || ''} 起薪 ${ca}K 低于市场基准（约 ${floor}K 起），已上调`)
      ca = floor
    }
    if (rawB > ceil) notes.push(`${routeName} ${node.stage || ''} 薪资上限 ${rawB}K 超出市场合理区间（约 ${ceil}K 封顶），已下调`)

    let finalMin = ca
    let finalMax = cb < ca ? ca : cb
    // 后续节点出现 0/空值视为模型漏填，用基准地板区间补齐；
    // current 节点的 0 保留（可能是转行备考/在校无收入的真实状态）
    if (finalMin === 0 && finalMax === 0 && i > 0) {
      finalMin = floor
      finalMax = Math.min(ceil, roundK(floor * 1.4))
    }
    // 双端同时触顶/触底会退化为单点，保留合理带宽
    if (finalMin === finalMax) {
      if (rawA >= ceil && rawB >= ceil) finalMin = Math.max(floor, roundK(ceil * 0.7))
      else if (rawA <= floor && rawB <= floor) finalMax = Math.min(ceil, Math.max(roundK(floor * 1.25), finalMin + 2))
    }
    // 倒挂修正
    if (prevMax > 0 && finalMax < prevMax * 0.8) {
      finalMax = roundK(prevMax * 0.85)
    }
    if (finalMax < finalMin) finalMax = finalMin
    node.salaryRange = [finalMin, finalMax]
    prevMax = finalMax
  })

  // 分数钳制
  if (route.matchScore !== undefined) route.matchScore = clampNum(Math.round(route.matchScore), 40, 98)
  if (route.involutionScore !== undefined) route.involutionScore = clampNum(Math.round(route.involutionScore), 1, 10)
  if (route.riskLevel !== undefined) route.riskLevel = clampNum(Math.round(route.riskLevel), 1, 5)
  if (route.entryCost !== undefined) route.entryCost = clampNum(Math.round(route.entryCost), 1, 5)
  if (route.switchDifficulty !== undefined) route.switchDifficulty = clampNum(Math.round(route.switchDifficulty), 1, 5)

  return notes
}

// ------------------------------------------------------------
// 给大模型的薪资基准锚点表（注入路线推演提示词，约束模型生成数值）
// ------------------------------------------------------------

/**
 * 生成指定画像下的写实薪资基准表（税前 K/月，已按城市系数折算）。
 * 用于注入路线生成提示词，让模型在生成时就对齐市场真实区间，而不是事后纠错。
 * 各列分别按对应资历段的城市压缩系数折算：低线城市的「资深天花板」塌缩幅度
 * 远大于「起薪」（本地没有专家/总监级岗位 HC），三列不能共用一个系数。
 */
export function buildSalaryAnchorTable(profile: UserProfile): { table: string; cityFactor: number } {
  const f = cityFactor(profile.city)
  // 起薪≈P2(band1)、3 年≈P4(band3)、资深天花板=P7(band6)
  const scaleBand = (s: [number, number], band: SeniorityBand): [number, number] => [
    roundK(s[0] * cityBandFactor(f, band, 'min')),
    roundK(s[1] * cityBandFactor(f, band, 'max')),
  ]
  const lines: string[] = []
  for (const raw of RAW_ROUTES) {
    const senior = seniorBandFor(raw.name, raw.industry)
    const start = scaleBand(raw.stages.year1.salary, 1) // 转正后起薪
    const y3 = scaleBand(raw.stages.year3.salary, 3)
    const ceil = scaleBand(senior.bands[2], 6)
    const short = raw.name.replace(/路线$/, '')
    lines.push(
      `- ${short}：起薪约 ${start[0]}-${start[1]}K，3 年约 ${y3[0]}-${y3[1]}K，资深天花板约 ${ceil[0]}-${ceil[1]}K/月`
    )
  }
  return { table: lines.join('\n'), cityFactor: Number(f.toFixed(2)) }
}

/**
 * 体制内备考类路线（公务员/事业编/选调生/教师编等）：
 * 无论用户此前工作多少年，路线起点都是「备考期」——往届工龄不抵体制内职级，
 * 有 5 年工作经验的转行者 current 节点依然是备考（无收入），year1 才是试用期。
 * 注意：普通「教师/教培」路线（实习老师→骨干教师）不在此列，
 * 只有名字明确指向考公考编备考的路线才强制归零。
 */
export function isExamPrepRoute(routeName: string, industry = ''): boolean {
  return /公务员|事业编|事业单位|选调生|考公|公考|省考|国考|三支一扶|村官|教师编|教招|特岗|体制内/.test(
    routeName + industry
  )
}

/**
 * AI 路线与用户「已有背景」的相关性粗判：决定职场人在该路线上是否「转行降维」定起点。
 * 学生/应届恒为 true（起点统一 P1，取值不影响结果）。
 * 判定方式：把模型给的路线名/行业匹配到最接近的内置岗位，借其 curated 关键词库
 * 与用户「专业/岗位 + 技能」做双向命中，沾边即视为同方向。
 * 注意：这里刻意不看 targetIndustries（目标岗位）——目标只代表意向，不代表已有
 * 相关经验，机械专业转行目标前端时仍应从初中级段定薪。
 */
export function aiRouteRelevant(
  routeName: string,
  industry: string,
  profile: UserProfile
): boolean {
  if (profile.identity !== 'professional') return true
  const background = [profile.majorOrJob || '', ...(profile.skills || [])]
    .join(' ')
    .toLowerCase()
  if (!background.trim()) return true

  // 匹配最接近的内置岗位（与 juniorBandsFor 同一套逻辑）
  const text = (routeName + ' ' + industry).toLowerCase()
  let best: (typeof RAW_ROUTES)[number] | null = null
  let bestScore = 0
  for (const raw of RAW_ROUTES) {
    let score = 0
    for (const kw of raw.keywords) {
      const k = kw.toLowerCase()
      if (k.length >= 2 && text.includes(k)) score += k.length >= 3 ? 2 : 1
    }
    const nameHead = raw.name.slice(0, 2)
    if (nameHead && routeName.includes(nameHead)) score += 3
    if (score > bestScore) {
      bestScore = score
      best = raw
    }
  }
  if (!best || bestScore < 2) return true // 匹配不到内置岗位时不做转行降维，按实际经验走

  // 用该岗位的关键词库检验用户背景
  return best.keywords.some((kw) => {
    const k = kw.toLowerCase()
    return k.length >= 2 && background.includes(k)
  })
}
