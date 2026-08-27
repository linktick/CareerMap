<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard, NButton, NList, NListItem, NTag, NEmpty, NSpin, NAlert,
  NSelect, NSpace, NPopconfirm, NInputNumber, NSwitch, NPopover, NCascader,
  useMessage,
} from 'naive-ui'
import { useSandboxStore } from '@/stores/sandbox'
import { useModeStore } from '@/stores/mode'
import { useProfileStore } from '@/stores/profile'
import { exportReportPDF, exportReportHTML } from '@/utils/exporter'
import { CHINA_CITY_OPTIONS } from '@/utils/chinaCities'
import SandboxChart from '@/components/sandbox/SandboxChart.vue'
import RouteDetailPanel from '@/components/sandbox/RouteDetailPanel.vue'
import ResearchDrawer from '@/components/sandbox/ResearchDrawer.vue'
import { involutionColor, involutionText } from '@/utils/format'
import type { UserProfile } from '@/types/career'

const researchDrawer = ref(false)
const horizon = computed(() => sandbox.sandbox?.horizon ?? 3)

const router = useRouter()
const sandbox = useSandboxStore()
const modeStore = useModeStore()
const profileStore = useProfileStore()
const message = useMessage()

// 本地模式沙盘页内的动态调参：改动任意画像参数即时重算路线与薪资
const isLocal = computed(() => modeStore.mode === 'local')

const relocateOptions = [
  { label: '接受全国机会', value: 'true' },
  { label: '仅一线城市', value: 'tier1' },
  { label: '仅一线/新一线', value: 'new_tier1' },
  { label: '不接受异地', value: 'false' },
]
const riskOptions = [
  { label: '保守（求稳）', value: 'conservative' },
  { label: '中性', value: 'neutral' },
  { label: '激进（博高薪）', value: 'aggressive' },
]

// check-strategy="child" 时 v-model 直接绑定叶子节点 value（城市短名）

function applyPatch(patch: Partial<UserProfile>) {
  if (!isLocal.value) return
  sandbox.refreshLocalProfile(patch)
}
// NSelect 把布尔异地选项序列化成了字符串，这里转回联合类型
function onRelocateChange(v: string) {
  applyPatch({
    acceptRelocate: v === 'true' ? true : v === 'false' ? false : (v as 'tier1' | 'new_tier1'),
  })
}
const relocateString = computed(() => String(profileStore.profile.acceptRelocate))

const filterInvolution = ref<string[]>([])
const filterIndustry = ref<string[]>([])

const involutionOptions = [
  { label: '🟢 低内卷', value: 'low' },
  { label: '🟡 中等内卷', value: 'medium' },
  { label: '🔴 高度内卷', value: 'high' },
]

const industryOptions = computed(() => {
  const set = new Set(sandbox.routes.map((r) => r.industry))
  return Array.from(set).map((i) => ({ label: i, value: i }))
})

const filteredRoutes = computed(() => {
  return sandbox.routes.filter((r) => {
    if (filterInvolution.value.length && !filterInvolution.value.includes(r.involutionLevel)) return false
    if (filterIndustry.value.length && !filterIndustry.value.includes(r.industry)) return false
    return true
  })
})

onMounted(() => {
  if (!sandbox.sandbox && sandbox.loadingState !== 'loading') {
    if (!profileStore.profile.majorOrJob) {
      router.push('/wizard')
      return
    }
    sandbox.generateRoutes()
  }
})

function selectRoute(id: string) {
  sandbox.selectRoute(id)
}

async function goGenerateGrowth() {
  if (!sandbox.selectedRoute) return
  // 已生成过方案：直接跳转查看，不重新生成
  if (sandbox.growthPlan && sandbox.growthPlan.routeId === sandbox.selectedRoute.id) {
    router.push(`/growth/${sandbox.selectedRoute.id}`)
    return
  }
  const ok = await sandbox.generateGrowthPlan()
  if (ok && sandbox.growthPlan) {
    router.push(`/growth/${sandbox.selectedRoute.id}`)
  } else if (sandbox.growthError) {
    // AI 生成失败（超时/被截断/JSON 解析失败等）时明确提示，而不是按钮转完毫无反应
    message.error(sandbox.growthError)
  }
}

