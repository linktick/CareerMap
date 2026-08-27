<script setup lang="ts">
// 链式市场调研 + 沙盘事实校验报告抽屉
// 展示：Agent 链执行步骤、置信度评分、自洽性问题、市场动态更新提示、
// 赛道风险修正建议、岗位 JD 洞察、市场信号、行业风险资讯
import { computed } from 'vue'
import {
  NDrawer, NDrawerContent, NTag, NProgress, NButton, NEmpty, NSpin, NSpace, NAlert,
} from 'naive-ui'
import type { MarketResearchReport, SandboxValidation, ResearchStepState } from '@/types/research'

const props = defineProps<{
  show: boolean
  report: MarketResearchReport | null
  validation: SandboxValidation | null
  steps: ResearchStepState[]
  researchState: 'idle' | 'running' | 'done' | 'error'
  validationState: 'idle' | 'running' | 'done' | 'error'
  researchError: string
}>()

const emit = defineEmits<{
  (e: 'update:show', v: boolean): void
  (e: 'rerun'): void
}>()

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  jd: { label: '岗位JD', color: '#1677ff' },
  hiring: { label: '招聘动态', color: '#18a058' },
  heat: { label: '赛道热度', color: '#f0a020' },
  sentiment: { label: '职场舆情', color: '#8b5cf6' },
  risk: { label: '风险', color: '#d03050' },
}

const DIRECTION_META: Record<string, { icon: string; color: string }> = {
  positive: { icon: '↑', color: '#18a058' },
  neutral: { icon: '→', color: '#9ca3af' },
  negative: { icon: '↓', color: '#d03050' },
}

const SEVERITY_META: Record<string, { label: string; color: string }> = {
  high: { label: '高', color: '#d03050' },
  medium: { label: '中', color: '#f0a020' },
  low: { label: '低', color: '#909399' },
}

const TREND_META: Record<string, { label: string; color: string }> = {
  up: { label: '↑ 上行', color: '#18a058' },
  flat: { label: '→ 平稳', color: '#909399' },
  down: { label: '↓ 下行', color: '#d03050' },
}

const RELIABILITY_META: Record<string, { label: string; color: string }> = {
  high: { label: '高可信', color: '#18a058' },
  medium: { label: '中可信', color: '#f0a020' },
  low: { label: '低可信', color: '#909399' },
}

/** 带真实可核验链接的信号数 */
const groundedCount = computed(() => (props.report?.signals || []).filter((s) => s.url).length)

/** 报告是否 grounded：有标记且 ≥3 条带链接信号 */
const isGrounded = computed(
  () => Boolean(props.report?.grounded) || groundedCount.value >= 3
)

const sourceTagMeta = computed(() => {
  const r = props.report
  if (!r) return { type: 'default' as const, label: '' }
  if (r.source === 'local') return { type: 'default' as const, label: '本地数据集' }
  if (r.source === 'mixed') return { type: 'warning' as const, label: '部分本地兜底' }
  return isGrounded.value
    ? { type: 'success' as const, label: 'AI Agent · 实时搜索核验' }
    : { type: 'warning' as const, label: 'AI 生成 · 未实时核验' }
})

/** AI 模式但未 grounded：提示用户可配置实时搜索 */
const showSearchHint = computed(
  () => props.report?.source !== 'local' && !isGrounded.value
)

const confidenceColor = computed(() => {
  const s = props.validation?.confidenceScore ?? 0
  if (s >= 80) return '#18a058'
  if (s >= 65) return '#f0a020'
  return '#d03050'
})

const confidenceLabel = computed(() => {
  const s = props.validation?.confidenceScore ?? 0
  if (s >= 90) return '高度可信'
  if (s >= 80) return '较为可信'
  if (s >= 65) return '基本可用，注意修正项'
  if (s >= 50) return '可信度偏低，谨慎参考'
  return '存在方向性问题，建议重新推演'
})

const sortedIssues = computed(() => {
  const order = { high: 0, medium: 1, low: 2 }
  return [...(props.validation?.issues || [])].sort(
    (a, b) => order[a.severity] - order[b.severity]
  )
})

const running = computed(() => props.researchState === 'running' || props.validationState === 'running')
</script>

