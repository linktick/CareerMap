import type { CareerRoute, CareerSandbox, GrowthPlan } from '@/types/career'
import type { MarketResearchReport, SandboxValidation } from '@/types/research'
import { involutionColor, involutionText, scoreStars } from '@/utils/format'
import dayjs from 'dayjs'

const STAGE_LABELS = ['现在', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8']
function stageLabel(i: number): string {
  return STAGE_LABELS[i] || `Year ${i}`
}

const SEVERITY_TEXT: Record<string, string> = { high: '高风险', medium: '中风险', low: '低风险' }
const SEVERITY_COLOR: Record<string, string> = { high: '#d03050', medium: '#f0a020', low: '#909399' }
const TREND_TEXT: Record<string, string> = { up: '↑ 上行', flat: '→ 平稳', down: '↓ 下行' }
const RELIABILITY_TEXT: Record<string, string> = { high: '高可信', medium: '中可信', low: '低可信' }
const RELIABILITY_COLOR: Record<string, string> = { high: '#18a058', medium: '#f0a020', low: '#909399' }

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function routeSection(route: CareerRoute): string {
  const rows = route.nodes
    .map((n, i) => {
      const stage = stageLabel(i)
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

function validationSection(v: SandboxValidation): string {
  const issues = v.issues
    .map(
      (iss) => `
      <li style="margin-bottom:6px">
        <b style="color:${SEVERITY_COLOR[iss.severity] || '#999'}">[${SEVERITY_TEXT[iss.severity] || iss.severity}]</b>
        ${iss.routeName ? `<b>${iss.routeName}：</b>` : ''}${iss.message}
        <div style="color:#1677ff;font-size:12px">建议：${iss.suggestion}</div>
        ${/^https?:\/\//.test(iss.evidenceUrl || '') ? `<div style="font-size:12px;margin-top:2px"><a href="${escapeHtml(iss.evidenceUrl!)}" target="_blank" rel="noopener noreferrer" style="color:#18a058;text-decoration:none">🔗 核验依据 ↗</a></div>` : ''}
      </li>`
    )
    .join('')
  const updates = v.marketUpdates.map((m) => `<li style="margin-bottom:4px">${m}</li>`).join('')
  const corrections = v.riskCorrections
    .map(
      (c) => `
      <li style="margin-bottom:6px">
        <b style="color:${SEVERITY_COLOR[c.severity] || '#d03050'}">[${SEVERITY_TEXT[c.severity] || c.severity}]</b>
        <b>${c.routeName}：</b>${c.suggestion}
      </li>`
    )
    .join('')
  const scoreColor = v.confidenceScore >= 80 ? '#18a058' : v.confidenceScore >= 65 ? '#f0a020' : '#d03050'
  return `
    <div style="margin-top:24px" class="page-break">
      <h2 style="font-size:18px;color:#1f2937;border-bottom:2px solid #1677ff;padding-bottom:6px">
        事实校验与自洽性检查
      </h2>
      <div style="display:flex;align-items:baseline;gap:8px;margin:8px 0">
        <span style="font-size:32px;font-weight:700;color:${scoreColor}">${v.confidenceScore}</span>
        <span style="color:#888;font-size:12px">/100 置信度 · 自洽性检查通过 ${v.checksPassed}/${v.checksTotal} 项${v.groundedChecks ? ` · <span style="color:#18a058">外部事实核验 ${v.groundedChecks} 项</span>` : ''}</span>
      </div>
      <p style="color:#555;font-size:13px">${v.summary}</p>
      ${issues ? `<h3 style="font-size:14px;margin:12px 0 6px">⚠️ 校验问题（${v.issues.length}）</h3><ul style="font-size:13px;color:#333;margin:0 0 0 18px;padding:0">${issues}</ul>` : ''}
      ${updates ? `<h3 style="font-size:14px;margin:12px 0 6px">📡 市场动态更新提示</h3><ul style="font-size:13px;color:#333;margin:0 0 0 18px;padding:0">${updates}</ul>` : ''}
      ${corrections ? `<h3 style="font-size:14px;margin:12px 0 6px;color:#d03050">🛡️ 赛道风险修正建议</h3><ul style="font-size:13px;color:#333;margin:0 0 0 18px;padding:0">${corrections}</ul>` : ''}
    </div>
  `
}

function researchSection(r: MarketResearchReport): string {
  const sourceText = r.source === 'ai' ? 'AI 全链路调研' : r.source === 'mixed' ? 'AI + 本地数据集兜底' : '本地岗位数据集'
  const linkedCount = r.signals.filter((s) => /^https?:\/\//.test(s.url || '')).length
  const grounded = r.grounded === true || linkedCount >= 3
  const groundedText = grounded
    ? `<span style="color:#18a058">🟢 实时搜索核验 · ${linkedCount} 条来源可点击核验${r.searchQueries?.length ? ` · ${r.searchQueries.length} 次检索` : ''}</span>`
    : r.source === 'local'
      ? '<span style="color:#909399">⚪ 本地岗位数据集（未联网核验）</span>'
      : '<span style="color:#f0a020">🟡 AI 生成 · 未实时联网核验（链接缺失，结论请自行交叉验证）</span>'
  const signals = r.signals
    .map((s) => {
      const link = /^https?:\/\//.test(s.url || '')
        ? `<a href="${escapeHtml(s.url!)}" target="_blank" rel="noopener noreferrer" style="color:#1677ff;text-decoration:none">🔗 ${escapeHtml(s.source || '来源')} ↗</a>`
        : `<span style="color:#999">${escapeHtml(s.source || '未知来源')}${r.source !== 'local' ? '（未核验）' : ''}</span>`
      const rel = s.reliability ? `<span style="color:${RELIABILITY_COLOR[s.reliability] || '#999'};font-size:11px;margin-left:6px">${RELIABILITY_TEXT[s.reliability] || ''}</span>` : ''
      const date = s.publishedAt ? `<span style="color:#aaa;font-size:11px;margin-left:6px">📅 ${escapeHtml(s.publishedAt)}</span>` : ''
      const dirColor = s.direction === 'positive' ? '#18a058' : s.direction === 'negative' ? '#d03050' : '#909399'
      return `
      <li style="margin-bottom:8px;page-break-inside:avoid">
        <b style="color:${dirColor}">${escapeHtml(s.title)}</b>
        <div style="font-size:12px;color:#555;margin-top:2px">${escapeHtml(s.detail)}</div>
        <div style="font-size:12px;margin-top:2px">${link}${date}${rel}</div>
      </li>`
    })
    .join('')
  const jds = r.jdInsights
    .map(
      (jd) => `
      <div style="margin-bottom:10px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;page-break-inside:avoid">
        <div style="font-weight:600;font-size:13px">${jd.routeName} · ${jd.role}
          <span style="font-weight:normal;color:#888;font-size:12px">｜市场薪资 ${jd.salaryRange[0]}-${jd.salaryRange[1]}K｜需求${TREND_TEXT[jd.demandTrend] || jd.demandTrend}</span>
        </div>
        ${jd.hotRequirements.length ? `<div style="font-size:12px;color:#555;margin-top:4px">🔥 高频要求：${jd.hotRequirements.join('、')}</div>` : ''}
        ${jd.decliningRequirements.length ? `<div style="font-size:12px;color:#999;margin-top:2px">降温要求：${jd.decliningRequirements.join('、')}</div>` : ''}
        <div style="font-size:12px;color:#666;margin-top:2px">${jd.note}</div>
      </div>`
    )
    .join('')
  const heats = r.heatChanges
    .map((h) => `<li style="margin-bottom:4px"><b>${TREND_TEXT[h.direction] || h.direction} ${h.track}：</b>${h.detail}</li>`)
    .join('')
  const risks = r.riskNews.map((n) => `<li style="margin-bottom:4px">${n}</li>`).join('')
  return `
    <div style="margin-top:24px" class="page-break">
      <h2 style="font-size:18px;color:#1f2937;border-bottom:2px solid #1677ff;padding-bottom:6px">
        Agent 深度市场调研报告
      </h2>
      <div class="meta" style="margin-bottom:8px">数据来源：${sourceText} · 时间窗：${r.periodNote}<br>${groundedText}</div>
      <p style="background:#f0f7ff;border-left:4px solid #1677ff;padding:10px 14px;border-radius:4px;font-size:13px;margin:8px 0 14px">${r.summary}</p>
      ${signals ? `<h3 style="font-size:14px;margin:12px 0 6px">📡 市场信号流（${r.signals.length} 条${grounded ? '，来源可点击核验' : ''}）</h3><ul style="font-size:13px;color:#333;margin:0 0 0 18px;padding:0;list-style:disc">${signals}</ul>` : ''}
      <h3 style="font-size:14px;margin:12px 0 6px">🧭 目标岗位 JD 洞察（近 3~6 个月）</h3>
      ${jds}
      ${heats ? `<h3 style="font-size:14px;margin:12px 0 6px">🔥 赛道热度变化</h3><ul style="font-size:13px;color:#333;margin:0 0 0 18px;padding:0">${heats}</ul>` : ''}
      ${r.sentimentSummary ? `<h3 style="font-size:14px;margin:12px 0 6px">💬 职场舆情</h3><p style="font-size:13px;color:#553c9a;background:#faf5ff;border-left:3px solid #8b5cf6;padding:8px 12px;border-radius:4px">${r.sentimentSummary}</p>` : ''}
      ${risks ? `<h3 style="font-size:14px;margin:12px 0 6px;color:#d03050">🚨 行业风险资讯</h3><ul style="font-size:13px;color:#333;margin:0 0 0 18px;padding:0">${risks}</ul>` : ''}
    </div>
  `
}

function buildHTML(sandbox: CareerSandbox, selectedRoute?: CareerRoute, plan?: GrowthPlan): string {
  const date = dayjs().format('YYYY-MM-DD HH:mm')
  const horizonText = sandbox.horizon && sandbox.horizon >= 5 ? `${sandbox.horizon} 年长周期` : '3 年期'
  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>职途星图 CareerMap 报告</title>
<style>
  body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;max-width:900px;margin:0 auto;padding:32px;color:#1f2937;background:#fff}
  h1{font-size:24px;margin:0 0 4px}
  h2{font-size:18px;margin:24px 0 12px}
  .meta{color:#888;font-size:12px;margin-bottom:20px}
  .summary{background:#f0f7ff;border-left:4px solid #1677ff;padding:12px 16px;border-radius:4px;font-size:13px;color:#1f2937;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  .page-break{page-break-before:always}
</style></head><body>
  <h1>职途星图 CareerMap · 职业沙盘报告</h1>
  <div class="meta">生成时间：${date} · ${horizonText} · 共 ${sandbox.routes.length} 条路线</div>
  <div class="summary">${sandbox.summary}</div>
  ${selectedRoute ? routeSection(selectedRoute) : sandbox.routes.map(routeSection).join('')}
  ${plan ? growthSection(plan) : ''}
  ${sandbox.research ? researchSection(sandbox.research) : ''}
  ${sandbox.validation ? validationSection(sandbox.validation) : ''}
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;color:#999;font-size:11px;text-align:center">
    本报告由职途星图 CareerMap 生成 · 市场调研基于公开信息聚合，数据仅供参考，不构成职业决策唯一依据
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
