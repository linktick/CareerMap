// 沙盘事实校验 / 交叉比对 / 自洽性检查提示词
// 在 Agent 链式市场调研完成后执行：把沙盘结论与调研发现交叉比对，
// 输出置信度分数（0-100）、市场动态更新提示、赛道风险修正建议。

import type { ValidationInput } from '@/types/research'

export function buildValidationPrompt(input: ValidationInput): string {
  return `你是职业沙盘的【事实校验 Agent】。当前时间：${new Date().getFullYear()}年${new Date().getMonth() + 1}月。
请对下面这套职业沙盘数据做三类检查，并结合刚完成的市场调研报告交叉比对：

1. 事实校验：沙盘中的薪资区间、岗位需求、技能要求与近 3~6 个月真实市场（见调研报告）是否相符？
   找出薪资明显偏离市场、需求判断与调研趋势相反、技能要求陈旧/遗漏的条目。
2. 交叉比对：沙盘各路线之间、路线与用户画像之间是否匹配？
   如：用户不接受加班却推荐高内卷路线、用户学历短板未在路线中体现、薪资期望与路线可达性矛盾。
3. 自洽性检查：单条路线内部是否前后矛盾？
   如：薪资曲线倒挂、岗位 title 与阶段不匹配、ceiling 与末期岗位矛盾、需求趋势与内卷度矛盾。

输出严格 JSON：
{
  "confidenceScore": 0-100整数,
  "issues": [
    {
      "routeId": "对应路线 id（全局性问题留空字符串）",
      "routeName": "路线名（全局性问题留空）",
      "field": "问题维度：salary|demand|skills|match|coherence|profile|risk",
      "severity": "high|medium|low",
      "message": "具体问题，必须指出是哪个阶段/哪个数字与什么证据矛盾",
      "suggestion": "可执行的修正建议，一句话"
    }
  ],
  "marketUpdates": [
    "市场动态更新提示：沙盘结论需要根据最新市场注意的变化，每条一句话，如「AI 应用岗 JD 中明确要求会用 Cursor/Copilot 的比例升至 60%，沙盘技能清单未体现」"
  ],
  "riskCorrections": [
    {
      "routeId": "route_1",
      "routeName": "路线名",
      "severity": "high|medium|low",
      "suggestion": "赛道风险修正建议：基于调研发现的风险，该路线应如何调整预期或增加对冲，一句话"
    }
  ],
  "summary": "2~4 句话总结：这套沙盘整体可信度如何、最主要的风险点是什么、用户最该听进去的一条建议"
}

评分标准（confidenceScore）：
- 90+：薪资/需求/技能与市场高度吻合，路线内部完全自洽，与用户画像匹配；
- 75~89：个别数字偏差但结论方向正确；
- 60~74：存在多处与市场偏离或自洽性瑕疵；
- 60 以下：有方向性错误或严重矛盾。
本地规则引擎已做基础自洽性检查，你的分数应主要反映【与市场事实的吻合度】，
issues 只输出你在市场交叉比对中发现的问题（不要重复纯机械性错误），3~8 条即可。
只输出 JSON 对象。

【用户画像】
${JSON.stringify(input.profile, null, 2)}

【职业沙盘】推演年限 ${input.sandbox.horizon} 年
${JSON.stringify(
  {
    summary: input.sandbox.summary,
    routes: input.sandbox.routes.map((r) => ({
      id: r.id,
      name: r.name,
      industry: r.industry,
      involutionScore: r.involutionScore,
      matchScore: r.matchScore,
      riskLevel: r.riskLevel,
      ceiling: r.ceiling,
      pitfalls: r.pitfalls,
      nodes: r.nodes.map((n) => ({
        stage: n.stage,
        title: n.title,
        salaryRange: n.salaryRange,
        demandLevel: n.demandLevel,
        requiredSkills: n.requiredSkills,
      })),
    })),
  },
  null,
  2
)}

【市场调研报告】
${JSON.stringify(
  {
    periodNote: input.research.periodNote,
    summary: input.research.summary,
    jdInsights: input.research.jdInsights,
    heatChanges: input.research.heatChanges,
    sentimentSummary: input.research.sentimentSummary,
    riskNews: input.research.riskNews,
    signals: input.research.signals,
  },
  null,
  2
)}`
}

/**
 * Agent 版校验提示词（function calling 模式）。
 * 工具：run_rule_checks（本地 10 项确定性规则）+ search_web（实时联网核验）。
 * 与固定链路版的区别：关键薪资/需求断言必须经实时搜索外部核验，
 * 置信度才真正反映「与市场事实的吻合度」而非模型自我印证。
 */
