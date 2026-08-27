<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import * as echarts from 'echarts'
import { NButton, NTag, NProgress, NSpace, NEmpty } from 'naive-ui'
import type { CareerRoute } from '@/types/career'
import { involutionColor, involutionText, scoreStars } from '@/utils/format'

const props = defineProps<{
  route: CareerRoute | null
  inCompare: boolean
  hasGrowth: boolean
  generating: boolean
}>()

const emit = defineEmits<{
  (e: 'generateGrowth'): void
  (e: 'toggleCompare'): void
}>()

const salaryEl = ref<HTMLDivElement>()
let salaryChart: echarts.ECharts | null = null

/** 短阶段标签：现在 / Y1 / Y2 ...（随路线节点数自适应，长周期最多到 Y8） */
const stageShortLabels = computed(() => {
  const len = props.route?.nodes.length || 4
  return ['现在', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7', 'Y8'].slice(0, len)
})
const horizonYears = computed(() => (props.route?.nodes.length || 4) - 1)

function renderSalary() {
  if (!salaryEl.value || !props.route) return
  if (!salaryChart) salaryChart = echarts.init(salaryEl.value)
  const r = props.route
  salaryChart.setOption({
    grid: { left: 40, right: 16, top: 16, bottom: 28 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: stageShortLabels.value,
      axisLine: { lineStyle: { color: '#d1d5db' } },
      axisLabel: { color: '#9ca3af', fontSize: 11, interval: 0 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#9ca3af', fontSize: 10, formatter: '{value}K' },
      splitLine: { lineStyle: { color: '#f3f4f6' } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'line',
        data: r.salaryCurve.map((s) => s.max),
        smooth: true,
        lineStyle: { color: '#1677ff', width: 2 },
        itemStyle: { color: '#1677ff' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(22,119,255,0.25)' },
            { offset: 1, color: 'rgba(22,119,255,0.02)' },
          ]),
        },
        symbol: 'circle',
        symbolSize: 6,
      },
      {
        type: 'line',
        data: r.salaryCurve.map((s) => s.min),
        smooth: true,
        lineStyle: { color: '#69b1ff', width: 1.5, type: 'dashed' },
        itemStyle: { color: '#69b1ff' },
        symbol: 'circle',
        symbolSize: 5,
      },
    ],
  })
}

onMounted(() => {
  renderSalary()
  window.addEventListener('resize', () => salaryChart?.resize())
})

watch(() => props.route, () => renderSalary(), { immediate: true })

const involutionPercent = computed(() => props.route ? props.route.involutionScore * 10 : 0)
</script>

<template>
  <div v-if="route" class="h-full flex flex-col">
    <div class="p-5 border-b border-gray-100">
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1">
          <h3 class="font-bold text-base text-gray-900">{{ route.name }}</h3>
          <p class="text-xs text-gray-500 mt-1">{{ route.summary }}</p>
        </div>
        <NTag
          :color="{ color: `${involutionColor(route.involutionLevel)}20`, textColor: involutionColor(route.involutionLevel), borderColor: `${involutionColor(route.involutionLevel)}50` }"
          size="small"
        >
          {{ involutionText(route.involutionLevel) }}
        </NTag>
      </div>
      <div class="flex items-center gap-3 mt-3 text-xs text-gray-500">
        <span>行业：{{ route.industry }}</span>
        <span>匹配度：<b class="text-brand">{{ route.matchScore }}</b></span>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-5 space-y-5">
      <!-- Salary -->
      <div>
        <div class="text-sm font-semibold text-gray-800 mb-2">
          {{ horizonYears }} 年薪资走势
          <span v-if="horizonYears >= 5" class="ml-1 text-[10px] text-purple-600 font-normal">长周期深度推演</span>
        </div>
        <div ref="salaryEl" class="w-full h-[160px]" />
        <div class="text-xs text-gray-400 text-center">上：薪资上限，下：薪资下限（K/月）</div>
      </div>

      <!-- Involution -->
      <div>
        <div class="flex justify-between text-sm mb-2">
          <span class="font-semibold text-gray-800">内卷程度</span>
          <span :style="{ color: involutionColor(route.involutionLevel) }" class="font-medium">
            {{ route.involutionScore }} / 10
          </span>
        </div>
        <NProgress
          :percentage="involutionPercent"
          :color="involutionColor(route.involutionLevel)"
          :height="8"
          :show-indicator="false"
          processing
        />
      </div>

      <!-- Bottlenecks -->
      <div>
        <div class="text-sm font-semibold text-gray-800 mb-2">阶段瓶颈</div>
        <div class="space-y-2">
          <div v-for="(n, i) in route.nodes" :key="i" class="flex gap-2 text-xs">
            <div class="w-12 shrink-0 text-gray-400">{{ stageShortLabels[i] }}</div>
            <div class="text-gray-700 leading-relaxed">
              <span class="text-gray-500 mr-1">{{ n.title }}</span>
              {{ n.bottleneck }}
            </div>
          </div>
        </div>
      </div>

      <!-- Skills -->
      <div>
        <div class="text-sm font-semibold text-gray-800 mb-2">必备技能</div>
        <NSpace wrap :size="[6, 6]">
          <NTag v-for="s in route.nodes[2].requiredSkills" :key="s" size="small" type="info" :bordered="false">
            {{ s }}
          </NTag>
        </NSpace>
      </div>

      <!-- Certificates -->
      <div v-if="route.nodes.some(n => n.certificates.length)">
        <div class="text-sm font-semibold text-gray-800 mb-2">推荐证书</div>
        <NSpace wrap :size="[6, 6]">
          <NTag v-for="c in route.nodes.flatMap(n => n.certificates)" :key="c" size="small" :bordered="false">
            📜 {{ c }}
          </NTag>
        </NSpace>
      </div>

      <!-- Pitfalls -->
      <div class="bg-red-50/60 border border-red-100 rounded-lg p-3">
        <div class="text-sm font-semibold text-red-600 mb-2">⚠️ 踩坑预警</div>
        <ul class="space-y-1.5 text-xs text-red-700 leading-relaxed list-disc pl-4">
          <li v-for="(p, i) in route.pitfalls" :key="i">{{ p }}</li>
        </ul>
      </div>

      <!-- Meta -->
      <div class="grid grid-cols-2 gap-3 text-xs">
        <div class="bg-gray-50 rounded-lg p-3">
          <div class="text-gray-500">入门成本</div>
          <div class="text-gray-800 font-medium mt-1">{{ scoreStars(route.entryCost) }}</div>
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <div class="text-gray-500">转行难度</div>
          <div class="text-gray-800 font-medium mt-1">{{ scoreStars(route.switchDifficulty) }}</div>
        </div>
        <div class="bg-gray-50 rounded-lg p-3 col-span-2">
          <div class="text-gray-500">晋升天花板</div>
          <div class="text-gray-800 font-medium mt-1">{{ route.ceiling }}</div>
        </div>
      </div>
    </div>

    <div class="p-4 border-t border-gray-100 bg-white space-y-2">
      <NButton type="primary" block @click="emit('generateGrowth')" :loading="generating">
        {{ generating ? '正在生成...' : hasGrowth ? '已生成 - 查看方案' : '生成 12 个月成长方案' }}
      </NButton>
      <NButton block :type="inCompare ? 'warning' : 'default'" @click="emit('toggleCompare')">
        {{ inCompare ? '✓ 已加入对比（点击移除）' : '+ 加入对比' }}
      </NButton>
    </div>
  </div>
  <div v-else class="h-full flex items-center justify-center">
    <NEmpty description="选择一条路线查看详情" />
  </div>
</template>
