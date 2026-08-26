<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton, NCard, NSpin, NRadio, NAlert,
} from 'naive-ui'
import { useSandboxStore } from '@/stores/sandbox'
import { involutionColor, involutionText, scoreStars } from '@/utils/format'
import type { CareerRoute } from '@/types/career'

const router = useRouter()
const sandbox = useSandboxStore()
const selectedTarget = ref<string>('')

onMounted(async () => {
  if (!sandbox.sandbox) {
    // 没有沙盘数据时跳转到沙盘页（沙盘页会根据是否有档案自行决定生成或跳转到填写页）
    router.push('/sandbox')
    return
  }
  if (sandbox.compareRouteIds.length < 2) {
    router.push('/sandbox')
    return
  }
  if (!sandbox.compareResult) {
    // 等待对比结果返回；compareResult 一旦写入 store，下方 computed
    // （dimensions / targetRoutes / compareRows）会自动重算并渲染
    await sandbox.runCompare()
  }
  if (!selectedTarget.value) {
    selectedTarget.value = sandbox.compareRouteIds[0] || ''
  }
})

// 对比路线集合变化（例如动态调参后刷新了路线）时，重置默认选中目标
watch(
  () => sandbox.compareRouteIds,
  (ids) => {
    if (ids.length && !ids.includes(selectedTarget.value)) {
      selectedTarget.value = ids[0]
    }
  },
  { deep: true }
)

const compareRows = computed(() => sandbox.compareResult?.comparison || [])
const targetRoutes = computed(() =>
  sandbox.routes.filter((r) => sandbox.compareRouteIds.includes(r.id))
)

function rowOf(id: string) {
  return compareRows.value.find((r) => r.routeId === id)
}

interface RowData {
  key: string
  label: string
  values: Record<string, any>
  render: (val: any, id: string) => string
}

// 注意：这里必须保持为 computed，不能在末尾取 .value。
// 否则组件 setup 时 compareResult 尚未返回，dimensions 会被冻结为
// 一组全是 '-' 的静态数组，后续 compareResult 加载完成也不会刷新，
// 表现为对比表格空白、必须刷新页面才能显示。
const dimensions = computed<RowData[]>(() => {
  const makeVal = (fn: (r: CareerRoute, row: any) => any) => {
    const v: Record<string, any> = {}
    targetRoutes.value.forEach((r) => {
      const row = rowOf(r.id)
      v[r.id] = row ? fn(r, row) : '-'
    })
    return v
  }
  return [
    {
      key: 'entryCost', label: '入门学习成本',
      values: makeVal((_r, row) => row.entryCost),
      render: (v) => `<span style="color:#666">${scoreStars(Number(v) || 0)}</span>`,
    },
    {
      key: 'salary3', label: '3 年薪资上限 (K)',
      values: makeVal((_r, row) => row.threeYearSalaryMax),
      render: (v) => `<b style="color:#1677ff;font-size:16px">${v === '-' ? '-' : v + 'K'}</b>`,
    },
    {
      key: 'involution', label: '内卷程度',
      values: makeVal((r) => r),
      render: (v: CareerRoute | '-') => {
        if (v === '-') return '-'
        return `<span style="color:${involutionColor(v.involutionLevel)};font-weight:600">
          ${scoreStars(Math.ceil(v.involutionScore / 2))} · ${involutionText(v.involutionLevel)}
        </span>`
      },
    },
    {
      key: 'switch', label: '转行难度',
      values: makeVal((_r, row) => row.switchDifficulty),
      render: (v) => scoreStars(Number(v) || 0),
    },
    {
      key: 'ceiling', label: '晋升天花板',
      values: makeVal((r) => r.ceiling),
      render: (v) => `<span style="font-size:13px">${v}</span>`,
    },
    {
      key: 'risk', label: '风险等级',
      values: makeVal((_r, row) => row.riskLevel),
      render: (v) => {
        const n = Number(v) || 0
        const c = n <= 2 ? '#52c41a' : n <= 3 ? '#faad14' : '#ff4d4f'
        return `<span style="color:${c};font-weight:600">${scoreStars(n)}</span>`
      },
    },
    {
      key: 'match', label: '与你匹配度',
      values: makeVal((_r, row) => row.matchScore),
      render: (v) => `<b style="color:#1677ff">${v} 分</b>`,
    },
  ]
})

