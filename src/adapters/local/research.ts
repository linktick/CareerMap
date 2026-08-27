// 本地模式 - 深度市场调研 / 沙盘事实校验 / 长周期外推
// 离线状态下用内置赛道数据集（intelDataset）+ 确定性规则引擎产出：
// 1. 长周期路线外推（year4~year8 的岗位/薪资/瓶颈）
// 2. 模拟 Agent 链式调研报告（任务拆解→JD→招聘动态→热度→舆情→风险→汇总）
// 3. 确定性自洽性检查（AI 模式下也会复用这些规则检查，与模型交叉比对结果合并）

import type { CareerRoute, Stage, UserProfile } from '@/types/career'
import type {
  HeatChange,
  JdInsight,
  MarketResearchReport,
  MarketSignal,
  ResearchInput,
  ResearchStepState,
  ResearchTask,
  SandboxValidation,
  ValidationInput,
  ValidationIssue,
} from '@/types/research'
import { INTEL_CATALOG, type IntelSeed } from './intelDataset'
import { levelToInvolution } from '@/utils/format'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

// ============ 长周期外推 ============

const EXTENDED_STAGES: Stage[] = ['year4', 'year5', 'year6', 'year7', 'year8']

/** 各年份薪资环比增长（min, max），随资历加深递减 */
const LONG_GROWTH: Record<string, [number, number]> = {
  year4: [1.14, 1.17],
  year5: [1.11, 1.14],
  year6: [1.09, 1.11],
  year7: [1.07, 1.09],
  year8: [1.05, 1.07],
}

const LONG_BOTTLENECK: Record<string, string> = {
  year4: '从执行者到负责人的跨越：能否独当一面主导完整项目或业务线',
  year5: '管理线与专家线分岔：首次带团队或深耕专业深度的关键选择窗口',
  year6: '35 岁前后职业安全分水岭：行业人脉与不可替代性必须成型',
  year7: '行业周期与 AI 技术替代风险集中显现，跨界复合能力成为护城河',
  year8: '总监/专家层岗位稀少，晋升依赖业务结果与机遇，跳槽溢价明显收窄',
}

const LONG_SKILLS: Record<string, string[]> = {
  year4: ['项目主导', '跨部门协作', '复杂问题拆解'],
  year5: ['团队管理', '技术/业务规划', '人才培养'],
  year6: ['团队管理', '业务规划', '资源整合'],
  year7: ['战略洞察', '行业资源', '风险管理'],
  year8: ['组织建设', '商业决策', '行业影响力'],
}

/** 剥离岗位 title 的职级前缀，得到基础岗位名 */
function baseTitle(title: string): string {
  return title
    .replace(/(高级|资深|主任|首席|中级|初级|助理|实习)/g, '')
    .trim() || title
}

/** 判断路线是否偏管理/经营序列（用于长周期 title 演进） */
function isManagementTrack(route: CareerRoute): boolean {
  const text = route.name + route.industry + route.nodes.map((n) => n.title).join()
  return /运营|销售|市场|HR|人力|财务|法务|教师|教研|客服|采购|供应链|客户经理|公务员|事业|银行|电商|新媒体|内容|直播|产品/.test(
    text
  )
}

function longTitle(route: CareerRoute, stage: Stage, yearIdx: number): string {
  const y3 = route.nodes[3]
  const base = baseTitle(y3.title)
  const mgmt = isManagementTrack(route)
  if (mgmt) {
    if (yearIdx <= 5) return `${base}经理`
    if (yearIdx <= 7) return `高级${base}经理`
    return `${base}总监/业务负责人`
  }
  if (yearIdx === 4) return `资深${base}`
  if (yearIdx === 5) return `${base}专家`
  if (yearIdx <= 7) return `${base}技术负责人/资深专家`
  return `${base}架构师/领域专家`
}

/**
 * 把 3 年期路线（4 节点）外推为 8 年期路线（9 节点）。
 * 薪资按递减增速外推，岗位沿"资深→专家→负责人/经理→总监"演进，
 * 需求量随岗位级别升高而减少（高级岗位 HC 更少）。
 */