export function buildValidationAgentPrompt(input: ValidationInput): string {
  return `你是职业沙盘的【事实校验 Agent】，当前时间：${new Date().getFullYear()}年${new Date().getMonth() + 1}月。你可以调用工具：

1. run_rule_checks()：本地确定性规则引擎，返回机械性自洽检查结果（薪资倒挂、曲线完整性、字段矛盾等 10 项）。【先调用它】——这些问题系统会自动合并展示，你不要重复报告；但若你发现规则未覆盖的市场层面问题，仍应输出。
2. search_web(query)：【真实联网搜索】。请挑选 2~4 条最关键、最可证伪的市场断言做外部核验，例如：某路线「杭州 3 年经验 Java 后端月薪 25-40K」是否符合当前真实招聘市场、某赛道「HC 同比扩张 30%」是否有公开证据、JD 是否真的普遍要求某技能。检索词要具体（城市+岗位+年份）。
   - 核验结论写入 verifications：{ "claim": "被核验的断言", "verdict": "confirmed|partly|contradicted", "url": "证据链接（必须来自工具返回，禁止编造，搜索不可用则留空）" }。
   - issues 中由搜索证据支撑的问题，evidenceUrl 填对应证据链接。
   - 如果 search_web 返回「搜索不可用」：不要重试，groundedChecks 填 0、verifications 留空数组，仅基于调研报告与你的知识完成校验，且不要编造任何链接。

检查三类问题：
1. 事实校验：薪资区间、岗位需求、技能要求与近 3~6 个月真实市场（搜索证据 + 调研报告）是否相符；
2. 交叉比对：路线之间、路线与用户画像是否匹配（不接受加班却推高内卷路线、学历短板未体现、薪资期望矛盾等）；
3. 自洽性检查：单条路线内部矛盾（薪资倒挂、title 与阶段不匹配、ceiling 矛盾等）。

最后一条消息【不要再调用工具】，直接输出严格 JSON（只输出 JSON 对象）：
{
  "confidenceScore": 0-100整数,
  "groundedChecks": 你实际完成外部核验的断言数（未使用搜索填 0）,
  "verifications": [{ "claim": "", "verdict": "confirmed|partly|contradicted", "url": "" }],
  "issues": [
    {
      "routeId": "路线 id（全局性问题留空字符串）", "routeName": "路线名（全局留空）",
      "field": "salary|demand|skills|match|coherence|profile|risk",
      "severity": "high|medium|low",
      "message": "具体问题，必须指出哪个阶段/哪个数字与什么证据矛盾",
      "suggestion": "可执行的修正建议，一句话",
      "evidenceUrl": "核验该问题的搜索证据链接，无则空字符串"
    }
  ],
  "marketUpdates": ["市场动态更新提示，每条一句话，如「AI 应用岗 JD 明确要求会用 Cursor/Copilot 比例升至 60%，沙盘技能清单未体现」"],
  "riskCorrections": [{ "routeId": "route_1", "routeName": "路线名", "severity": "high|medium|low", "suggestion": "基于调研/核验发现的风险，该路线应如何调整预期，一句话" }],
  "summary": "2~4 句话：沙盘整体可信度、最主要风险点、用户最该听进去的一条建议"
}
评分标准（confidenceScore）：90+ 与市场高度吻合且完全自洽；75~89 个别数字偏差；60~74 多处偏离；60 以下方向性错误。
issues 聚焦市场交叉比对问题，3~8 条即可。

【用户画像】
${JSON.stringify(input.profile, null, 2)}

【职业沙盘】推演年限 ${input.sandbox.horizon} 年
${JSON.stringify(
  {
    summary: input.sandbox.summary,
    routes: input.sandbox.routes.map((r) => ({
      id: r.id,
      name: r.name,
      industry: r.industry,
      involutionScore: r.involutionScore,
      matchScore: r.matchScore,
      riskLevel: r.riskLevel,
      ceiling: r.ceiling,
      pitfalls: r.pitfalls,
      nodes: r.nodes.map((n) => ({
        stage: n.stage,
        title: n.title,
        salaryRange: n.salaryRange,
        demandLevel: n.demandLevel,
        requiredSkills: n.requiredSkills,
      })),
    })),
  },
  null,
  2
)}

【市场调研报告】
${JSON.stringify(
  {
    periodNote: input.research.periodNote,
    grounded: input.research.grounded ?? false,
    summary: input.research.summary,
    jdInsights: input.research.jdInsights,
    heatChanges: input.research.heatChanges,
    sentimentSummary: input.research.sentimentSummary,
    riskNews: input.research.riskNews,
    signals: input.research.signals,
  },
  null,
  2
)}`
}
