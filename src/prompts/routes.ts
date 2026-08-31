import type { UserProfile } from '@/types/career'
import { buildSalaryAnchorTable } from '@/adapters/local/benchmark'

/**
 * 路线推演提示词。
 * - 常规模式：3 年期、4 个节点（current/year1/year2/year3）、3~5 条路线
 * - 长周期深度推演（deepMode）：8 年期、9 个节点（current + year1~year8）、3 条路线，
 *   要求全程上下文一致、逻辑自洽、长期趋势稳定、前后无矛盾
 */
export function buildRoutesPrompt(profile: UserProfile): string {
  const deep = !!profile.deepMode
  const { table: anchorTable, cityFactor: cf } = buildSalaryAnchorTable(profile)

  // 注入提示词的写实薪资基准约束（数值已按用户城市系数折算）
  const salaryRules = `【薪资基准铁律 —— 所有 salaryRange / salaryCurve 数值必须遵守】
以下为该城市（初中级岗城市系数 ${cf}）真实市场基准，单位 K/月（税前），数值随资历段递进：
${anchorTable}
规则：
1. 起薪对齐"起薪"列：应届/实习对应起薪下沿，1 年经验对应起薪区间；转行人员前 1~2 年按转行阵痛取区间下沿。
2. 3 年经验对齐"3 年"列，不得超出该列上限的 1.15 倍。
3. "资深天花板"列是该城市本地市场 10 年以上资深岗的真实月薪上限，已按城市等级折算：三四线城市的资深岗薪资天花板远低于一线（本地企业没有专家/总监级岗位 HC，资深人才集中在一线/新一线），任何阶段薪资都不得超过该列上限；year8 资深岗通常落在天花板列的 70%~100% 区间。严禁用北上广深的薪资水平填写三四线城市的资深岗薪资。
4. 学历修正：985/硕士可取区间中上沿，博士在算法/研究类可取上沿，大专取区间下沿；普通本科取中位。
5. 公务员/事业编/教师等体制内路线薪资低但稳定，严禁套用互联网薪资；销售/直播类区间宽（提成波动大），但底薪部分不得超过起薪列。
6. 薪资必须随资历单调上行（转行阵痛年可小幅回落并在 bottleneck 解释），严禁出现应届生薪资高于 3 年经验、或 year8 数值反超天花板等离谱数据。`


  // 用户画像中的 targetIndustries 字段语义为「目标岗位」（可多选、可手动输入，
  // 元素通常是具体岗位名，如"前端工程师""数据分析师"，也可能是行业方向词）
  const targetRules = `【目标岗位铁律】
用户信息 targetIndustries 字段是用户明确选择/输入的「目标岗位」（按优先级排序，可能是具体岗位名）：
1. 必须为每个目标岗位生成直接对应的路线，路线 name 要包含该岗位名（如目标含"前端工程师"，则应给出"前端工程师路线"），且这些路线排在最前。
2. 目标岗位路线的 nodes 岗位 title、requiredSkills、certificates 必须围绕该岗位真实的晋升路径展开，不得答非所问。
3. 除目标岗位路线外，可结合用户专业背景补充 1~2 条邻近或稳妥备选路线，但严禁返回与目标岗位、专业背景完全无关的方向。
4. 目标岗位为空时，按用户「所学专业/当前岗位 + 技能」智能推荐最匹配的方向。`

  // 用户资历对齐与体制内最新报考口径（常规/长周期两种模式共用）
  const experienceRules = `【资历对齐铁律 —— current 节点必须是用户真实状态，严禁把有工作经验的人写成应届起步】
- yearsOfExperience 字段单位为「月」（÷12 = 工作年数）。identity 为 professional 且有 N 年相关经验时，current 节点的 title/salaryRange/requiredSkills 必须对齐第 N 年资历段（如 3 年经验不得写"应届/实习/助理"，5 年经验不得从初级岗写起），year1~yearN 是从该资历向资深的自然延伸，薪资随资历单调上行。
- 转行用户（目标岗位与其专业/技能背景不相关）：current 可保留现职业或写"转行备考/过渡"并在 bottleneck 说明，新方向 year1 起按转行阵痛从初中级区间起步。
- 公务员/事业编/教师编等备考路线例外：current 为备考期（salaryRange [0,0] 或现职业收入），year1 为试用期/新入职——往届工龄不抵体制内职级，有工作经验的备考者也从备考期写起。
- 体制内报考口径必须为最新：公务员/事业单位报考年龄一般为 18~38 周岁（应届硕博可放宽至 42 周岁，以当年公告为准），行测为含政治理论在内的六大模块（言语理解、判断推理、资料分析、数量关系、常识判断、政治理论）；pitfalls/bottleneck 涉及报考门槛时，严禁出现"35 岁不能报考"之类过时表述。`

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

${salaryRules}

${targetRules}

${experienceRules}

用户信息（targetIndustries 字段即「目标岗位」）：
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

${salaryRules}
7. 8 年薪资路径必须落在基准表内：year1~year3 对齐"起薪→3 年"列，year4~year8 从"3 年"列向"资深天花板"列渐进，year8 不得超过天花板列上限；前期涨幅快、后期涨幅递减，严禁线性外推编造天价薪资。

${targetRules}
8. 目标岗位路线的 9 个阶段必须是该岗位从当前资历到资深（专家/管理分岔）的连贯轨迹，分岔点与瓶颈要贴合该岗位的真实发展规律。

${experienceRules}

用户信息（targetIndustries 字段即「目标岗位」；若含 resume 字段则为简历视觉解析结果，请优先采信并体现短板闭环）：
${JSON.stringify(profile, null, 2)}

现在只输出 JSON 对象。`
}