export function extrapolateLongCycle(route: CareerRoute, profile: UserProfile): CareerRoute {
  const nodes = [...route.nodes]
  const curve = [...route.salaryCurve]
  const jitter = (hashString(route.name + profile.city) % 100) / 100 // 0~0.99

  for (let i = 0; i < EXTENDED_STAGES.length; i++) {
    const stage = EXTENDED_STAGES[i]
    const yearIdx = i + 4
    const prev = nodes[nodes.length - 1]
    const [gMin, gMax] = LONG_GROWTH[stage]
    // 确定性微扰：±2% 以内，避免每条路线涨幅雷同
    const jitterMin = 1 + (jitter - 0.5) * 0.04
    const min = Math.round(prev.salaryRange[0] * gMin * jitterMin)
    const max = Math.round(prev.salaryRange[1] * gMax * jitterMin)
    // 高级岗位 HC 更少：year6 起需求量较 year3 降 1 档（不低于 1）
    const demand = yearIdx >= 6 ? Math.max(1, prev.demandLevel - 1) : prev.demandLevel
    const prevSkills = prev.requiredSkills
    nodes.push({
      stage,
      title: longTitle(route, stage, yearIdx),
      salaryRange: [min, max],
      demandLevel: demand,
      bottleneck: LONG_BOTTLENECK[stage],
      requiredSkills: [...new Set([...LONG_SKILLS[stage], ...prevSkills.slice(0, 3)])],
      certificates: [],
    })
    curve.push({ stage, min, max })
  }

  return {
    ...route,
    nodes,
    salaryCurve: curve,
    // 长周期下风险与天花板提示更侧重长期
    ceiling: route.ceiling,
    pitfalls: [
      ...route.pitfalls,
      '长周期提示：第 5~6 年是管理/专家分岔点，选错方向回头成本高',
      '长周期提示：35 岁后高级岗位 HC 收缩，需提前积累人脉与不可替代性',
    ],
  }
}

/**
 * 长周期归一化：保证路线恰好 9 个节点（current + year1~year8）。
 * - 已是 9 节点：原样返回；
 * - 只有 4 节点（标准 3 年期）：走完整外推；
 * - 模型返回了 5~8 个节点（部分年长节点）：从末尾按同样的增长规律续补到 year8。
 */
export function ensureLongCycle(route: CareerRoute, profile: UserProfile): CareerRoute {
  if (route.nodes.length >= 9) return route
  if (route.nodes.length === 4) return extrapolateLongCycle(route, profile)

  const stageOrder: Stage[] = [
    'current', 'year1', 'year2', 'year3',
    'year4', 'year5', 'year6', 'year7', 'year8',
  ]
  const r: CareerRoute = {
    ...route,
    nodes: [...route.nodes],
    salaryCurve: [...route.salaryCurve],
  }
  const jitter = (hashString(route.name + profile.city) % 100) / 100
  while (r.nodes.length < 9) {
    const idx = r.nodes.length
    const stage = stageOrder[idx]
    const yearIdx = idx
    const prev = r.nodes[idx - 1]
    const [gMin, gMax] = LONG_GROWTH[stage] ?? [1.05, 1.07]
    const jitterFactor = 1 + (jitter - 0.5) * 0.04
    const min = Math.round(prev.salaryRange[0] * gMin * jitterFactor)
    const max = Math.round(prev.salaryRange[1] * gMax * jitterFactor)
    const demand = yearIdx >= 6 ? Math.max(1, prev.demandLevel - 1) : prev.demandLevel
    r.nodes.push({
      stage,
      title: longTitle(r, stage, yearIdx),
      salaryRange: [min, max],
      demandLevel: demand,
      bottleneck: LONG_BOTTLENECK[stage] ?? LONG_BOTTLENECK.year8,
      requiredSkills: [
        ...new Set([...(LONG_SKILLS[stage] ?? LONG_SKILLS.year8), ...prev.requiredSkills.slice(0, 3)]),
      ],
      certificates: [],
    })
    r.salaryCurve.push({ stage, min, max })
  }
  return r
}

// ============ 本地市场调研 ============

/** 把路线匹配到内置赛道数据集（关键词重叠度最高者） */
function matchSeed(route: CareerRoute): IntelSeed | null {
  const text = (route.name + route.industry + route.nodes.map((n) => n.title).join('')).toLowerCase()
  let best: IntelSeed | null = null
  let bestScore = 0
  for (const seed of INTEL_CATALOG) {
    const tokens = [
      ...seed.name.split(/[/／、]/),
      ...seed.tags,
      ...seed.hotSkills,
    ]
    let score = 0
    for (const t of tokens) {
      const kw = t.toLowerCase().replace(/\s/g, '')
      if (kw && text.replace(/\s/g, '').includes(kw)) score += kw.length >= 3 ? 2 : 1
    }
    if (score > bestScore) {
      bestScore = score
      best = seed
    }
  }
  return bestScore > 0 ? best : null
}

