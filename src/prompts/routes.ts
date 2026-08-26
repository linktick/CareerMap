import type { UserProfile } from '@/types/career'

export function buildRoutesPrompt(profile: UserProfile): string {
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
  "summary": "整体市场环境一句话总结"
}

用户信息：
${JSON.stringify(profile, null, 2)}

现在只输出 JSON 对象。`
}
