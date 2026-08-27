// 职业动态模块 - AI 情报采集 prompt
// 让大模型扮演"行业情报分析师"，基于训练数据中最新的国内招聘市场信息，
// 输出指定赛道的结构化情报快照。
// 前端把监控赛道拆成小批次（每批 ≤4 个）并发请求，因此 prompt 要求紧凑输出，
// 既省 token 又避免推理模型在长任务上深度思考导致单请求耗时数分钟。

export interface IntelTarget {
  id: string
  name: string
  tags: string[]
}

export function buildIntelPrompt(targets: IntelTarget[], today: string): string {
  const list = targets
    .map((t, i) => `${i + 1}. ${t.name}${t.tags.length ? `（参考标签：${t.tags.join('/')}）` : ''}`)
    .join('\n')

  return `今天是 ${today}。你是职业市场情报分析师，基于你掌握的国内招聘市场最新信息（主流招聘平台 JD 数量与薪资、行业政策、大厂招聘动作、资本与舆论热度），为以下 ${targets.length} 个赛道输出最新一期情报快照。

【待采集赛道】
${list}

【输出要求】
只输出一个 JSON 对象，不要 markdown 代码块、不要任何解释文字，结构与字段约束如下：
{
  "industries": [
    {
      "name": "赛道名称（必须与给定名称严格一致）",
      "tags": ["3~4 个短标签，如 风口/收缩/蓝海/政策扶持/高薪/供给过剩"],
      "heatScore": 0~100 的整数热度,
      "heatLevel": "hot | cooling | blueocean | steady 四选一",
      "demandLevel": 1~5 的整数招聘需求强度,
      "competition": 1~5 的整数竞争/内卷强度,
      "trend": "up | flat | down 三选一（近 1~3 个月走势）",
      "summary": "一句话最新动态，≤40 字，要具体、禁止空话",
      "hotSkills": ["当下抢手技能 4~6 个，每个 2~6 字"],
      "decliningSkills": ["正在贬值的技能 0~3 个，没有给空数组"],
      "signals": ["近期关键动向 2 条，每条 ≤30 字：招聘放量/冻结、政策、大厂动作、薪资变化"],
      "opportunities": ["面向求职者的机会点 2 条，每条 ≤25 字"],
      "risks": ["风险预警 2 条，每条 ≤25 字，要直白：裁员、门槛、过剩、政策风险"],
      "salaryJunior": [初级岗位月薪下限K, 上限K],
      "salaryMid": [3~5年经验月薪下限K, 上限K],
      "salaryYoY": 薪资同比变化百分比整数（正涨负跌）
    }
  ]
}

【判断标准】
- hot=招聘旺盛、关注度高、薪资上行；cooling=JD 收缩、裁员降薪、供给过剩或政策打压；
  blueocean=需求增长但竞争少的小众方向；steady=结构性平稳。
- 数据要"真实到残酷"：缩招、35岁危机、学历门槛、行业骗局如实反映，禁止鸡汤。
- 薪资单位为人民币 K（千）/月，参考全国市场水平。
- 必须覆盖全部 ${targets.length} 个赛道，一个不能少；名称严格一致；只输出 JSON。`
}
