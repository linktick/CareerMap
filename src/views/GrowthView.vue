<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton, NCard, NCheckbox, NSpin, NEmpty, NAlert, NSpace, NTag, NInput,
  useMessage,
} from 'naive-ui'
import { useSandboxStore } from '@/stores/sandbox'
import { loadGrowthDone, saveGrowthDone } from '@/utils/storage'
import { exportGrowthPDF, exportGrowthHTML } from '@/utils/exporter'
import type { MonthPlan } from '@/types/career'

const route = useRoute()
const router = useRouter()
const sandbox = useSandboxStore()
const message = useMessage()

const editMode = ref(false)
const doneMap = ref<Record<number, string[]>>({})

const routeId = computed(() => (route.params.routeId as string) || sandbox.selectedRouteId || '')
const targetRoute = computed(() =>
  sandbox.routes.find((r) => r.id === routeId.value) || sandbox.selectedRoute
)

const plan = computed(() => {
  if (sandbox.growthPlan && sandbox.growthPlan.routeId === routeId.value) {
    return sandbox.growthPlan
  }
  return null
})

onMounted(async () => {
  if (!sandbox.sandbox) {
    router.push('/')
    return
  }
  if (targetRoute.value) {
    doneMap.value = loadGrowthDone(targetRoute.value.id)
    if (!plan.value) {
      const ok = await sandbox.generateGrowthPlan(targetRoute.value)
      if (!ok && sandbox.growthError) {
        message.error(sandbox.growthError)
      }
    }
  }
})

watch(
  () => plan.value?.routeId,
  (id) => {
    if (id) doneMap.value = loadGrowthDone(id)
  }
)

function isDone(m: number, task: string): boolean {
  return doneMap.value[m]?.includes(task) || false
}

async function retryGenerate() {
  if (targetRoute.value) {
    const ok = await sandbox.generateGrowthPlan(targetRoute.value)
    if (!ok && sandbox.growthError) message.error(sandbox.growthError)
  }
}

function toggleDone(m: number, task: string) {
  const set = new Set(doneMap.value[m] || [])
  if (set.has(task)) set.delete(task)
  else set.add(task)
  doneMap.value = { ...doneMap.value, [m]: Array.from(set) }
  if (plan.value) saveGrowthDone(plan.value.routeId, doneMap.value)
}

const progress = computed(() => {
  if (!plan.value) return 0
  let total = 0
  let done = 0
  plan.value.months.forEach((m) => {
    total += m.learningTasks.length
    done += m.learningTasks.filter((t) => isDone(m.month, t.task)).length
  })
  return total ? Math.round((done / total) * 100) : 0
})

function exportPDF() {
  if (plan.value) exportGrowthPDF(plan.value)
}
function exportHTML() {
  if (plan.value) exportGrowthHTML(plan.value)
}

function updateMonth(month: number, patch: Partial<MonthPlan>) {
  if (!plan.value) return
  const months = plan.value.months.map((m) =>
    m.month === month ? { ...m, ...patch } : m
  )
  sandbox.growthPlan = { ...plan.value, months }
}

function updateTask(month: number, idx: number, text: string) {
  if (!plan.value) return
  const months = plan.value.months.map((m) => {
    if (m.month !== month) return m
    const tasks = m.learningTasks.map((t, i) => (i === idx ? { ...t, task: text } : t))
    return { ...m, learningTasks: tasks }
  })
  sandbox.growthPlan = { ...plan.value, months }
}
</script>