function goGrowth() {
  if (!selectedTarget.value) return
  sandbox.selectRoute(selectedTarget.value)
  const r = sandbox.routes.find((x) => x.id === selectedTarget.value)
  if (r) {
    sandbox.generateGrowthPlan(r).then(() => {
      router.push(`/growth/${selectedTarget.value}`)
    })
  }
}
</script>

<template>
  <div class="max-w-[1280px] mx-auto px-4 md:px-8 py-8 md:py-10">
    <div class="relative bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 md:p-8 mb-8 text-white shadow-lg shadow-blue-500/20 overflow-hidden">
      <div class="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
      <div class="relative flex items-center justify-between flex-wrap gap-4">
        <div>
          <div class="text-xs font-semibold tracking-wider text-blue-200 uppercase mb-2">Compare</div>
          <h1 class="text-2xl md:text-3xl font-extrabold">赛道横向对比</h1>
          <p class="text-sm md:text-base text-blue-100/80 mt-2">
            已选 <b class="text-white">{{ targetRoutes.length }}</b> 条路线，统一维度客观呈现，不替你做决定
          </p>
        </div>
        <NButton size="large" class="!bg-white/15 !text-white !border-white/30 hover:!bg-white/25" @click="router.push('/sandbox')">
          ← 返回沙盘
        </NButton>
      </div>
    </div>

    <div v-if="!sandbox.compareResult" class="flex justify-center py-16">
      <NSpin size="large" />
    </div>

    <template v-else>
      <NCard :bordered="false" class="shadow-sm mb-6 overflow-x-auto">
        <table class="w-full text-sm" style="min-width: 600px">
          <thead>
            <tr class="border-b-2 border-gray-200">
              <th class="text-left p-3 bg-gray-50 font-medium text-gray-600 w-40">对比维度</th>
              <th
                v-for="r in targetRoutes"
                :key="r.id"
                class="text-left p-3 font-medium"
                :style="{ borderBottom: `3px solid ${involutionColor(r.involutionLevel)}` }"
              >
                <div class="text-gray-900">{{ r.name }}</div>
                <div class="text-xs text-gray-500 font-normal mt-1">{{ r.industry }}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="dim in dimensions" :key="dim.key" class="border-b border-gray-100 hover:bg-gray-50/60">
              <td class="p-3 text-gray-600 bg-gray-50/50">
                <div class="font-medium">{{ dim.label }}</div>
              </td>
              <td v-for="r in targetRoutes" :key="r.id" class="p-3">
                <span v-html="dim.render(dim.values[r.id], r.id)" />
              </td>
            </tr>
            <tr>
              <td class="p-3 bg-gray-50/50 font-medium text-gray-600">为这条路线生成成长方案</td>
              <td v-for="r in targetRoutes" :key="r.id" class="p-3">
                <NRadio :checked="selectedTarget === r.id" @update:checked="() => (selectedTarget = r.id)">
                  选择
                </NRadio>
              </td>
            </tr>
          </tbody>
        </table>
      </NCard>

      <NCard v-if="sandbox.compareResult" title="📊 客观选择建议" :bordered="false" class="shadow-sm mb-6">
        <div class="text-sm text-gray-700 leading-7 whitespace-pre-line">
          {{ sandbox.compareResult.advice }}
        </div>
      </NCard>
      <NAlert v-else type="warning" class="mb-6">
        对比结果加载失败，请返回沙盘重试。
      </NAlert>

      <div class="flex justify-center gap-3">
        <NButton size="large" @click="router.push('/sandbox')">返回沙盘</NButton>
        <NButton size="large" type="primary" @click="goGrowth">
          为「{{ sandbox.routes.find(r => r.id === selectedTarget)?.name || '' }}」生成成长方案 →
        </NButton>
      </div>
    </template>
  </div>
</template>
