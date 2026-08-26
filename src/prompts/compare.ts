import type { CareerRoute, UserProfile } from '@/types/career'

export function buildComparePrompt(profile: UserProfile, routes: CareerRoute[]): string {
  return `请对以下多条职业路线进行横向对比分析，并给出客观中立的选择建议。

评分维度统一用 1~5 分（5 为最高/最强/最难，注意方向）：
- entryCost：入门学习成本，5=最难
- threeYearSalaryMax：3年薪资上限（数字，单位K）
- involution：内卷程度，5=最卷
- switchDifficulty：转行难度，5=最难
- ceiling：晋升天花板，用文字描述
- riskLevel：风险等级，5=最高
- matchScore：与该用户匹配度，0~100

选择建议要求：
- 不替用户做决定，分情况讨论（"如果你最看重X，选Y；如果你最看重A，选B"）
- 必须提到每条路线的核心 trade-off
- 结尾加一句风险提示

返回 JSON 严格结构：
{
  "comparison": [
    {
      "routeId": "id",
      "entryCost": 数字,
      "threeYearSalaryMax": 数字,
      "involution": 数字,
      "switchDifficulty": 数字,
      "ceiling": "文字",
      "riskLevel": 数字,
      "matchScore": 数字
    }
  ],
  "advice": "选择建议正文，200~400字"
}

用户信息：${JSON.stringify(profile)}
路线列表：${JSON.stringify(routes)}

只输出 JSON 对象。`
}
