<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { NDrawer, NDrawerContent, NButton, NTag, NDivider } from 'naive-ui'
import { CompassOutline } from '@vicons/ionicons5'
import dayjs from 'dayjs'
import type { IntelIndustry } from '@/types/intel'
import { useIntelStore } from '@/stores/intel'
import { useProfileStore } from '@/stores/profile'
import { useModeStore } from '@/stores/mode'
import { HEAT_COLORS, HEAT_LABELS, HEAT_ICONS, HEAT_SOFT, TREND_META, heatDots } from '@/utils/intel'

const props = defineProps<{
  show: boolean
  industry: IntelIndustry | null
  snapshotDate: string | null
}>()
const emit = defineEmits<{ (e: 'update:show', v: boolean): void }>()

const router = useRouter()
const store = useIntelStore()
const profileStore = useProfileStore()
const modeStore = useModeStore()

const trend = computed(() => (props.industry ? TREND_META[props.industry.trend] : TREND_META.flat))

function goSandbox() {
  if (!props.industry) return
  const ind = props.industry
  // 把该赛道名称与核心标签作为「目标岗位/方向」意向词带入向导（去重）；
  // 向导页目标岗位选择器支持自定义标签，这些行业词会作为关键词参与路线匹配
  const targets = new Set(profileStore.profile.targetIndustries)
  targets.add(ind.name)
  ind.tags
    .filter((t) => ['AI', '大模型', '新能源', '半导体', '芯片', '互联网', '医疗', '教育', '电商', '银行'].some((k) => t.includes(k)))
    .forEach((t) => targets.add(t))
  profileStore.update({ targetIndustries: Array.from(targets).slice(0, 6) })
  emit('update:show', false)
  modeStore.setMode(store.source === 'ai' ? 'ai' : 'local')
  router.push('/wizard')
}
</script>

<template>
  <NDrawer
    :show="show"
    :width="540"
    placement="right"
    @update:show="emit('update:show', $event)"
  >
    <NDrawerContent v-if="industry" closable>
      <template #header>
        <div class="pr-6">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-lg font-bold text-gray-900">{{ industry.name }}</span>
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
              :style="{ color: HEAT_COLORS[industry.heatLevel], background: HEAT_SOFT[industry.heatLevel] }"
            >
              {{ HEAT_ICONS[industry.heatLevel] }} {{ HEAT_LABELS[industry.heatLevel] }}
            </span>
            <span
              class="inline-flex items-center gap-1 text-xs font-semibold"
              :style="{ color: trend.color }"
            >
              {{ trend.icon }} 近期{{ trend.text }}
              <template v-if="industry.heatDelta !== 0">
                （{{ industry.heatDelta > 0 ? '+' : '' }}{{ industry.heatDelta }}）
              </template>
            </span>
          </div>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <NTag v-for="t in industry.tags" :key="t" size="small" :bordered="false" type="default">
              {{ t }}
            </NTag>
          </div>
        </div>
      </template>

      <!-- 核心指标 -->
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
          <div class="text-xs text-gray-400 mb-1">热度指数</div>
          <div class="text-2xl font-black" :style="{ color: HEAT_COLORS[industry.heatLevel] }">
            {{ industry.heatScore }}<span class="text-xs font-normal text-gray-400"> / 100</span>
          </div>
          <div class="mt-1.5 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              class="h-full rounded-full transition-all"
              :style="{ width: industry.heatScore + '%', background: HEAT_COLORS[industry.heatLevel] }"
            />
          </div>
        </div>
        <div class="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
          <div class="text-xs text-gray-400 mb-1">薪资同比</div>
          <div
            class="text-2xl font-black"
            :class="industry.salaryYoY >= 0 ? 'text-rose-500' : 'text-indigo-600'"
          >
            {{ industry.salaryYoY >= 0 ? '+' : '' }}{{ industry.salaryYoY }}%
          </div>
          <div class="text-xs text-gray-400 mt-1.5">初级 {{ industry.salaryJunior[0] }}-{{ industry.salaryJunior[1] }}K · 中级 {{ industry.salaryMid[0] }}-{{ industry.salaryMid[1] }}K</div>
        </div>
        <div class="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
          <div class="text-xs text-gray-400 mb-1">招聘需求强度</div>
          <div class="text-base font-bold text-gray-800 tracking-wider">{{ heatDots(industry.demandLevel) }}</div>
        </div>
        <div class="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
          <div class="text-xs text-gray-400 mb-1">竞争 / 内卷强度</div>
          <div class="text-base font-bold text-gray-800 tracking-wider">{{ heatDots(industry.competition) }}</div>
        </div>
      </div>

      <div class="mt-4 text-sm text-gray-600 leading-relaxed rounded-xl bg-sky-50/70 border border-sky-100 p-3.5">
        {{ industry.summary }}
      </div>

      <NDivider>关键动向信号</NDivider>
      <ul class="space-y-2">
        <li v-for="(s, i) in industry.signals" :key="i" class="flex gap-2 text-sm text-gray-700 leading-relaxed">
          <span class="mt-1 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />{{ s }}
        </li>
      </ul>

      <NDivider>技能风向</NDivider>
      <div class="space-y-3">
        <div>
          <div class="text-xs font-semibold text-rose-500 mb-1.5">🔥 当下抢手</div>
          <div class="flex flex-wrap gap-1.5">
            <NTag v-for="s in industry.hotSkills" :key="s" size="small" type="error" :bordered="false">
              {{ s }}
            </NTag>
          </div>
        </div>
        <div v-if="industry.decliningSkills.length">
          <div class="text-xs font-semibold text-indigo-500 mb-1.5">🧊 正在降温</div>
          <div class="flex flex-wrap gap-1.5">
            <NTag v-for="s in industry.decliningSkills" :key="s" size="small" type="info" :bordered="false">
              {{ s }}
            </NTag>
          </div>
        </div>
      </div>

      <NDivider>机会与风险</NDivider>
      <div class="grid grid-cols-1 gap-3">
        <div class="rounded-xl border border-teal-100 bg-teal-50/60 p-3.5">
          <div class="text-xs font-bold text-teal-700 mb-1.5">✅ 机会点</div>
          <ul class="space-y-1.5">
            <li v-for="(o, i) in industry.opportunities" :key="i" class="text-sm text-teal-900/80 leading-relaxed flex gap-2">
              <span class="text-teal-500 shrink-0">→</span>{{ o }}
            </li>
          </ul>
        </div>
        <div class="rounded-xl border border-rose-100 bg-rose-50/60 p-3.5">
          <div class="text-xs font-bold text-rose-700 mb-1.5">⚠️ 风险预警</div>
          <ul class="space-y-1.5">
            <li v-for="(r, i) in industry.risks" :key="i" class="text-sm text-rose-900/80 leading-relaxed flex gap-2">
              <span class="text-rose-500 shrink-0">!</span>{{ r }}
            </li>
          </ul>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs text-gray-400">
            快照日期：{{ snapshotDate ? dayjs(snapshotDate).format('YYYY-MM-DD HH:mm') : '—' }}
          </span>
          <NButton type="primary" :icon="CompassOutline" @click="goSandbox">
            用这个赛道去沙盘推演 →
          </NButton>
        </div>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
