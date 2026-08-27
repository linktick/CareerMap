// Agent 链式深度市场调研提示词
// 链路：任务拆解 → 岗位JD调研 → 招聘动态&赛道热度 → 职场舆情&行业风险 → 汇总
// 每个步骤都是一次独立 LLM 调用，前序步骤的结构化产出作为上下文注入后续步骤，
// 模拟 Agent 的多步搜索-推理链。模型基于其掌握的国内招聘市场近况生成结论，
// source 字段需标注信息来源类型（BOSS直聘/猎聘/脉脉/行业报告等公开渠道）。

import type { ResearchInput } from '@/types/research'

function contextBlock(input: ResearchInput): string {
  return `【用户画像】
${JSON.stringify(input.profile, null, 2)}

【已生成的职业沙盘】推演年限 ${input.sandbox.horizon} 年
${JSON.stringify(
  {
    summary: input.sandbox.summary,
    routes: input.sandbox.routes.map((r) => ({
      id: r.id,
      name: r.name,
      industry: r.industry,
      nodes: r.nodes.map((n) => ({
        stage: n.stage,
        title: n.title,
        salaryRange: n.salaryRange,
        demandLevel: n.demandLevel,
      })),
    })),
  },
  null,
  2
)}`
}

const TODAY = (() => {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
})()

/** 步骤 1：任务拆解 —— 把调研需求拆成多条具体搜索任务 */
export function buildResearchPlanPrompt(input: ResearchInput): string {
  return `你是职业市场调研 Agent 的调度器。当前时间：${TODAY}。
请把下面这份职业沙盘的市场验证需求，拆解为 5~8 条具体的搜索调研任务，覆盖：
目标岗位近 3~6 个月 JD 与薪资、行业招聘动态（HC 扩张/收缩、大厂动作）、
赛道热度变化、职场舆情（加班/裁员/35岁/口碑）、行业风险资讯（政策/监管/技术替代）。

返回严格 JSON：
{
  "tasks": [
    {
      "id": "t1",
      "title": "任务一句话说明",
      "target": "调研对象（岗位名/行业/主题）",
      "keywords": ["搜索关键词1", "搜索关键词2"]
    }
  ]
}
只输出 JSON 对象。

${contextBlock(input)}`
}

/** 步骤 2：岗位 JD 调研 */
export function buildJdResearchPrompt(
  input: ResearchInput,
  tasks: { id: string; title: string; target: string; keywords: string[] }[]
): string {
  return `你是职业市场调研 Agent，负责【岗位 JD 深度检索】环节。当前时间：${TODAY}。
请基于近 3~6 个月国内主流招聘平台（BOSS直聘、猎聘、拉勾、智联、前程无忧等）公开 JD 的真实情况，
针对沙盘中每条路线的目标岗位，输出调研结论。薪资单位为 K/月，参考用户所在城市水平。

需要返回的路线（routeId 必须与沙盘一致）：
${input.sandbox.routes.map((r) => `- ${r.id}：${r.name}（${r.industry}）`).join('\n')}

本轮搜索任务清单：
${tasks.map((t) => `- [${t.id}] ${t.title}（关键词：${t.keywords.join('、')}）`).join('\n')}

返回严格 JSON：
{
  "jdInsights": [
    {
      "routeId": "route_1",
      "routeName": "路线名",
      "role": "对标的市场岗位名称",
      "salaryRange": [近3-6个月市场月薪下限, 上限],
      "demandTrend": "up|flat|down（近3-6个月岗位需求量走势）",
      "hotRequirements": ["JD 中新出现或频率明显升高的要求，如 AI 工具使用、特定框架、学历门槛提升"],
      "decliningRequirements": ["正在从 JD 中消失或贬值的旧要求"],
      "sampleTitles": ["代表性招聘岗位标题1", "标题2"],
      "note": "一句话 JD 趋势洞察"
    }
  ],
  "signals": [
    {
      "category": "jd",
      "title": "信号标题",
      "detail": "具体内容（含数据/现象）",
      "direction": "positive|neutral|negative",
      "source": "如：BOSS直聘 2026年Q2 JD 聚合"
    }
  ]
}
要求：jdInsights 每条路线一条；signals 给出 3~6 条最有价值的 JD 层面发现；
结论必须具体、可证伪，禁止"前景广阔"类空话。只输出 JSON 对象。

${contextBlock(input)}`
}