function trendOf(seed: IntelSeed | null): 'up' | 'flat' | 'down' {
  if (!seed) return 'flat'
  if (seed.momentum >= 0.6) return 'up'
  if (seed.momentum <= -0.6) return 'down'
  return 'flat'
}

function periodNote(): string {
  const now = new Date()
  const ago = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const fmt = (d: Date) => `${d.getFullYear()}年${d.getMonth() + 1}月`
  return `${fmt(ago)}~${fmt(now)} 公开招聘与舆情数据（本地内置数据集模拟）`
}

/** 本地链式调研：按步骤回调进度，内容由内置数据集确定性生成 */
export async function localRunMarketResearch(
  input: ResearchInput,
  onStep?: (step: ResearchStepState) => void
): Promise<MarketResearchReport> {
  const steps: ResearchStepState[] = [
    { id: 'plan', title: '拆解调研任务', status: 'pending' },
    { id: 'jd', title: '检索近 3~6 个月岗位 JD 与薪资', status: 'pending' },
    { id: 'hiring', title: '行业招聘动态与赛道热度', status: 'pending' },
    { id: 'sentiment', title: '职场舆情扫描', status: 'pending' },
    { id: 'risk', title: '行业风险资讯汇总', status: 'pending' },
    { id: 'summary', title: '交叉汇总调研报告', status: 'pending' },
  ]
  const mark = (id: string, patch: Partial<ResearchStepState>) => {
    const s = steps.find((x) => x.id === id)
    if (s) Object.assign(s, patch)
    onStep?.(s ? { ...s } : { id, title: id, status: 'running' })
  }

  // ---- step 1: 任务拆解 ----
  mark('plan', { status: 'running' })
  await delay(350)
  const industries = Array.from(new Set(input.sandbox.routes.map((r) => r.industry)))
  const tasks: ResearchTask[] = [
    ...input.sandbox.routes.map((r, i) => ({
      id: `t${i + 1}`,
      title: `${r.name}方向目标岗位 JD 与薪资行情检索`,
      target: r.nodes[1]?.title || r.name,
      keywords: [r.industry, r.nodes[1]?.title || r.name, input.profile.city],
    })),
    {
      id: `t${input.sandbox.routes.length + 1}`,
      title: `${industries.join('、')} 行业招聘 HC 与投融资动态`,
      target: industries.join('、'),
      keywords: ['招聘', 'HC', '扩招', '裁员', ...industries],
    },
    {
      id: `t${input.sandbox.routes.length + 2}`,
      title: '目标赛道职场舆情与从业者口碑',
      target: '职场舆情',
      keywords: ['加班', '裁员', '35岁', '脉脉', '口碑'],
    },
    {
      id: `t${input.sandbox.routes.length + 3}`,
      title: '行业政策监管与技术替代风险资讯',
      target: '行业风险',
      keywords: ['政策', '监管', 'AI替代', '行业风险'],
    },
  ]
  mark('plan', { status: 'done', detail: `已拆解 ${tasks.length} 条搜索任务` })

  // ---- step 2: JD 调研 ----
  mark('jd', { status: 'running' })
  await delay(450)
  const jdInsights: JdInsight[] = input.sandbox.routes.map((r) => {
    const seed = matchSeed(r)
    const trend = trendOf(seed)
    const hot = seed
      ? seed.hotSkills.slice(0, 5)
      : Array.from(new Set(r.nodes.flatMap((n) => n.requiredSkills))).slice(0, 5)
    const declining = seed ? seed.decliningSkills : []
    const y1 = r.nodes[1] || r.nodes[0]
    return {
      routeId: r.id,
      routeName: r.name,
      role: y1.title,
      salaryRange: [y1.salaryRange[0], y1.salaryRange[1]] as [number, number],
      demandTrend: trend,
      hotRequirements: hot,
      decliningRequirements: declining,
      sampleTitles: r.nodes.slice(0, 3).map((n) => n.title),
      note: seed ? seed.summary : `该方向近 3~6 个月 JD 总量保持平稳，技能要求向复合化演进`,
    }
  })
  const jdSignals: MarketSignal[] = jdInsights.slice(0, 3).map((j) => ({
    category: 'jd' as const,
    title: `${j.role}岗位需求趋势：${j.demandTrend === 'up' ? '放量' : j.demandTrend === 'down' ? '收缩' : '平稳'}`,
    detail: `近 3~6 个月${j.routeName}方向 JD 中，${j.hotRequirements.slice(0, 3).join('、') || '核心技能'}成为高频要求；薪资区间约 ${j.salaryRange[0]}-${j.salaryRange[1]}K/月。`,
    direction: j.demandTrend === 'up' ? ('positive' as const) : j.demandTrend === 'down' ? ('negative' as const) : ('neutral' as const),
    source: 'BOSS直聘/猎聘近 6 个月 JD 聚合（本地数据集）',
  }))
  mark('jd', { status: 'done', detail: `完成 ${jdInsights.length} 个目标岗位 JD 分析` })

  // ---- step 3: 招聘动态 + 赛道热度 ----
  mark('hiring', { status: 'running' })
  await delay(450)
  const hiringSignals: MarketSignal[] = []
  const heatChanges: HeatChange[] = []
  const usedSeeds = new Set<IntelSeed>()
  for (const r of input.sandbox.routes) {
    const seed = matchSeed(r)
    if (!seed || usedSeeds.has(seed)) continue
    usedSeeds.add(seed)
    const trend = trendOf(seed)
    heatChanges.push({
      track: r.industry,
      direction: trend,
      detail: seed.summary,
    })
    hiringSignals.push({
      category: 'hiring',
      title: `${seed.name}赛道招聘${trend === 'up' ? '放量' : trend === 'down' ? '收缩' : '平稳'}`,
      detail: seed.signals[0] || seed.summary,
      direction: trend === 'up' ? 'positive' : trend === 'down' ? 'negative' : 'neutral',
      source: '行业招聘公告/投融资动态（本地数据集）',
    })
    hiringSignals.push({
      category: 'heat',
      title: `${seed.name}热度指数 ${Math.round(seed.baseHeat)}/100，竞争强度 ${seed.competition}/5`,
      detail: seed.opportunities[0] || seed.summary,
      direction: seed.momentum >= 0 ? 'positive' : 'negative',
      source: '赛道热度监测（本地数据集）',
    })
  }
  mark('hiring', { status: 'done', detail: `覆盖 ${heatChanges.length} 个赛道热度变化` })

  // ---- step 4: 职场舆情 ----
  mark('sentiment', { status: 'running' })
  await delay(400)
  const highInvolution = input.sandbox.routes.filter((r) => r.involutionScore >= 7)
  const sentimentSummary =
    (highInvolution.length > 0
      ? `舆情显示${highInvolution.map((r) => r.name).join('、')}等方向加班与竞争讨论度高，"内卷""35岁"相关话题集中；`
      : '目标赛道整体舆情平稳，加班强度处于可接受区间；') +
    '从业者普遍建议：早期重技能深度，3~5 年后必须向管理、专家或复合业务方向分流，单纯执行岗安全感持续下降。'
  const sentimentSignals: MarketSignal[] = [
    {
      category: 'sentiment',
      title: '职场舆情：AI 工具使用能力成为新晋 JD 与绩效讨论高频词',
      detail: '脉脉/知乎近 6 个月讨论中，"会不会用 AI 工具提效"频繁出现在面试与晋升反馈里，纯执行类岗位焦虑感上升。',
      direction: 'neutral',
      source: '脉脉职言/知乎职场话题（本地数据集模拟）',
    },
    ...(highInvolution.length > 0
      ? [
          {
            category: 'sentiment' as const,
            title: `高内卷预警：${highInvolution.map((r) => r.name).join('、')}`,
            detail: '这些方向从业者反馈加班强度大、候选人扎堆，简历投递回复率走低，建议同步准备备选路线。',
            direction: 'negative' as const,
            source: '职场舆情聚合（本地数据集模拟）',
          },
        ]
      : []),
  ]
  mark('sentiment', { status: 'done', detail: `舆情信号 ${sentimentSignals.length} 条` })

  // ---- step 5: 行业风险 ----
  mark('risk', { status: 'running' })
  await delay(400)
  const riskNews: string[] = []
  const riskSignals: MarketSignal[] = []
  for (const seed of usedSeeds) {
    for (const risk of seed.risks) {
      if (riskNews.length >= 6) break
      riskNews.push(`【${seed.name}】${risk}`)
    }
    riskSignals.push({
      category: 'risk',
      title: `${seed.name}风险提示`,
      detail: seed.risks[0] || '行业周期波动，关注政策与技术替代',
      direction: 'negative',
      source: '行业资讯/政策监测（本地数据集）',
    })
  }
  riskNews.push('AI 对初级执行类岗位的替代加速：近 6 个月多家企业 JD 中"会使用 AI 工具提效"成为硬性要求，纯入门岗 HC 收缩。')
  riskNews.push('35 岁职场分水岭仍在：管理岗 HC 有限，专家线要求持续输出技术/业务壁垒，建议第 5 年前完成分流。')
  mark('risk', { status: 'done', detail: `风险资讯 ${riskNews.length} 条` })

  // ---- step 6: 汇总 ----
  mark('summary', { status: 'running' })
  await delay(350)
  const signals = [...jdSignals, ...hiringSignals, ...sentimentSignals, ...riskSignals]
  const upTracks = heatChanges.filter((h) => h.direction === 'up').map((h) => h.track)
  const downTracks = heatChanges.filter((h) => h.direction === 'down').map((h) => h.track)
  const summary =
    `近 6 个月市场看，${upTracks.length ? upTracks.join('、') + '处于扩张通道' : '目标赛道整体平稳'}；` +
    `${downTracks.length ? downTracks.join('、') + '存在收缩压力，需控制单押风险；' : ''}` +
    `JD 普遍提高了对 AI 工具与复合技能的要求，建议对照报告中的热门要求补齐技能；` +
    `长期风险集中在 35 岁分流与技术替代，第 5~6 年的方向选择最为关键。`
  mark('summary', { status: 'done' })

  return {
    id: `research_${Date.now()}`,
    createdAt: new Date().toISOString(),
    source: 'local',
    // 本地数据集无实时搜索证据，明确标记为未核验（UI 据此显示「本地数据集」态）
    grounded: false,
    searchQueries: [],
    horizon: input.sandbox.horizon,
    periodNote: periodNote(),
    tasks,
    jdInsights,
    signals,
    heatChanges,
    sentimentSummary,
    riskNews,
    summary,
    stepStatus: steps,
  }
}