<template>
  <NDrawer :show="show" :width="620" @update:show="emit('update:show', $event)">
    <NDrawerContent closable>
      <template #header>
        <div class="flex items-center justify-between pr-6">
          <span>🔍 市场调研与事实校验报告</span>
          <NButton size="small" :loading="running" @click="emit('rerun')">重新调研</NButton>
        </div>
      </template>

      <!-- 执行中 -->
      <div v-if="running && !report" class="py-16 text-center">
        <NSpin size="large" />
        <div class="mt-4 text-sm text-gray-600">Agent 链式市场调研进行中…</div>
      </div>

      <NAlert v-else-if="researchState === 'error' && !report" type="error" class="mb-4">
        <div class="text-sm">调研失败：{{ researchError || '未知错误' }}</div>
        <NButton size="small" class="mt-2" @click="emit('rerun')">重试</NButton>
      </NAlert>

      <template v-else-if="report">
        <!-- Agent 链步骤 -->
        <div class="mb-5 rounded-xl border border-gray-200 p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm font-bold text-gray-800">Agent 调研链路</div>
            <NSpace :size="6">
              <NTag size="small" :bordered="false" :type="sourceTagMeta.type">
                {{ sourceTagMeta.label }}
              </NTag>
              <NTag v-if="isGrounded" size="small" :bordered="false" type="success">
                🟢 {{ groundedCount }} 条来源可核验 · {{ report.searchQueries?.length || 0 }} 次检索
              </NTag>
            </NSpace>
          </div>
          <!-- 未接入实时搜索的提示：内容基于模型知识，来源不可核验 -->
          <NAlert v-if="showSearchHint" type="warning" :show-icon="true" class="mb-3 text-xs">
            本次调研未接入实时联网搜索（方舟联网插件不可用且未配置博查/Tavily），结论基于模型知识生成，
            来源不可核验。可在后端 .env 配置 BOCHA_API_KEY 后重新调研。
          </NAlert>
          <!-- 实际执行的检索词 -->
          <div v-if="report.searchQueries?.length" class="mb-3 flex flex-wrap gap-1">
            <span v-for="(q, i) in report.searchQueries.slice(0, 10)" :key="i"
              class="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">
              🔍 {{ q }}
            </span>
          </div>
          <div class="space-y-1.5">
            <div
              v-for="step in (steps.length ? steps : report.stepStatus)"
              :key="step.id"
              class="flex items-center gap-2 text-xs"
            >
              <span class="w-4 text-center">
                <span v-if="step.status === 'done'" class="text-green-600">✓</span>
                <span v-else-if="step.status === 'running'" class="text-blue-500 animate-pulse">●</span>
                <span v-else-if="step.status === 'error'" class="text-amber-500">⚠</span>
                <span v-else class="text-gray-300">○</span>
              </span>
              <span :class="step.status === 'pending' ? 'text-gray-400' : 'text-gray-700'">{{ step.title }}</span>
              <span v-if="step.detail" class="text-gray-400 truncate">— {{ step.detail }}</span>
            </div>
          </div>
          <div class="text-[11px] text-gray-400 mt-2">数据时间窗：{{ report.periodNote }}</div>
        </div>

        <!-- 置信度 -->
        <div v-if="validation" class="mb-5 rounded-xl border p-4"
          :style="{ borderColor: confidenceColor + '50', background: confidenceColor + '0d' }">
          <div class="flex items-end justify-between mb-2">
            <div class="text-sm font-bold text-gray-800">沙盘置信度评分</div>
            <div class="text-3xl font-bold" :style="{ color: confidenceColor }">
              {{ validation.confidenceScore }}<span class="text-sm font-normal text-gray-400">/100</span>
            </div>
          </div>
          <NProgress
            type="line"
            :percentage="validation.confidenceScore"
            :color="confidenceColor"
            :height="10"
            :show-indicator="false"
            processing
          />
          <div class="flex items-center justify-between mt-2 text-xs">
            <span :style="{ color: confidenceColor }" class="font-medium">{{ confidenceLabel }}</span>
            <span class="text-gray-500">
              自洽性 {{ validation.checksPassed }}/{{ validation.checksTotal }} 项
              <template v-if="validation.groundedChecks">
                · <span class="text-green-600">外部事实核验 {{ validation.groundedChecks }} 项</span>
              </template>
            </span>
          </div>
          <div v-if="validation.summary" class="mt-3 text-xs text-gray-600 leading-relaxed border-t border-gray-200/60 pt-2">
            {{ validation.summary }}
          </div>
          <div v-if="validationState === 'running'" class="mt-2 text-xs text-blue-500">
            <NSpin size="small" /> 正在结合调研结果做交叉校验…
          </div>
        </div>

        <!-- 自洽性问题 -->
        <div v-if="sortedIssues.length" class="mb-5">
          <div class="text-sm font-bold text-gray-800 mb-2">
            ⚠️ 事实校验与自洽性问题（{{ sortedIssues.length }}）
          </div>
          <div class="space-y-2">
            <div
              v-for="(iss, i) in sortedIssues"
              :key="i"
              class="rounded-lg border border-gray-200 p-3"
            >
              <div class="flex items-center gap-2 mb-1">
                <NTag size="small" :bordered="false" :color="{ color: SEVERITY_META[iss.severity].color + '18', textColor: SEVERITY_META[iss.severity].color, borderColor: 'transparent' }">
                  {{ SEVERITY_META[iss.severity].label }}风险
                </NTag>
                <span v-if="iss.routeName" class="text-xs font-medium text-gray-700">{{ iss.routeName }}</span>
                <NTag size="small" :bordered="false" :type="iss.source === 'ai' ? 'info' : 'default'">
                  {{ iss.source === 'ai' ? 'AI 交叉比对' : '规则检查' }}
                </NTag>
              </div>
              <div class="text-xs text-gray-800 leading-relaxed">{{ iss.message }}</div>
              <div class="text-xs text-blue-600 mt-1">💡 {{ iss.suggestion }}</div>
              <a v-if="iss.evidenceUrl" :href="iss.evidenceUrl" target="_blank" rel="noopener noreferrer"
                 class="inline-block text-[10px] text-green-600 hover:underline mt-1">
                🔗 核验依据 ↗
              </a>
            </div>
          </div>
        </div>

        <!-- 市场动态更新提示 -->
        <div v-if="validation?.marketUpdates?.length" class="mb-5">
          <div class="text-sm font-bold text-gray-800 mb-2">📡 市场动态更新提示</div>
          <ul class="space-y-1.5">
            <li
              v-for="(m, i) in validation.marketUpdates"
              :key="i"
              class="text-xs text-gray-700 leading-relaxed flex gap-2"
            >
              <span class="text-blue-500 shrink-0">▸</span>
              <span>{{ m }}</span>
            </li>
          </ul>
        </div>

        <!-- 赛道风险修正 -->
        <div v-if="validation?.riskCorrections?.length" class="mb-5">
          <div class="text-sm font-bold text-red-600 mb-2">🛡️ 赛道风险修正建议</div>
          <div class="space-y-2">
            <div v-for="(c, i) in validation.riskCorrections" :key="i" class="rounded-lg bg-red-50/70 border border-red-100 p-3">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-medium text-red-700">{{ c.routeName }}</span>
                <NTag size="small" :bordered="false" :color="{ color: SEVERITY_META[c.severity].color + '18', textColor: SEVERITY_META[c.severity].color, borderColor: 'transparent' }">
                  {{ SEVERITY_META[c.severity].label }}
                </NTag>
              </div>
              <div class="text-xs text-red-800/90 leading-relaxed">{{ c.suggestion }}</div>
            </div>
          </div>
        </div>

        <!-- JD 洞察 -->
        <div v-if="report.jdInsights.length" class="mb-5">
          <div class="text-sm font-bold text-gray-800 mb-2">🧭 目标岗位 JD 洞察（近 3~6 个月）</div>
          <div class="space-y-2">
            <div v-for="jd in report.jdInsights" :key="jd.routeId" class="rounded-lg border border-gray-200 p-3">
              <div class="flex items-center justify-between gap-2 mb-1.5">
                <div class="text-xs font-bold text-gray-800 truncate">{{ jd.routeName }} · {{ jd.role }}</div>
                <NTag size="small" :bordered="false" :color="{ color: (TREND_META[jd.demandTrend]?.color || '#999') + '18', textColor: TREND_META[jd.demandTrend]?.color || '#999', borderColor: 'transparent' }">
                  需求{{ TREND_META[jd.demandTrend]?.label }}
                </NTag>
              </div>
              <div class="text-xs text-gray-600 mb-1.5">
                市场薪资 <b class="text-blue-600">{{ jd.salaryRange[0] }}-{{ jd.salaryRange[1] }}K</b>
              </div>
              <div v-if="jd.hotRequirements.length" class="text-[11px] text-gray-600 mb-1">
                🔥 高频要求：<NSpace :size="[4,4]" wrap>
                  <NTag v-for="s in jd.hotRequirements.slice(0, 6)" :key="s" size="tiny" type="info" :bordered="false">{{ s }}</NTag>
                </NSpace>
              </div>
              <div v-if="jd.decliningRequirements.length" class="text-[11px] text-gray-400">
                降温要求：{{ jd.decliningRequirements.join('、') }}
              </div>
              <div class="text-[11px] text-gray-500 mt-1">{{ jd.note }}</div>
            </div>
          </div>
        </div>

        <!-- 赛道热度变化 -->
        <div v-if="report.heatChanges.length" class="mb-5">
          <div class="text-sm font-bold text-gray-800 mb-2">🔥 赛道热度变化</div>
          <div class="space-y-1.5">
            <div v-for="(h, i) in report.heatChanges" :key="i" class="flex items-start gap-2 text-xs">
              <span :style="{ color: TREND_META[h.direction]?.color }" class="shrink-0 font-medium w-14">
                {{ TREND_META[h.direction]?.label }}
              </span>
              <div>
                <span class="font-medium text-gray-800">{{ h.track }}</span>
                <span class="text-gray-500"> — {{ h.detail }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 市场信号流 -->
        <div v-if="report.signals.length" class="mb-5">
          <div class="text-sm font-bold text-gray-800 mb-2">📡 市场信号（{{ report.signals.length }}）</div>
          <div class="space-y-1.5">
            <div v-for="(s, i) in report.signals" :key="i" class="flex items-start gap-2 text-xs">
              <span :style="{ color: DIRECTION_META[s.direction]?.color }" class="shrink-0 font-bold">
                {{ DIRECTION_META[s.direction]?.icon }}
              </span>
              <div class="flex-1">
                <NTag size="small" :bordered="false" class="mr-1.5"
                  :color="{ color: CATEGORY_META[s.category]?.color + '18', textColor: CATEGORY_META[s.category]?.color, borderColor: 'transparent' }">
                  {{ CATEGORY_META[s.category]?.label || s.category }}
                </NTag>
                <span class="font-medium text-gray-800">{{ s.title }}</span>
                <div class="text-gray-500 mt-0.5 leading-relaxed">{{ s.detail }}</div>
                <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
                  <a v-if="s.url" :href="s.url" target="_blank" rel="noopener noreferrer"
                     class="text-blue-500 hover:underline break-all">
                    🔗 {{ s.source || '来源' }} ↗
                  </a>
                  <span v-else class="text-gray-400">{{ s.source }}<span v-if="report.source !== 'local'">（未核验）</span></span>
                  <span v-if="s.publishedAt" class="text-gray-400">📅 {{ s.publishedAt }}</span>
                  <NTag v-if="s.reliability" size="tiny" :bordered="false"
                    :color="{ color: (RELIABILITY_META[s.reliability]?.color || '#999') + '18', textColor: RELIABILITY_META[s.reliability]?.color || '#999', borderColor: 'transparent' }">
                    {{ RELIABILITY_META[s.reliability]?.label }}
                  </NTag>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 职场舆情 -->
        <div v-if="report.sentimentSummary" class="mb-5 rounded-lg bg-purple-50/60 border border-purple-100 p-3">
          <div class="text-sm font-bold text-purple-700 mb-1">💬 职场舆情</div>
          <div class="text-xs text-purple-900/80 leading-relaxed">{{ report.sentimentSummary }}</div>
        </div>

        <!-- 行业风险资讯 -->
        <div v-if="report.riskNews.length" class="mb-5">
          <div class="text-sm font-bold text-red-600 mb-2">🚨 行业风险资讯</div>
          <ul class="space-y-1.5">
            <li v-for="(n, i) in report.riskNews" :key="i" class="text-xs text-gray-700 leading-relaxed flex gap-2">
              <span class="text-red-400 shrink-0">●</span>
              <span>{{ n }}</span>
            </li>
          </ul>
        </div>

        <!-- 调研总结 -->
        <div v-if="report.summary" class="rounded-xl bg-blue-50/60 border border-blue-100 p-4">
          <div class="text-sm font-bold text-blue-700 mb-1">📋 调研总结</div>
          <div class="text-xs text-blue-900/80 leading-relaxed">{{ report.summary }}</div>
        </div>
      </template>

      <NEmpty v-else description="暂无调研报告" class="py-16" />
    </NDrawerContent>
  </NDrawer>
</template>
