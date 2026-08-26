import type { CareerRoute, CareerSandbox, GrowthPlan } from '@/types/career'
import { involutionColor, involutionText, scoreStars } from '@/utils/format'
import dayjs from 'dayjs'

function routeSection(route: CareerRoute): string {
  const rows = route.nodes
    .map((n, i) => {
      const stage = ['现在', 'Year 1', 'Year 2', 'Year 3'][i]
      return `
        <tr>
          <td style="padding:6px 10px;border:1px solid #eee;color:#666">${stage}</td>
          <td style="padding:6px 10px;border:1px solid #eee"><b>${n.title}</b></td>
          <td style="padding:6px 10px;border:1px solid #eee">${n.salaryRange[0]}-${n.salaryRange[1]}K</td>
          <td style="padding:6px 10px;border:1px solid #eee;color:#888;font-size:12px">${n.bottleneck}</td>
        </tr>`
    })
    .join('')

  return `
    <div style="margin-bottom:24px;page-break-inside:avoid">
      <h3 style="margin:0 0 6px;font-size:16px;color:#1f2937;border-left:4px solid ${involutionColor(route.involutionLevel)};padding-left:10px">
        ${route.name}
        <span style="font-size:12px;color:${involutionColor(route.involutionLevel)};font-weight:normal;margin-left:8px">
          ${involutionText(route.involutionLevel)} · 匹配度 ${route.matchScore}
        </span>
      </h3>
      <p style="margin:4px 0 10px;color:#666;font-size:13px">${route.summary}</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:6px 10px;border:1px solid #eee;text-align:left;color:#555">阶段</th>
            <th style="padding:6px 10px;border:1px solid #eee;text-align:left;color:#555">岗位</th>
            <th style="padding:6px 10px;border:1px solid #eee;text-align:left;color:#555">薪资</th>
            <th style="padding:6px 10px;border:1px solid #eee;text-align:left;color:#555">瓶颈</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="display:flex;gap:12px;margin-top:12px;font-size:12px;color:#555;flex-wrap:wrap">
        <span>入门成本：${scoreStars(route.entryCost)}</span>
        <span>转行难度：${scoreStars(route.switchDifficulty)}</span>
        <span>风险等级：${scoreStars(route.riskLevel)}</span>
        <span>天花板：${route.ceiling}</span>
      </div>
      <div style="margin-top:10px;background:#fff2f0;border-left:3px solid #ff4d4f;padding:8px 12px;border-radius:4px;font-size:12px;color:#a8071a">
        <b>踩坑预警：</b>
        <ul style="margin:4px 0 0 18px;padding:0">${route.pitfalls.map((p) => `<li>${p}</li>`).join('')}</ul>
      </div>
    </div>
  `
}

function growthSection(plan: GrowthPlan): string {
  return `
    <div style="margin-top:24px" class="page-break">
      <h2 style="font-size:18px;color:#1f2937;border-bottom:2px solid #1677ff;padding-bottom:6px">
        12 个月成长方案：${plan.routeName}
      </h2>
      <p style="color:#555;font-size:13px">
        目标岗位：<b>${plan.targetRole}</b>　目标薪资：<b>${plan.targetSalary[0]}-${plan.targetSalary[1]}K</b>
      </p>
      <p style="color:#666;font-size:13px">${plan.goalSummary}</p>
      ${plan.months
        .map(
          (m) => `
        <div style="margin:14px 0;padding:12px 14px;border:1px solid #e5e7eb;border-radius:8px;page-break-inside:avoid">
          <div style="font-weight:600;color:#1677ff;margin-bottom:6px">M${m.month} · ${m.theme}</div>
          <div style="font-size:13px;color:#333"><b>学习：</b>${m.learningTasks.map((t) => t.task).join('；')}</div>
          ${m.practiceProjects.length ? `<div style="font-size:13px;color:#333;margin-top:4px"><b>实践：</b>${m.practiceProjects.join('；')}</div>` : ''}
          ${m.jobActions ? `<div style="font-size:13px;color:#333;margin-top:4px"><b>求职：</b>${m.jobActions}</div>` : ''}
          ${m.certPrep ? `<div style="font-size:13px;color:#333;margin-top:4px"><b>证书：</b>${m.certPrep}</div>` : ''}
          <div style="font-size:12px;color:#a8071a;margin-top:6px"><b>提醒：</b>${m.keyReminder}</div>
        </div>`
        )
        .join('')}
    </div>
  `
}

function buildHTML(sandbox: CareerSandbox, selectedRoute?: CareerRoute, plan?: GrowthPlan): string {
  const date = dayjs().format('YYYY-MM-DD HH:mm')
  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>职途星图 CareerMap 报告</title>
<style>
  body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;max-width:900px;margin:0 auto;padding:32px;color:#1f2937;background:#fff}
  h1{font-size:24px;margin:0 0 4px}
  h2{font-size:18px;margin:24px 0 12px}
  .meta{color:#888;font-size:12px;margin-bottom:20px}
  .summary{background:#f0f7ff;border-left:4px solid #1677ff;padding:12px 16px;border-radius:4px;font-size:13px;color:#1f2937;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;font-size:13px}
</style></head><body>
  <h1>职途星图 CareerMap · 职业沙盘报告</h1>
  <div class="meta">生成时间：${date} · 共 ${sandbox.routes.length} 条路线</div>
  <div class="summary">${sandbox.summary}</div>
  ${selectedRoute ? routeSection(selectedRoute) : sandbox.routes.map(routeSection).join('')}
  ${plan ? growthSection(plan) : ''}
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;color:#999;font-size:11px;text-align:center">
    本报告由职途星图 CareerMap 生成 · 数据仅供参考，不构成职业决策唯一依据
  </div>
</body></html>`
}

export function exportReportHTML(sandbox: CareerSandbox, selectedRoute?: CareerRoute, plan?: GrowthPlan) {
  const html = buildHTML(sandbox, selectedRoute, plan)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `CareerMap_${dayjs().format('YYYYMMDD_HHmm')}.html`
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportReportPDF(sandbox: CareerSandbox, selectedRoute?: CareerRoute, plan?: GrowthPlan) {
  const html = buildHTML(sandbox, selectedRoute, plan)
  // 用一个离屏 iframe 渲染后打印
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) return
  doc.open()
  doc.write(html)
  doc.close()

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 500)
    }, 300)
  }
}

export function exportGrowthPDF(plan: GrowthPlan) {
  // 构造一个最简单 sandbox 占位，只输出成长方案
  const sandbox: CareerSandbox = {
    routes: [],
    summary: `针对路线「${plan.routeName}」的 12 个月成长方案`,
  }
  exportReportPDF(sandbox, undefined, plan)
}

export function exportGrowthHTML(plan: GrowthPlan) {
  const sandbox: CareerSandbox = {
    routes: [],
    summary: `针对路线「${plan.routeName}」的 12 个月成长方案`,
  }
  exportReportHTML(sandbox, undefined, plan)
}
