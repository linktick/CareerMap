<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  NButton, NRadioGroup, NRadioButton, NSwitch, NSpin, NEmpty, NSelect, NTag, NIcon, useMessage,
} from 'naive-ui'
import {
  RefreshOutline, ListOutline, PulseOutline, FlameOutline,
} from '@vicons/ionicons5'
import dayjs from 'dayjs'
import { useIntelStore } from '@/stores/intel'
import type { CycleDays, HeatLevel, IntelIndustry } from '@/types/intel'
import { HEAT_COLORS, HEAT_LABELS, HEAT_ICONS, HEAT_SOFT, TREND_META, heatDots } from '@/utils/intel'
import IntelTrendChart from '@/components/intel/IntelTrendChart.vue'
import ManageIndustriesModal from '@/components/intel/ManageIndustriesModal.vue'
import IndustryDetailDrawer from '@/components/intel/IndustryDetailDrawer.vue'

const store = useIntelStore()
const message = useMessage()

const showManage = ref(false)
const showDrawer = ref(false)
const drawerIndustry = ref<IntelIndustry | null>(null)

const cycleOptions: { label: string; value: CycleDays }[] = [
  { label: '每天', value: 1 },
  { label: '每 3 天', value: 3 },
  { label: '每周', value: 7 },
  { label: '每 14 天', value: 14 },
]

const sortedIndustries = computed(() =>
  [...store.industries].sort((a, b) => b.heatScore - a.heatScore)
)

const selectedIndustry = computed(
  () => store.industryById(store.selectedId) || store.industries[0] || null
)
const trendPoints = computed(() =>
  selectedIndustry.value ? store.historyFor(selectedIndustry.value.id) : []
)

const selectOptions = computed(() =>
  sortedIndustries.value.map((i) => ({
    label: `${i.name}（热度 ${i.heatScore}）`,
    value: i.id,
  }))
)

const overviewGroups = computed<{ level: HeatLevel; items: IntelIndustry[]; hint: string }[]>(() => [
  { level: 'hot', items: store.hotTracks, hint: '招聘放量、薪资上行、关注度高' },
  { level: 'cooling', items: store.coolingTracks, hint: 'JD 收缩、供给过剩或政策承压' },
  { level: 'blueocean', items: store.blueOceanTracks, hint: '需求增长但竞争者少的小众方向' },
])

function timeAgo(iso: string | null): string {
  if (!iso) return '从未'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}

const sourceLabel = computed(() =>
  store.source === 'ai' ? 'AI 在线采集' : '本地模拟数据'
)

/** 刷新按钮文案：AI 分批采集时显示实时批次进度 */
const refreshLabel = computed(() => {
  if (!store.loading) return '立即刷新情报'
  if (store.progress) return `在线采集中 ${store.progress.done}/${store.progress.total} 批…`
  return '采集中…'
})

async function handleRefresh() {
  const ok = await store.refresh()
  if (ok) {
    if (store.lastError) {
      message.warning(store.lastError)
    } else {
      message.success(
        `情报快照已更新（${store.source === 'ai' ? 'AI 在线采集' : '本地模拟采集'}），共 ${store.industries.length} 个赛道`
      )
    }
  } else if (store.lastError) {
    message.error(store.lastError)
  }
}

function openDetail(ind: IntelIndustry) {
  store.selectIndustry(ind.id)
  drawerIndustry.value = ind
  showDrawer.value = true
}

onMounted(() => {
  store.initScheduler()
  // 跨周期回访且已到期：自动补采一次
  if (store.isDue && !store.loading) void store.refresh()
})
</script>

