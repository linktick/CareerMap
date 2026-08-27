<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import type { HistoryPoint } from '@/stores/intel'
import type { HeatLevel } from '@/types/intel'
import { HEAT_COLORS } from '@/utils/intel'

const props = defineProps<{
  points: HistoryPoint[]
  heatLevel: HeatLevel
  industryName: string
}>()

const chartEl = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function renderChart() {
  if (!chart) return
  const color = HEAT_COLORS[props.heatLevel] || HEAT_COLORS.steady
  const data = props.points.map((p) => p.heat)
  const labels = props.points.map((p) => fmtDate(p.date))
  const last = data.length ? data[data.length - 1] : 0

  chart.setOption(
    {
      backgroundColor: 'transparent',
      grid: { left: 44, right: 56, top: 30, bottom: 36 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.98)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: { color: '#1f2937', fontSize: 12 },
        extraCssText:
          'box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px; max-width: 260px;',
        axisPointer: { type: 'line', lineStyle: { color: '#cbd5e1', type: 'dashed' } },
        formatter: (params: any) => {
          const idx = params[0]?.dataIndex ?? 0
          const p = props.points[idx]
          if (!p) return ''
          const src =
            p.source === 'ai'
              ? 'AI 在线采集'
              : p.source === 'fill'
              ? '本地补点'
              : '本地模拟采集'
          return `
            <div style="font-weight:600;margin-bottom:4px">${props.industryName} · ${labels[idx]}</div>
            <div style="margin-bottom:2px"><b>热度指数：</b>${p.heat} / 100</div>
            <div style="margin-bottom:2px"><b>需求强度：</b>${'●'.repeat(p.demand)}${'○'.repeat(5 - p.demand)}</div>
            <div style="margin-bottom:2px"><b>中级岗月薪均值：</b>${p.salaryMid}K</div>
            <div style="color:#94a3b8;font-size:11px;margin-top:2px">${src}</div>
          `
        },
      },
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: '热度指数',
          type: 'line',
          data,
          smooth: 0.3,
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: { width: 2.5, color },
          itemStyle: { color, borderColor: '#fff', borderWidth: 2 },
          showSymbol: true,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: color + '33' },
                { offset: 1, color: color + '05' },
              ],
            },
          },
          // 只在末点直接标数值（selective direct label）
          label: {
            show: true,
            position: 'right',
            formatter: (p: any) => (p.dataIndex === data.length - 1 ? `${last}` : ''),
            color,
            fontSize: 13,
            fontWeight: 700,
          },
          emphasis: { focus: 'series' },
        },
      ],
    },
    true
  )
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

watch(() => [props.points, props.heatLevel], renderChart, { deep: true })
</script>

<template>
  <div ref="chartEl" class="w-full h-full min-h-[260px]" />
</template>