// ============ 确定性事实校验 / 自洽性检查 ============

export interface RuleCheckResult {
  issues: ValidationIssue[]
  checksPassed: number
  checksTotal: number
  score: number
}

/**
 * 规则引擎：对沙盘做机械性自洽性检查。
 * AI 模式与本地模式都会运行；AI 模式下与模型的市场交叉比对结果合并。
 */
export function runRuleChecks(input: ValidationInput | ResearchInput): RuleCheckResult {
  const issues: ValidationIssue[] = []
  let passed = 0
  let total = 0
  const profile = input.profile
  const routes = input.sandbox.routes
  const horizon = input.sandbox.horizon

  const check = (ok: boolean, issue: Omit<ValidationIssue, 'source'>) => {
    total++
    if (ok) {
      passed++
    } else {
      issues.push({ ...issue, source: 'rule' })
    }
  }

  for (const r of routes) {
    const name = r.name
    // 1. 薪资区间 min <= max
    const badRange = r.nodes.filter((n) => n.salaryRange[0] > n.salaryRange[1])
    check(badRange.length === 0, {
      routeId: r.id,
      routeName: name,
      field: 'salary',
      severity: 'high',
      message: `${badRange.map((n) => n.stage).join('、')} 阶段薪资下限高于上限，数据矛盾`,
      suggestion: '修正薪资区间，保证下限 ≤ 上限',
    })

    // 2. 薪资曲线不得大幅倒挂（后一阶段上限较前一下跌超过 20%）
    const dips: string[] = []
    for (let i = 1; i < r.nodes.length; i++) {
      const prev = r.nodes[i - 1].salaryRange[1]
      const cur = r.nodes[i].salaryRange[1]
      if (prev > 0 && cur < prev * 0.8) dips.push(`${r.nodes[i].stage}(${prev}K→${cur}K)`)
    }
    check(dips.length === 0, {
      routeId: r.id,
      routeName: name,
      field: 'salary',
      severity: dips.length > 1 ? 'high' : 'medium',
      message: `薪资曲线在 ${dips.join('、')} 出现超过 20% 的跳水且未在瓶颈说明中解释`,
      suggestion: '长周期薪资应整体上行；若为转岗阵痛，需在对应阶段 bottleneck 中说明原因',
    })

    // 3. 长周期节点完整性
    if (horizon >= 5) {
      check(r.nodes.length >= horizon + 1 - 1, {
        routeId: r.id,
        routeName: name,
        field: 'coherence',
        severity: 'high',
        message: `长周期推演应覆盖 ${horizon} 年（${horizon + 1} 个阶段），实际仅 ${r.nodes.length} 个节点`,
        suggestion: '补齐 year4 之后的缺失阶段',
      })
    }

    // 4. 阶段顺序连续
    const expected = ['current', 'year1', 'year2', 'year3', 'year4', 'year5', 'year6', 'year7', 'year8']
    const ordered = r.nodes.every((n, i) => n.stage === expected[i])
    check(ordered, {
      routeId: r.id,
      routeName: name,
      field: 'coherence',
      severity: 'medium',
      message: '阶段节点顺序与 current→yearN 的标准顺序不一致',
      suggestion: '节点必须按 current, year1, year2... 顺序排列',
    })

    // 5. 技能清单非空
    const emptySkill = r.nodes.filter((n) => n.requiredSkills.length === 0)
    check(emptySkill.length === 0, {
      routeId: r.id,
      routeName: name,
      field: 'skills',
      severity: 'low',
      message: `${emptySkill.map((n) => n.stage).join('、') || '部分'} 阶段缺少必备技能清单`,
      suggestion: '为每个阶段补充 3 个以上核心技能',
    })

    // 6. 内卷等级与分数自洽
    const expectedLevel = levelToInvolution(r.involutionScore)
    check(r.involutionLevel === expectedLevel, {
      routeId: r.id,
      routeName: name,
      field: 'coherence',
      severity: 'low',
      message: `内卷等级 "${r.involutionLevel}" 与内卷分数 ${r.involutionScore}/10 不匹配（应为 ${expectedLevel}）`,
      suggestion: `内卷等级应修正为 ${expectedLevel}`,
    })

    // 7. 分值范围
    check(
      r.matchScore >= 0 && r.matchScore <= 100 && r.involutionScore >= 1 && r.involutionScore <= 10,
      {
        routeId: r.id,
        routeName: name,
        field: 'coherence',
        severity: 'medium',
        message: '匹配度/内卷分数超出合法范围',
        suggestion: 'matchScore 应为 0~100，involutionScore 应为 1~10',
      }
    )

    // 8. 薪资期望可达性（与用户画像交叉）
    const terminal = r.salaryCurve[r.salaryCurve.length - 1]
    const minSal = profile.minSalaryK || 0
    if (minSal > 0 && terminal) {
      check(terminal.max >= minSal * 0.9, {
        routeId: r.id,
        routeName: name,
        field: 'match',
        severity: 'medium',
        message: `该路线终点薪资上限 ${terminal.max}K 仍低于你期望月薪 ${minSal}K 的 90%`,
        suggestion: '降低期望薪资、更换城市，或把该路线作为过渡而非主线',
      })
    }

    // 9. 不接受加班 vs 高内卷
    if (!profile.acceptOvertime) {
      check(r.involutionScore < 8, {
        routeId: r.id,
        routeName: name,
        field: 'match',
        severity: 'medium',
        message: `你不接受加班，但该路线内卷分数高达 ${r.involutionScore}/10`,
        suggestion: '优先选择低内卷路线，或在面试中确认实际加班强度',
      })
    }
  }

  // 10. 简历短板闭环
  const weaknesses = (profile.resume?.weaknesses || []).join('；')
  if (weaknesses) {
    const eduWeak = /学历|专科|本科|院校|硕士/.test(weaknesses)
    const highBarRoutes = routes.filter((r) =>
      /算法|芯片|半导体|AI|大模型|研究/.test(r.industry + r.name + r.nodes.map((n) => n.title).join())
    )
    if (eduWeak) {
      check(highBarRoutes.length === 0 || profile.schoolTier === '985' || profile.schoolTier === 'master' || profile.schoolTier === 'phd' || profile.schoolTier === 'overseas', {
        field: 'profile',
        severity: 'medium',
        message: '简历解析出学历短板，但沙盘中仍包含算法/芯片等高学历门槛路线',
        suggestion: '高门槛路线建议降级为备选，主线优先工程/应用层方向',
      })
    }
    const gapWeak = /空窗|跳槽|频繁|经验不足|经验有限/.test(weaknesses)
    if (gapWeak) {
      check(routes.some((r) => r.entryCost <= 3), {
        field: 'profile',
        severity: 'low',
        message: '简历存在经历空窗/经验不足短板，但推荐路线入门成本普遍偏高',
        suggestion: '优先保证一条低门槛、快就业的保底路线',
      })
    }
  }

  // 置信度：100 起步按问题严重度扣分
  let score = 100
  for (const iss of issues) {
    score -= iss.severity === 'high' ? 12 : iss.severity === 'medium' ? 6 : 3
  }
  score = Math.max(35, Math.min(98, score))

  return { issues, checksPassed: passed, checksTotal: total, score }
}