<template>
  <div class="max-w-[1440px] mx-auto px-4 md:px-8 py-6 space-y-6">
    <!-- ============ 1. 顶部控制面板 ============ -->
    <section
      class="relative overflow-hidden rounded-2xl bg-white border border-sky-100 shadow-sm p-5 md:p-6"
    >
      <div class="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-sky-100/50 blur-3xl pointer-events-none" />
      <div class="relative flex flex-col lg:flex-row lg:items-center gap-5 justify-between">
        <div>
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-sky-500/25">
              <n-icon :component="PulseOutline" class="text-xl" />
            </div>
            <div>
              <h1 class="text-xl font-extrabold text-gray-900 leading-tight">职业动态 · 行业情报雷达</h1>
              <p class="text-xs text-gray-400 mt-0.5">
                定时采集赛道招聘热度、技能风向与薪资动向，风口 / 收缩 / 蓝海一眼看清
              </p>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            <span class="flex items-center gap-1.5">
              <span
                class="w-1.5 h-1.5 rounded-full"
                :class="store.isDue ? 'bg-amber-400' : 'bg-emerald-400'"
              />
              上次更新：<b class="text-gray-700">{{ timeAgo(store.lastRefreshedAt) }}</b>
            </span>
            <span>数据源：<b :class="store.source === 'ai' ? 'text-sky-600' : 'text-gray-600'">{{ sourceLabel }}</b></span>
            <span>监控赛道：<b class="text-gray-700">{{ store.industries.length }}</b> 个 · 平均热度 <b class="text-gray-700">{{ store.avgHeat }}</b></span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500 whitespace-nowrap">采集周期</span>
            <NRadioGroup
              :value="store.settings.cycleDays"
              size="small"
              @update:value="(v) => store.setCycle(Number(v) as CycleDays)"
            >
              <NRadioButton v-for="o in cycleOptions" :key="o.value" :value="o.value">
                {{ o.label }}
              </NRadioButton>
            </NRadioGroup>
          </div>

          <label class="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
            <NSwitch
              size="small"
              :value="store.settings.autoRefresh"
              @update:value="(v) => store.setAutoRefresh(Boolean(v))"
            />
            定时自动采集
          </label>

          <NButton
            type="primary"
            :loading="store.loading"
            :icon="RefreshOutline"
            @click="handleRefresh"
          >
            {{ refreshLabel }}
          </NButton>
          <NButton :icon="ListOutline" @click="showManage = true">管理监控行业</NButton>
        </div>
      </div>

      <!-- 采集中：AI 分批并发进度条 -->
      <div
        v-if="store.loading && store.progress"
        class="relative mt-4 text-xs rounded-lg bg-sky-50 border border-sky-200 text-sky-700 px-3 py-2"
      >
        <div class="flex items-center justify-between mb-1.5">
          <span>🔄 AI 正在分批在线采集赛道情报（每批 ≤4 个赛道、并发请求），请勿重复点击…</span>
          <span class="font-bold">{{ store.progress.done }} / {{ store.progress.total }} 批</span>
        </div>
        <div class="h-1.5 rounded-full bg-sky-100 overflow-hidden">
          <div
            class="h-full rounded-full bg-sky-500 transition-all duration-500"
            :style="{ width: (store.progress.total ? (store.progress.done / store.progress.total) * 100 : 0) + '%' }"
          />
        </div>
      </div>

      <div v-if="store.lastError" class="relative mt-4 text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2">
        ⚠️ {{ store.lastError }}
      </div>
    </section>

    <!-- ============ 2. 大盘概览：热力标签 ============ -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        v-for="g in overviewGroups"
        :key="g.level"
        class="rounded-2xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        :style="{ borderColor: HEAT_COLORS[g.level] + '33' }"
      >
        <div class="flex items-center justify-between mb-1">
          <div
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
            :style="{ color: HEAT_COLORS[g.level], background: HEAT_SOFT[g.level] }"
          >
            <span>{{ HEAT_ICONS[g.level] }}</span>{{ HEAT_LABELS[g.level] }}
            <span class="ml-1">{{ g.items.length }}</span>
          </div>
        </div>
        <p class="text-[11px] text-gray-400 mb-3">{{ g.hint }}</p>
        <div v-if="g.items.length" class="flex flex-wrap gap-1.5">
          <button
            v-for="ind in g.items"
            :key="ind.id"
            class="px-2.5 py-1 rounded-full text-xs font-medium border transition-all hover:-translate-y-0.5 hover:shadow-sm"
            :style="{
              color: HEAT_COLORS[g.level],
              borderColor: HEAT_COLORS[g.level] + '44',
              background: HEAT_SOFT[g.level],
            }"
            @click="openDetail(ind)"
          >
            {{ ind.name }}
            <span class="opacity-60">·{{ ind.heatScore }}</span>
          </button>
        </div>
        <div v-else class="text-xs text-gray-300 py-2">当前周期暂无赛道落入该区间</div>
      </div>
    </section>

    <!-- ============ 3+4. 卡片网格 & 趋势图 ============ -->
    <div class="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
      <!-- 行业卡片网格 -->
      <section>
        <div v-if="sortedIndustries.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <article
            v-for="ind in sortedIndustries"
            :key="ind.id"
            class="group relative rounded-2xl bg-white border border-gray-100 shadow-sm p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-sky-200"
            :class="store.selectedId === ind.id ? 'ring-2 ring-sky-400/60' : ''"
            @click="openDetail(ind)"
          >
            <!-- 头部：名称 + 热力徽章 -->
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="font-bold text-gray-900 truncate">{{ ind.name }}</h3>
                <div class="mt-1.5 flex flex-wrap gap-1">
                  <NTag
                    v-for="t in ind.tags.slice(0, 3)"
                    :key="t"
                    size="tiny"
                    :bordered="false"
                    type="default"
                  >
                    {{ t }}
                  </NTag>
                </div>
              </div>
              <div
                class="shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center font-black leading-none"
                :style="{
                  color: HEAT_COLORS[ind.heatLevel],
                  background: HEAT_SOFT[ind.heatLevel],
                }"
              >
                <span class="text-lg">{{ ind.heatScore }}</span>
                <span class="text-[10px] font-medium mt-0.5 opacity-70">热度</span>
              </div>
            </div>

            <!-- 摘要 -->
            <p class="mt-3 text-[13px] text-gray-500 leading-relaxed line-clamp-2">
              {{ ind.summary }}
            </p>

            <!-- 指标行 -->
            <div class="mt-3 flex items-center gap-4 text-[11px] text-gray-500">
              <span>需求 <b class="text-gray-700 tracking-wider">{{ heatDots(ind.demandLevel) }}</b></span>
              <span>竞争 <b class="text-gray-700 tracking-wider">{{ heatDots(ind.competition) }}</b></span>
              <span>中级 <b class="text-gray-700">{{ ind.salaryMid[0] }}-{{ ind.salaryMid[1] }}K</b></span>
              <span
                class="ml-auto inline-flex items-center gap-0.5 font-semibold"
                :style="{ color: TREND_META[ind.trend].color }"
              >
                {{ TREND_META[ind.trend].icon }}
                <template v-if="ind.heatDelta !== 0">
                  {{ ind.heatDelta > 0 ? '+' : '' }}{{ ind.heatDelta }}
                </template>
              </span>
            </div>

            <!-- 热度条 -->
            <div class="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{ width: ind.heatScore + '%', background: HEAT_COLORS[ind.heatLevel] }"
              />
            </div>

            <div class="mt-3 flex items-center justify-between text-[11px] text-gray-400">
              <span>快照：{{ store.lastRefreshedAt ? dayjs(store.lastRefreshedAt).format('MM-DD HH:mm') : '—' }}</span>
              <span class="text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                查看完整情报 →
              </span>
            </div>
          </article>
        </div>
        <NEmpty v-else description="还没有监控任何赛道" class="py-16 bg-white rounded-2xl border border-gray-100">
          <template #extra>
            <NButton type="primary" @click="showManage = true">去添加监控行业</NButton>
          </template>
        </NEmpty>
      </section>

      <!-- 趋势图表区 -->
      <aside class="xl:sticky xl:top-[84px]">
        <div class="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
          <div class="flex items-center gap-2 mb-3">
            <n-icon :component="FlameOutline" class="text-lg text-rose-500" />
            <h2 class="font-bold text-gray-900 text-[15px]">热度走势</h2>
          </div>
          <NSelect
            :value="selectedIndustry?.id ?? null"
            :options="selectOptions"
            size="small"
            class="mb-2"
            placeholder="选择赛道"
            @update:value="(v) => v && store.selectIndustry(String(v))"
          />
          <NSpin :show="store.loading">
            <div v-if="selectedIndustry" class="h-[260px]">
              <IntelTrendChart
                :points="trendPoints"
                :heat-level="selectedIndustry.heatLevel"
                :industry-name="selectedIndustry.name"
              />
            </div>
            <div v-else class="h-[260px] flex items-center justify-center text-sm text-gray-400">
              暂无数据
            </div>
          </NSpin>
          <div v-if="selectedIndustry" class="mt-2 grid grid-cols-3 gap-2 text-center">
            <div class="rounded-lg bg-gray-50 py-2">
              <div class="text-[11px] text-gray-400">较上期</div>
              <div
                class="text-sm font-bold"
                :style="{ color: TREND_META[selectedIndustry.trend].color }"
              >
                {{ selectedIndustry.heatDelta > 0 ? '+' : '' }}{{ selectedIndustry.heatDelta || '—' }}
              </div>
            </div>
            <div class="rounded-lg bg-gray-50 py-2">
              <div class="text-[11px] text-gray-400">薪资同比</div>
              <div
                class="text-sm font-bold"
                :class="selectedIndustry.salaryYoY >= 0 ? 'text-rose-500' : 'text-indigo-600'"
              >
                {{ selectedIndustry.salaryYoY >= 0 ? '+' : '' }}{{ selectedIndustry.salaryYoY }}%
              </div>
            </div>
            <div class="rounded-lg bg-gray-50 py-2">
              <div class="text-[11px] text-gray-400">需求强度</div>
              <div class="text-sm font-bold text-gray-700">{{ heatDots(selectedIndustry.demandLevel) }}</div>
            </div>
          </div>
          <p class="mt-3 text-[11px] text-gray-400 leading-relaxed">
            折线为近 {{ trendPoints.length }} 次采集快照的热度指数（0~100）。
            {{ store.source === 'ai' ? 'AI 在线模式由大模型生成最新情报。' : '本地模式由内置数据集按日期模拟漂移。' }}
          </p>
        </div>
      </aside>
    </div>

    <ManageIndustriesModal v-model:show="showManage" />
    <IndustryDetailDrawer
      v-model:show="showDrawer"
      :industry="drawerIndustry"
      :snapshot-date="store.lastRefreshedAt"
    />
  </div>
</template>
