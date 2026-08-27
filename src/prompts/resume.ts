// 简历图片视觉解析提示词
// 用户上传简历截图/照片后，多模态大模型识别学历、技能、工作经历、项目经验、短板，
// 输出结构化 JSON，前端据此自动回填推演参数，无需用户手动输入。

export function buildResumePrompt(): string {
  return `这是一张用户的简历图片（可能是截图或拍照，中文简历为主）。
请进行视觉识别与信息抽取，输出严格 JSON：

{
  "education": {
    "school": "毕业院校名称（识别不到为空字符串）",
    "tier": "院校层次：985|211|master|phd|regular|junior|overseas|other（本科院校按办学层次填 985/211/regular/junior；硕士填 master；博士填 phd；海外院校填 overseas；无法判断填 other）",
    "major": "专业名称",
    "degree": "学历：专科|本科|硕士|博士|MBA 等"
  },
  "skills": ["从技能栏/项目描述中识别出的具体技能，如 Vue3、Java、SQL、项目管理、PS……去重后 5~15 个"],
  "workExperience": [
    "每条工作经历提炼为一行：时间段 + 公司 + 岗位 + 核心职责/成果，如 '2022.07-2024.03 某科技公司 前端工程师，负责 XX 系统开发'"
  ],
  "projects": [
    "每条项目经验提炼为一行：项目名 + 角色 + 技术栈/方法 + 可量化成果，如 'XX 商城重构：担任前端负责人，Vue3+TS，首屏加载提升 40%'"
  ],
  "weaknesses": [
    "基于简历内容客观识别的短板/风险点，每项一句话，例如：'工作经历不足 1 年，项目深度有限'、'技能集中在传统行业，缺少互联网项目'、'有 8 个月职业空窗期'、'学历为专科，大厂简历关受限'、'项目描述缺少量化成果'、'未体现管理经验，向管理岗转型证据不足'。没有明显短板时返回空数组"
  ],
  "rawSummary": "用 2~3 句话概括这份简历的画像：什么背景、几年经验、核心能力方向、当前职业阶段",
  "yearsOfExperience": "根据工作经历起止时间计算的总从业月数（整数，在校生无全职经验填 0；无法判断填 null）",
  "identity": "student|fresh|professional：在校生/应届填 student 或 fresh，有正式工作经历填 professional；无法判断填 professional"
}

要求：
1. 只输出 JSON 对象，不要 markdown 代码块，不要任何解释。
2. 图片不是简历、或文字无法辨认时，返回 { "education": {}, "skills": [], "workExperience": [], "projects": [], "weaknesses": ["简历图片无法辨认，请重新上传清晰照片或手动填写"], "rawSummary": "", "yearsOfExperience": null, "identity": null }。
3. 短板识别要"真实到残酷"：空窗期、频繁跳槽、技能陈旧、学历门槛、缺乏量化成果、经验与目标不匹配等都要指出，不得美化。
4. 所有字段必须存在，数组类字段没有内容时返回空数组。`
}
