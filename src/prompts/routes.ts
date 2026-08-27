import type { UserProfile } from '@/types/career'

/**
 * 路线推演提示词。
 * - 常规模式：3 年期、4 个节点（current/year1/year2/year3）、3~5 条路线
 * - 长周期深度推演（deepMode）：8 年期、9 个节点（current + year1~year8）、3 条路线，
 *   要求全程上下文一致、逻辑自洽、长期趋势稳定、前后无矛盾
 */
export function buildRoutesPrompt(profile: UserProfile): string {
  const deep = !!profile.deepMode

  if (!deep) {
    return `请根据以下用户信息，生成 3~5 条 3 年期职业发展路线沙盘。
返回 JSON，结构严格遵循：

{
  "routes": [
    {
      "id": "route_1",
      "name": "路线名称",
      "summary": "一句话定位，不超过30字",
      "industry": "所属行业",
      "involutionLevel": "low|medium|high",
      "involutionScore": 1-10整数,
      "matchScore": 0-100整数,
      "nodes": [
        {
          "stage": "current|year1|year2|year3",
          "title": "岗位名称",
          "salaryRange": [minK, maxK],
          "demandLevel": 1-5整数,
          "bottleneck": "这个阶段的核心瓶颈，一句话",
          "requiredSkills": ["技能1"],
          "certificates": ["证书名，没有则空数组"]
        }
      ],
      "salaryCurve": [
        {"stage":"current","min":数字,"max":数字},
        {"stage":"year1","min":数字,"max":数字},
        {"stage":"year2","min":数字,"max":数字},
        {"stage":"year3","min":数字,"max":数字}
      ],
      "pitfalls": ["踩坑预警1"],
      "entryCost": 1-5整数,
      "switchDifficulty": 1-5整数,
      "ceiling": "晋升天花板描述",
      "riskLevel": 1-5整数
    }
  ],
  "summary": "整体市场环境一句话总结",
  "horizon": 3
}

用户信息：
${JSON.stringify(profile, null, 2)}

现在只输出 JSON 对象。`
  }

  // ===== 长周期深度推演 =====
  return `请根据以下用户信息，执行【长周期深度推演】：生成 3 条未来 8 年（current + year1~year8，共 9 个阶段）的超长周期连贯职业发展路线沙盘。

【长周期推演铁律 —— 必须逐条满足】
1. 上下文一致性：每条路线 9 个阶段必须是同一条职业轨迹的自然延伸，岗位 title、技能栈、行业方向前后承接，不得中途无故换行、跳行或出现与前期无关的岗位。
2. 逻辑自洽：薪资曲线必须符合该赛道真实成长规律——前期涨幅快、中后期涨幅递减但不跳水；salaryRange 的 min 不得大于 max；后一阶段薪资上限不得无故低于前一阶段上限的 80%（转岗阵痛期可小幅回落，但必须在 bottleneck 中明确解释原因）。
3. 长期趋势稳定：demandLevel（岗位需求）、involutionScore（内卷度）在 8 年尺度上的演变必须有合理的产业逻辑（如 AI 对初级岗位的替代、35 岁后管理/专家分流、行业周期起伏），不得逐年随机跳变。
4. 无前后矛盾：pitfalls、ceiling、riskLevel 必须与 nodes 中展现的轨迹一致；ceiling 描述的是第 8 年前后真实触达的天花板，不得与 year7/year8 的岗位 title 矛盾。
5. 短板闭环：用户信息中若包含简历解析出的 weaknesses（短板），路线设计必须体现短板如何被弥补或绕行（在 bottleneck / pitfalls 中体现）。
6. 每条路线必须包含关键分岔点（如 year3 前后的"管理线 vs 专家线"、year5 前后的"深耕 vs 转行窗口"），在对应年份的 bottleneck 中点明。
7. 数据真实到残酷：8 年尺度上的 35 岁危机、学历天花板、行业衰退风险、AI 替代风险都要如实反映，不得鸡汤化。

返回 JSON，结构严格遵循：

{
  "routes": [
    {
      "id": "route_1",
      "name": "路线名称",
      "summary": "一句话定位，不超过30字",
      "industry": "所属行业",
      "involutionLevel": "low|medium|high",
      "involutionScore": 1-10整数,
      "matchScore": 0-100整数,
      "nodes": [
        {
          "stage": "current|year1|year2|year3|year4|year5|year6|year7|year8",
          "title": "岗位名称",
          "salaryRange": [minK, maxK],
          "demandLevel": 1-5整数,
          "bottleneck": "这个阶段的核心瓶颈/分岔点，一句话",
          "requiredSkills": ["技能1"],
          "certificates": ["证书名，没有则空数组"]
        }
        // 共 9 个节点，stage 依次为 current,year1,year2,year3,year4,year5,year6,year7,year8，一个不能少
      ],
      "salaryCurve": [
        {"stage":"current","min":数字,"max":数字}
        // 共 9 个点，与 nodes 一一对应
      ],
      "pitfalls": ["踩坑预警1（含 35 岁危机、行业周期、AI 替代等长期风险）"],
      "entryCost": 1-5整数,
      "switchDifficulty": 1-5整数,
      "ceiling": "第 8 年前后的晋升天花板描述",
      "riskLevel": 1-5整数
    }
  ],
  "summary": "整体市场环境与 8 年长期趋势的总结（2~3 句话）",
  "horizon": 8
}

用户信息（若含 resume 字段则为简历视觉解析结果，请优先采信并体现短板闭环）：
${JSON.stringify(profile, null, 2)}

现在只输出 JSON 对象。`
}