<template>
  <div class="max-w-[900px] mx-auto px-4 md:px-6 py-8">
    <div class="flex items-center justify-between mb-6">
      <NButton @click="router.push('/sandbox')">← 返回沙盘</NButton>
      <NSpace>
        <NButton @click="editMode = !editMode">
          {{ editMode ? '完成编辑' : '✎ 编辑' }}
        </NButton>
        <NButton @click="exportHTML">🌐 导出 HTML</NButton>
        <NButton type="primary" @click="exportPDF">📄 导出 PDF</NButton>
      </NSpace>
    </div>

    <div v-if="sandbox.growthLoading && !plan" class="flex justify-center py-20">
      <NSpin size="large" description="正在生成 12 个月成长方案..." />
    </div>

    <NAlert
      v-else-if="sandbox.growthError && !plan"
      type="error"
      title="成长方案生成失败"
      show-icon
      class="my-6"
    >
      <p class="mb-3 whitespace-pre-wrap">{{ sandbox.growthError }}</p>
      <NSpace>
        <NButton size="small" type="primary" @click="retryGenerate">重试</NButton>
        <NButton size="small" @click="router.push('/sandbox')">返回沙盘</NButton>
      </NSpace>
    </NAlert>

    <template v-else-if="plan && targetRoute">
      <!-- Overview -->
      <NCard :bordered="false" class="shadow-sm mb-6 bg-gradient-to-br from-blue-50 to-white">
        <div class="text-xs text-brand font-medium mb-1">12 个月成长方案</div>
        <h1 class="text-2xl font-bold text-gray-900">{{ plan.routeName }}</h1>
        <p class="text-sm text-gray-600 mt-2">{{ plan.goalSummary }}</p>
        <div class="flex flex-wrap gap-4 mt-4 text-sm text-gray-700">
          <div>🎯 目标岗位：<b>{{ plan.targetRole }}</b></div>
          <div>💰 目标薪资：<b class="text-brand">{{ plan.targetSalary[0] }}-{{ plan.targetSalary[1] }}K</b></div>
          <div>📈 完成进度：<b>{{ progress }}%</b></div>
        </div>
        <div class="w-full h-2 bg-gray-200 rounded-full mt-3 overflow-hidden">
          <div class="h-full bg-brand transition-all" :style="{ width: progress + '%' }" />
        </div>
      </NCard>

      <!-- Timeline -->
      <div class="relative pl-8">
        <div class="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" />
        <div v-for="m in plan.months" :key="m.month" class="relative mb-5">
          <div
            class="absolute -left-[22px] top-3 w-4 h-4 rounded-full border-2 border-white shadow"
            :class="m.month === 1 ? 'bg-brand' : 'bg-gray-300'"
          />
          <NCard :bordered="false" class="shadow-sm" size="small">
            <div class="flex items-center justify-between mb-3">
              <div>
                <span class="text-xs text-brand font-bold">M{{ m.month }}</span>
                <span class="ml-2 font-semibold text-gray-900">{{ m.theme }}</span>
              </div>
            </div>

            <!-- Learning Tasks -->
            <div v-if="m.learningTasks.length" class="mb-2">
              <div class="text-xs text-gray-500 mb-1.5">📚 学习任务</div>
              <div class="space-y-1">
                <div v-for="(t, idx) in m.learningTasks" :key="idx" class="flex items-start gap-2 text-sm">
                  <NCheckbox
                    :checked="isDone(m.month, t.task)"
                    @update:checked="() => toggleDone(m.month, t.task)"
                  />
                  <NTag v-if="t.type === 'review'" size="tiny" :bordered="false" type="info">复习</NTag>
                  <div class="flex-1" :class="{ 'line-through text-gray-400': isDone(m.month, t.task) }">
                    <NInput
                      v-if="editMode"
                      :value="t.task"
                      size="tiny"
                      type="textarea"
                      :autosize="{ minRows: 1 }"
                      @update:value="(v) => updateTask(m.month, idx, v)"
                    />
                    <span v-else>{{ t.task }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Practice -->
            <div v-if="m.practiceProjects.length" class="mb-2">
              <div class="text-xs text-gray-500 mb-1.5">🛠 实践项目</div>
              <div v-if="!editMode" class="text-sm text-gray-700 leading-relaxed">
                <span v-for="(p, i) in m.practiceProjects" :key="i">{{ p }}<span v-if="i < m.practiceProjects.length - 1">；</span></span>
              </div>
              <NInput
                v-else
                type="textarea"
                :default-value="m.practiceProjects.join('\n')"
                size="tiny"
                @update:value="(v) => updateMonth(m.month, { practiceProjects: v.split('\n').filter(Boolean) })"
              />
            </div>

            <!-- Job -->
            <div v-if="m.jobActions || editMode" class="mb-2">
              <div class="text-xs text-gray-500 mb-1.5">💼 求职动作</div>
              <NInput
                v-if="editMode"
                type="textarea"
                :default-value="m.jobActions"
                size="tiny"
                :autosize="{ minRows: 1 }"
                @update:value="(v) => updateMonth(m.month, { jobActions: v })"
              />
              <div v-else class="text-sm text-gray-700">{{ m.jobActions }}</div>
            </div>

            <!-- Cert -->
            <div v-if="m.certPrep || editMode" class="mb-2">
              <div class="text-xs text-gray-500 mb-1.5">📜 证书备考</div>
              <NInput
                v-if="editMode"
                type="textarea"
                :default-value="m.certPrep"
                size="tiny"
                :autosize="{ minRows: 1 }"
                @update:value="(v) => updateMonth(m.month, { certPrep: v })"
              />
              <div v-else class="text-sm text-gray-700">{{ m.certPrep }}</div>
            </div>

            <!-- Reminder -->
            <div class="bg-amber-50 border border-amber-100 rounded p-2 text-xs text-amber-800 leading-relaxed">
              <b>⚠️ 重点：</b>
              <NInput
                v-if="editMode"
                type="textarea"
                :default-value="m.keyReminder"
                size="tiny"
                :autosize="{ minRows: 1 }"
                class="mt-1"
                @update:value="(v) => updateMonth(m.month, { keyReminder: v })"
              />
              <span v-else>{{ m.keyReminder }}</span>
            </div>
          </NCard>
        </div>
      </div>

      <div class="text-center text-xs text-gray-400 mt-6">
        计划由 {{ sandbox.sandbox?.mode === 'ai' ? 'AI 大模型' : '本地模拟器' }} 生成，可根据实际情况灵活调整
      </div>
    </template>

    <NEmpty v-else description="未找到成长方案" class="py-20">
      <NButton type="primary" @click="router.push('/sandbox')">返回沙盘</NButton>
    </NEmpty>
  </div>
</template>
