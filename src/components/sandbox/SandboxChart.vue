<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as echarts from 'echarts'
import type { CareerRoute } from '@/types/career'
import { involutionColor } from '@/utils/format'

const props = defineProps<{
  routes: CareerRoute[]
  selectedId: string | null
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
}>()

const chartEl = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

const STAGE_LABEL: Record<string, string> = {
  current: '现在',
  year1: '第 1 年',
  year2: '第 2 年',
  year3: '第 3 年',
}

const selectedRoute = computed(() =>
  props.routes.find((r) => r.id === props.selectedId) || props.routes[0]
)

// x 轴类目根据路线实际节点阶段生成（不同身份起点不同：
// 在校生/应届从"现在"开始，0~1 年从"第 1 年"开始，1~3 年从"第 2 年"开始）
const stageLabels = computed<string[]>(() => {
  const first = props.routes[0]
  if (!first) return ['现在', '第 1 年', '第 2 年', '第 3 年']
  return first.nodes.map((n) => STAGE_LABEL[n.stage] || n.stage)
})

function renderChart() {
  if (!chart) return
  if (props.routes.length === 0) {
    chart.clear()
    return
  }

  const series: any[] = []
  const yAxisMax = Math.ceil(
    Math.max(...props.routes.flatMap((r) => r.nodes.map((n) => n.salaryRange[1]))) / 10
  ) * 10 + 10
  const yAxisMin = 0

  // 每条路线一条连线。x 轴是类目轴，data 按节点顺序传薪资本均值即可，
  // ECharts 会自动把第 i 个点落到第 i 个类目下。
  props.routes.forEach((route) => {
    const color = involutionColor(route.involutionLevel)
    const isSelected = route.id === props.selectedId
    const points = route.nodes.map((node, idx) => {
      const y = Math.round((node.salaryRange[0] + node.salaryRange[1]) / 2)
      return {
        // 类目轴下直接传数值，按索引对应到 stageLabels
        value: y,
        symbolSize: isSelected ? 18 : 12,
        itemStyle: { color },
        label: {
          show: isSelected,
          position: 'top',
          formatter: `${y}K`,
          color,
          fontSize: 12,
          fontWeight: 600,
        },
        emphasis: { focus: 'series' },
      }
    })

    series.push({
      id: route.id,
      name: route.name,
      type: 'line',
      data: points,
      smooth: false,
      symbol: 'circle',
      symbolSize: isSelected ? 18 : 12,
      lineStyle: { width: isSelected ? 4 : 2, opacity: isSelected ? 1 : 0.5, color },
      itemStyle: { color },
      label: { show: false },
      emphasis: { focus: 'series' },
      z: isSelected ? 10 : 2,
    } as any)
  })

  const option: any = {
    backgroundColor: 'transparent',
    grid: { left: 70, right: 60, top: 50, bottom: 60 },
    legend: {
      show: props.routes.length > 0,
      top: 8,
      type: 'scroll',
      textStyle: { color: '#4b5563', fontSize: 12 },
      data: props.routes.map((r) => r.name),
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.98)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: { color: '#1f2937', fontSize: 12 },
      extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px; max-width: 280px; white-space: normal;',
      formatter: (params: any) => {
        const route = props.routes.find((r) => r.id === params.seriesId)
        if (!route) return ''
        const idx = params.dataIndex
        const node = route.nodes[idx]
        const stageText = stageLabels.value[idx] || ''
        const matchTip = route.matchScore ? `匹配度 ${route.matchScore} 分` : ''
        return `
          <div style="font-weight:600;margin-bottom:6px;color:${involutionColor(route.involutionLevel)}">
            ${route.name}
          </div>
          <div style="margin-bottom:4px"><b>${stageText}：</b>${node.title}</div>
          <div style="margin-bottom:4px"><b>月薪：</b>${node.salaryRange[0]}-${node.salaryRange[1]}K</div>
          <div style="margin-bottom:4px"><b>需求量：</b>${'●'.repeat(node.demandLevel)}${'○'.repeat(5 - node.demandLevel)}</div>
          <div style="margin-bottom:4px"><b>入行成本：</b>${'★'.repeat(route.entryCost)}${'☆'.repeat(5 - route.entryCost)}</div>
          ${matchTip ? `<div style="color:#1677ff;font-weight:600">${matchTip}</div>` : ''}
          <div style="color:#666;font-size:11px;margin-top:4px;border-top:1px dashed #eee;padding-top:4px">
            ${node.bottleneck}
          </div>
        `
      },
    },
    xAxis: {
      type: 'category',
      data: stageLabels.value,
      position: 'bottom',
      axisLine: { lineStyle: { color: '#d1d5db' } },
      axisTick: { show: false },
      axisLabel: { color: '#6b7280', fontSize: 13, fontWeight: 500 },
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      name: '月薪 (K)',
      nameTextStyle: { color: '#9ca3af', fontSize: 11 },
      min: yAxisMin,
      max: yAxisMax,
      splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
      axisLabel: { color: '#9ca3af' },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series,
  }

  chart.setOption(option, true)

  chart.off('click')
  chart.on('click', (params: any) => {
    if (params.seriesId) {
      emit('select', params.seriesId)
    }
  })
}

onMounted(() => {
  if (chartEl.value) {
    chart = echarts.init(chartEl.value)
    renderChart()
    const onResize = () => chart?.resize()
    window.addEventListener('resize', onResize)
    onUnmounted(() => {
      window.removeEventListener('resize', onResize)
      chart?.dispose()
    })
  }
})

watch(() => [props.routes, props.selectedId], () => {
  renderChart()
}, { deep: true })
</script>

<template>
  <div ref="chartEl" class="w-full h-full min-h-[500px]" />
</template>
