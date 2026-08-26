import type { CareerRoute, UserProfile } from '@/types/career'

export function buildGrowthPrompt(profile: UserProfile, route: CareerRoute): string {
  return `请为下面这位用户，针对指定职业路线，生成未来 12 个月按月拆分的能力成长方案。

要求：
- 每月一个明确主题
- 学习任务要具体到技术/工具/知识点，不要"提升沟通能力"这种空话
- 实践项目要可独立完成，1~2 个
- 求职动作按月推进（简历→作品集→投递→面试→谈薪）
- 证书备考要给具体月份区间，没有行业公认证书就返回空字符串
- 月度重点提醒要说真话：常见误区、时间分配、避坑点
- 用户已掌握的技能，相关任务标注为"review"而非"new"

返回 JSON 严格结构：
{
  "routeId": "路线id",
  "routeName": "路线名",
  "targetRole": "12个月后目标岗位",
  "goalSummary": "12个月总目标，50字以内",
  "targetSalary": [minK, maxK],
  "months": [
    {
      "month": 1,
      "theme": "本月主题",
      "learningTasks": [{"task":"具体任务","done":false,"type":"new|review"}],
      "practiceProjects": ["项目1"],
      "jobActions": "求职动作，没有则空字符串",
      "certPrep": "证书备考内容，无则空字符串",
      "keyReminder": "本月重点提醒，一句话真话"
    }
  ]
}

用户信息：${JSON.stringify(profile)}
选定路线：${JSON.stringify(route)}

只输出 JSON 对象。`
}