/** 步骤 3：行业招聘动态 + 赛道热度变化 */
export function buildHiringResearchPrompt(
  input: ResearchInput,
  priorSignals: { title: string; detail: string }[]
): string {
  return `你是职业市场调研 Agent，负责【行业招聘动态与赛道热度】环节。当前时间：${TODAY}。
请基于近 3~6 个月的公开信息（大厂财报/招聘公告、行业报告、投融资动态、招聘平台岗位量变化），
调研沙盘中各行业的招聘动态与赛道热度变化。

前序环节已发现的信号（请在此基础上推进，不要重复）：
${priorSignals.map((s) => `- ${s.title}：${s.detail}`).join('\n') || '（无）'}

返回严格 JSON：
{
  "signals": [
    {
      "category": "hiring 或 heat",
      "title": "信号标题（如：某大厂该赛道 HC 同比扩张 30%）",
      "detail": "具体内容，含公司/行业/数字/时间",
      "direction": "positive|neutral|negative",
      "source": "信息来源类型"
    }
  ],
  "heatChanges": [
    {
      "track": "赛道/行业名（与沙盘路线行业对应）",
      "direction": "up|flat|down",
      "detail": "近 3~6 个月热度变化的具体表现与原因，一句话"
    }
  ]
}
要求：signals 4~7 条，招聘动态(hiring)与赛道热度(heat)各占一半左右；
heatChanges 覆盖沙盘中出现的每个行业；只输出 JSON 对象。

${contextBlock(input)}`
}

/** 步骤 4：职场舆情 + 行业风险资讯 */
export function buildSentimentRiskPrompt(
  input: ResearchInput,
  priorSignals: { title: string; detail: string }[]
): string {
  return `你是职业市场调研 Agent，负责【职场舆情与行业风险资讯】环节。当前时间：${TODAY}。
请基于近 3~6 个月的公开舆情与资讯（脉脉/小红书/知乎职场讨论、新闻报道、监管政策、
裁员信息、技术替代趋势如 AI 对岗位的冲击），完成两部分调研：
1. 职场舆情：目标岗位/行业的从业者口碑、加班强度、裁员风波、35 岁现状、招聘歧视等；
2. 行业风险：政策监管、行业衰退、技术替代、地缘/资本周期等可能影响 3~8 年职业安全的风险资讯。

前序环节已发现的信号（请在此基础上推进，不要重复）：
${priorSignals.map((s) => `- ${s.title}：${s.detail}`).join('\n') || '（无）'}

返回严格 JSON：
{
  "sentimentSummary": "职场舆情总体判断，2~3 句话，含正反两面",
  "sentimentSignals": [
    {
      "category": "sentiment",
      "title": "信号标题",
      "detail": "具体舆情现象与出处类型",
      "direction": "positive|neutral|negative",
      "source": "如：脉脉职言 2026年Q2 热帖聚合"
    }
  ],
  "riskNews": [
    "近 3~6 个月具体行业风险资讯一条（含事件/政策/趋势 + 对该赛道从业者的影响）"
  ],
  "riskSignals": [
    {
      "category": "risk",
      "title": "风险信号标题",
      "detail": "风险内容与影响路径",
      "direction": "negative（风险信号统一 negative）",
      "source": "信息来源类型"
    }
  ]
}
要求：sentimentSignals 3~5 条；riskNews 4~8 条，必须具体到事件/政策/趋势，
禁止"注意行业变化"这类空话；只输出 JSON 对象。

${contextBlock(input)}`
}

// ============ Agent tool-use 循环提示词（function calling 模式） ============
//
// 与上面固定链路不同，Agent 模式下模型自主调用工具：
//   search_web(query)        → 后端执行真实联网搜索（方舟内置联网/博查/Tavily）
//   salary_benchmark(...)    → 本地确定性薪资数据集（城市系数 × 赛道数据集）
// 模型自行决定检索什么、检索几次，最后一次性输出完整报告 JSON。