async function goCompare() {
  if (sandbox.compareRouteIds.length < 2) {
    message.warning('请至少选择 2 条路线进行对比')
    return
  }
  await sandbox.runCompare()
  router.push('/compare')
}

function saveAgain() {
  message.success('沙盘已保存到本地历史记录')
}

function exportPDF() {
  if (!sandbox.sandbox) return
  exportReportPDF(sandbox.sandbox, sandbox.selectedRoute || undefined)
}
function exportHTML() {
  if (!sandbox.sandbox) return
  exportReportHTML(sandbox.sandbox, sandbox.selectedRoute || undefined)
}

function switchToLocalAndRetry() {
  modeStore.setMode('local')
  sandbox.reset()
  sandbox.generateRoutes()
}
</script>

<template>
  <div class="h-[calc(100vh-4rem-56px)] flex flex-col">
    <!-- Loading -->
    <div v-if="sandbox.loadingState === 'loading'" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <NSpin size="large" />
        <div class="mt-6 text-gray-600">{{ sandbox.loadingMessage }}</div>
        <div class="mt-2 text-xs text-gray-400">
          模式：{{ modeStore.mode === 'ai' ? '在线 AI 推演' : '本地模拟器' }}
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="sandbox.loadingState === 'error'" class="flex-1 flex items-center justify-center p-8">
      <div class="max-w-md w-full">
        <NAlert type="error" title="推演失败" show-icon>
          <p class="mb-3">{{ sandbox.errorMessage }}</p>
          <NSpace>
            <NButton size="small" @click="sandbox.generateRoutes">重试</NButton>
            <NButton v-if="modeStore.mode === 'ai'" size="small" type="primary" @click="switchToLocalAndRetry">
              切换到本地模拟器
            </NButton>
            <NButton size="small" @click="router.push('/wizard')">返回修改信息</NButton>
          </NSpace>
        </NAlert>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!sandbox.sandbox" class="flex-1 flex items-center justify-center">
      <NEmpty description="还没有推演结果">
        <NButton type="primary" @click="router.push('/wizard')">去填写信息</NButton>
      </NEmpty>
    </div>

    <!-- Sandbox main -->
    <div v-else class="flex-1 flex flex-col lg:flex-row overflow-hidden">
      <!-- Left column -->
      <aside class="w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 bg-white/80 backdrop-blur-sm overflow-y-auto p-5">
        <!-- 动态调参：仅本地模式可用，调整后即时重算薪资与路线 -->
        <div v-if="isLocal" class="mb-5 rounded-xl border border-sky-100 bg-sky-50/50 p-3.5">
          <div class="flex items-center gap-1.5 mb-3">
            <span class="text-sm">🎛️</span>
            <span class="text-xs font-bold text-sky-800">动态调参 · 即时重算</span>
          </div>
          <div class="space-y-3">
            <div>
              <label class="block text-[11px] text-gray-500 mb-1">期望工作城市</label>
              <NCascader
                size="small"
                :value="profileStore.profile.city"
                :options="CHINA_CITY_OPTIONS"
                check-strategy="child"
                filterable
                :clearable="false"
                placeholder="省 / 城市"
                @update:value="(v: string) => applyPatch({ city: v })"
              />
            </div>
            <div>
              <label class="block text-[11px] text-gray-500 mb-1">最低可接受月薪（K）</label>
              <NInputNumber
                size="small"
                :value="profileStore.profile.minSalaryK"
                :min="0"
                :max="100"
                class="w-full"
                @update:value="(v: number | null) => applyPatch({ minSalaryK: Number(v) || 0 })"
              />
            </div>
            <div>
              <label class="block text-[11px] text-gray-500 mb-1">异地工作意愿</label>
              <NSelect
                size="small"
                :value="relocateString"
                :options="relocateOptions"
                @update:value="onRelocateChange"
              />
            </div>
            <div>
              <label class="block text-[11px] text-gray-500 mb-1">风险偏好</label>
              <NSelect
                size="small"
                :value="profileStore.profile.riskPreference"
                :options="riskOptions"
                @update:value="(v: UserProfile['riskPreference']) => applyPatch({ riskPreference: v })"
              />
            </div>
            <div class="flex items-center justify-between">
              <label class="text-[11px] text-gray-500">接受加班</label>
              <NSwitch
                size="small"
                :value="profileStore.profile.acceptOvertime"
                @update:value="(v: boolean) => applyPatch({ acceptOvertime: v })"
              />
            </div>
          </div>
          <div class="mt-3 text-[10px] leading-relaxed text-gray-400">
            调整任意参数后，右侧路线排序、各年薪资区间与沙盘概览会即时按本地规则引擎重算；
            不同城市的薪资系数不同（北上深约 ×1.15 / 新一线 ×1.0 / 普通二三线 ×0.7~0.9）。
          </div>
        </div>

        <div class="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-3">职业路线 ({{ filteredRoutes.length }})</div>
        <div class="space-y-1.5 mb-5">
          <div
            v-for="r in filteredRoutes"
            :key="r.id"
            class="p-3 rounded-lg cursor-pointer border transition"
            :class="r.id === sandbox.selectedRouteId
              ? 'border-brand bg-blue-50/60 shadow-sm'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'"
            @click="selectRoute(r.id)"
          >
            <div class="flex items-start gap-2">
              <div
                class="w-2 h-2 rounded-full mt-1.5 shrink-0"
                :style="{ backgroundColor: involutionColor(r.involutionLevel) }"
              />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate">{{ r.name }}</div>
                <div class="text-xs text-gray-500 mt-0.5">
                  {{ horizon }}Y {{ r.salaryCurve[r.salaryCurve.length - 1].min }}-{{ r.salaryCurve[r.salaryCurve.length - 1].max }}K
                  · 匹配 {{ r.matchScore }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="text-xs text-gray-500 mb-2 font-medium">筛选</div>
        <NSelect
          v-model:value="filterInvolution"
          multiple
          size="small"
          :options="involutionOptions"
          placeholder="内卷等级"
          class="mb-2"
        />
        <NSelect
          v-model:value="filterIndustry"
          multiple
          size="small"
          :options="industryOptions"
          placeholder="行业"
        />
      </aside>

      <!-- Middle canvas -->
      <section class="flex-1 relative bg-gradient-to-br from-slate-50 via-white to-blue-50/40 min-h-[400px] lg:min-h-0">
        <div class="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md rounded-xl px-4 py-3 shadow-lg border border-white/80 max-w-sm">
          <div class="text-[10px] font-bold tracking-wider text-brand uppercase">沙盘概览</div>
          <div class="text-sm font-semibold text-gray-800 mt-1 leading-snug">{{ sandbox.sandbox.summary }}</div>
        </div>
        <SandboxChart
          :routes="filteredRoutes"
          :selected-id="sandbox.selectedRouteId"
          @select="selectRoute"
        />
        <!-- 链式市场调研进度卡（推演完成后自动执行） -->
        <div
          v-if="sandbox.researchState === 'running' || sandbox.validationState === 'running'"
          class="absolute bottom-5 left-5 z-10 w-72 bg-white/95 backdrop-blur-md rounded-xl px-4 py-3 shadow-lg border border-blue-100"
        >
          <div class="flex items-center gap-2 mb-2">
            <NSpin size="small" />
            <span class="text-xs font-bold text-blue-700">
              {{ sandbox.researchState === 'running' ? 'Agent 链式市场调研中…' : '事实校验与自洽性检查中…' }}
            </span>
          </div>
          <div class="space-y-1">
            <div
              v-for="step in sandbox.researchSteps"
              :key="step.id"
              class="flex items-center gap-1.5 text-[11px]"
            >
              <span class="w-3 text-center">
                <span v-if="step.status === 'done'" class="text-green-600">✓</span>
                <span v-else-if="step.status === 'running'" class="text-blue-500 animate-pulse">●</span>
                <span v-else-if="step.status === 'error'" class="text-amber-500">⚠</span>
                <span v-else class="text-gray-300">○</span>
              </span>
              <span :class="step.status === 'pending' ? 'text-gray-400' : 'text-gray-600'">{{ step.title }}</span>
            </div>
          </div>
          <div class="text-[10px] text-gray-400 mt-2">调研在后台进行，可先浏览沙盘，完成后自动出报告</div>
        </div>

        <!-- 调研完成/失败的提示入口 -->
        <div
          v-if="sandbox.researchState === 'done'"
          class="absolute top-4 right-4 z-10"
        >
          <NButton
            size="small"
            type="primary"
            secondary
            class="!shadow-md"
            @click="researchDrawer = true"
          >
            🔍 {{ sandbox.validation?.confidenceScore != null ? `校验报告 · 置信度 ${sandbox.validation.confidenceScore}` : '调研报告已生成' }}
          </NButton>
        </div>
        <div
          v-if="sandbox.researchState === 'error'"
          class="absolute top-4 right-4 z-10"
        >
          <NButton size="small" type="warning" secondary class="!shadow-md" @click="sandbox.runResearchAndValidation()">
            ⚠ 市场调研失败，点击重试
          </NButton>
        </div>

        <!-- Floating action buttons -->
        <div class="absolute bottom-5 right-5 flex flex-col gap-2 no-print">
          <NButton
            size="medium"
            class="!shadow-md"
            :type="sandbox.researchState === 'done' ? 'primary' : 'default'"
            :loading="sandbox.researchState === 'running'"
            @click="researchDrawer = true"
          >
            {{ sandbox.researchState === 'running' ? '⏳ 调研进行中…' : '🔍 市场调研与校验' }}
          </NButton>
          <NButton type="primary" size="medium" class="!shadow-lg !shadow-blue-500/25" @click="goCompare">
            🔀 对比路线 ({{ sandbox.compareRouteIds.length }})
          </NButton>
          <NButton size="medium" class="!shadow-md" @click="saveAgain">💾 保存</NButton>
          <NButton size="medium" class="!shadow-md" @click="exportPDF">📄 导出 PDF</NButton>
          <NButton size="medium" class="!shadow-md" @click="exportHTML">🌐 导出 HTML</NButton>
        </div>

        <ResearchDrawer
          v-model:show="researchDrawer"
          :report="sandbox.researchReport"
          :validation="sandbox.validation"
          :steps="sandbox.researchSteps"
          :research-state="sandbox.researchState"
          :validation-state="sandbox.validationState"
          :research-error="sandbox.researchError"
          @rerun="sandbox.runResearchAndValidation()"
        />
      </section>

      <!-- Right panel -->
      <aside class="w-full lg:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l border-gray-200 bg-white/95 backdrop-blur-sm overflow-hidden">
        <RouteDetailPanel
          :route="sandbox.selectedRoute"
          :in-compare="sandbox.compareRouteIds.includes(sandbox.selectedRouteId || '')"
          :has-growth="!!sandbox.growthPlan && sandbox.growthPlan.routeId === sandbox.selectedRouteId"
          :generating="sandbox.growthLoading"
          @generate-growth="goGenerateGrowth"
          @toggle-compare="sandbox.toggleCompare(sandbox.selectedRouteId!)"
        />
      </aside>
    </div>
  </div>
</template>