/** 本地模式（或 AI 校验失败兜底）：规则检查 + 基于调研报告的模板化市场修正 */
export function localValidateSandbox(input: ValidationInput): SandboxValidation {
  const rule = runRuleChecks(input)
  const { research, sandbox } = input

  const marketUpdates: string[] = []
  const riskCorrections: SandboxValidation['riskCorrections'] = []

  // JD 热门要求 vs 路线技能：沙盘未覆盖的热门要求 → 市场更新提示
  for (const jd of research.jdInsights) {
    const route = sandbox.routes.find((r) => r.id === jd.routeId)
    if (!route) continue
    const routeSkills = route.nodes.flatMap((n) => n.requiredSkills).join('')
    const missing = jd.hotRequirements.filter(
      (s) => !routeSkills.includes(s.replace(/\s/g, '').slice(0, 4))
    ).slice(0, 2)
    if (missing.length > 0) {
      marketUpdates.push(
        `【${route.name}】近 6 个月 JD 高频要求「${missing.join('、')}」未在沙盘技能清单中体现，建议补齐`
      )
    }
    if (jd.demandTrend === 'down') {
      marketUpdates.push(`【${route.name}】岗位需求量近 6 个月呈收缩趋势，沙盘需求判断偏乐观，建议下调预期`)
    }
  }
  for (const heat of research.heatChanges) {
    if (heat.direction === 'down') {
      marketUpdates.push(`【${heat.track}】赛道热度下行：${heat.detail}`)
    }
  }
  if (marketUpdates.length === 0) {
    marketUpdates.push('沙盘薪资与需求判断与近 6 个月本地数据集市场基调基本一致，未发现显著偏离。')
  }

  // 风险修正：按行业把调研风险映射到路线
  for (const r of sandbox.routes) {
    const related = research.riskNews.filter((news) => news.includes(r.industry) || news.includes(r.name))
    const seedRisk = related[0]
    if (seedRisk) {
      riskCorrections.push({
        routeId: r.id,
        routeName: r.name,
        severity: r.riskLevel >= 4 ? 'high' : 'medium',
        suggestion: seedRisk.replace(/^【[^】]+】/, '') + ' 建议：保持备选路线，避免单押。',
      })
    }
  }

  const highIssues = rule.issues.filter((i) => i.severity === 'high').length
  const summary =
    `规则引擎完成 ${rule.checksTotal} 项自洽性检查，通过 ${rule.checksPassed} 项；` +
    (highIssues > 0
      ? `发现 ${highIssues} 处高严重度矛盾，沙盘可信度受到明显影响，建议按问题清单修正后再参考。`
      : rule.issues.length > 0
      ? `未发现硬性矛盾，存在 ${rule.issues.length} 处需要注意的瑕疵；结合市场调研，整体结论可作为规划参考。`
      : '全部检查通过，路线内部自洽；市场调研未发现方向性偏离。') +
    '注意：本地校验基于内置数据集，在线 AI 模式可获得更贴近实时市场的交叉比对。'

  return {
    confidenceScore: rule.score,
    checksPassed: rule.checksPassed,
    checksTotal: rule.checksTotal,
    issues: rule.issues,
    marketUpdates: marketUpdates.slice(0, 8),
    riskCorrections,
    summary,
    source: 'local',
    validatedAt: new Date().toISOString(),
  }
}