/** Agent 模式调研提示词（作为 user 消息；system 仍用 SYSTEM_PROMPT） */
export function buildResearchAgentPrompt(input: ResearchInput): string {
  return `你是职业市场【深度调研 Agent】，当前时间：${TODAY}。你可以调用以下工具，请自主、多轮地使用它们完成调研：

1. search_web(query, focus?)：【真实联网搜索】。返回网页结果列表，每条含 title、url、snippet、publishedAt（发布日期，可能为空）、reliability（high/medium/low，按来源权威性评定）。
   - 你必须真实调用本工具来获取市场事实，禁止凭记忆编造薪资数字、招聘事件与新闻。
   - 检索要覆盖五类信息：①目标岗位近 3~6 个月 JD 与薪资 ②行业招聘动态（HC 扩张/收缩、大厂动作）③赛道热度变化 ④职场舆情（加班/裁员/35岁/口碑）⑤行业风险（政策/监管/技术替代）。
   - 每条路线的目标岗位薪资至少检索一次；检索词要具体（城市+岗位+年份，如「杭州 Java后端 招聘 薪资 2026」），总检索次数 6~10 次。
2. salary_benchmark(city, jobTitle)：本地确定性薪资参考数据集（基于历年薪酬报告估算，非实时）。用于与实时搜索结果交叉对照；当搜索薪资与参考值差异大时，以搜索证据为准并在 note 中说明。

【grounding 铁律 —— 必须严格遵守】
- 凡基于搜索结果的信号（signals），必须把该结果的 url 原样填入（禁止修改、拼接、编造任何 URL）；publishedAt 填工具返回的日期（无则空字符串）；reliability 参考工具返回值按来源平台判断（招聘平台/政府/权威财经=high，主流媒体/社区=medium，其他/未知=low）；source 填平台或媒体名称（如「BOSS直聘」「猎聘」「脉脉」「36氪」）。
- 如果 search_web 返回「搜索不可用/未配置」类结果：不要重试，立即改用你掌握的市场知识完成报告，报告顶层 grounded=false，所有信号 url 留空、reliability 给 medium 或 low，且绝对不许编造链接。
- 搜索成功且关键结论（薪资、动态、风险）有真实证据支撑时，grounded=true。
- 结论必须具体、可证伪（含数字/公司/时间），禁止「前景广阔」类空话；不确定的内容宁可不写。

完成检索后，最后一条消息【不要再调用工具】，直接输出完整报告 JSON，结构如下（只输出 JSON 对象）：
{
  "grounded": true/false,
  "tasks": [{ "id": "t1", "title": "任务一句话", "target": "调研对象", "keywords": ["检索关键词"] }],
  "jdInsights": [
    {
      "routeId": "必须与沙盘路线 id 一致", "routeName": "路线名",
      "role": "对标的市场岗位名称",
      "salaryRange": [近3-6个月市场月薪下限K, 上限K],
      "demandTrend": "up|flat|down",
      "hotRequirements": ["JD 中新出现或频率升高的要求"],
      "decliningRequirements": ["正在消失的旧要求"],
      "sampleTitles": ["代表性招聘岗位标题"],
      "note": "一句话 JD 趋势洞察（薪资有搜索来源时注明来源平台）"
    }
  ],
  "signals": [
    {
      "category": "jd|hiring|heat|sentiment|risk",
      "title": "信号标题",
      "detail": "具体内容（含数据/现象）",
      "direction": "positive|neutral|negative",
      "source": "平台/媒体名称",
      "url": "真实搜索结果链接，无证据留空",
      "publishedAt": "YYYY-MM 或 YYYY-MM-DD，无则空",
      "reliability": "high|medium|low"
    }
  ],
  "heatChanges": [{ "track": "赛道/行业名", "direction": "up|flat|down", "detail": "热度变化具体表现与原因" }],
  "sentimentSummary": "职场舆情总体判断，2~3 句，含正反两面",
  "riskNews": ["近 3~6 个月具体行业风险资讯（事件/政策/趋势 + 对从业者影响）"],
  "summary": "3~5 句调研总结：各路线最关键的利好与利空、用户最该关注的 2~3 个变化",
  "periodNote": "数据时间窗说明，如「2026年3月~2026年8月 实时联网检索 + 公开招聘舆情数据」"
}
要求：jdInsights 覆盖沙盘中每条路线；signals 10~16 条；heatChanges 覆盖沙盘每个行业；riskNews 4~8 条。

${contextBlock(input)}`
}

/** 步骤 5：汇总 */
export function buildResearchSummaryPrompt(
  input: ResearchInput,
  collected: {
    jdCount: number
    signalCount: number
    heatCount: number
    riskCount: number
  }
): string {
  return `你是职业市场调研 Agent 的汇总环节。当前时间：${TODAY}。
前序环节已完成：JD 调研 ${collected.jdCount} 条岗位结论、市场信号 ${collected.signalCount} 条、
热度变化 ${collected.heatCount} 条、风险资讯 ${collected.riskCount} 条。
请输出整份调研的最终结论。

返回严格 JSON：
{
  "summary": "3~5 句话的调研总结：当前市场对沙盘中各路线最关键的利好与利空分别是什么，用户最应该关注的 2~3 个变化",
  "periodNote": "数据时间窗说明，如「2026年3月~2026年8月公开招聘与舆情数据」",
  "extraSignals": [
    {
      "category": "heat|hiring|risk|sentiment|jd",
      "title": "前序环节遗漏、但对用户决策很关键的补充信号（没有则空数组）",
      "detail": "",
      "direction": "positive|neutral|negative",
      "source": ""
    }
  ]
}
只输出 JSON 对象。`
}
