<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NModal, NCard, NCheckbox, NInput, NButton, NSpace, NTag,
} from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import { INTEL_CATALOG } from '@/adapters/local/intel'
import { useIntelStore } from '@/stores/intel'
import { HEAT_COLORS, HEAT_LABELS, HEAT_ICONS, HEAT_SOFT } from '@/utils/intel'
import type { HeatLevel } from '@/types/intel'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ (e: 'update:show', v: boolean): void }>()

const store = useIntelStore()
const newName = ref('')

// 内置赛道按热力分组展示，方便按风口/收缩/蓝海挑
const groups = computed(() => {
  const latest = store.latest
  const levelOf = (id: string): HeatLevel =>
    latest?.industries.find((i) => i.id === id)?.heatLevel ?? 'steady'
  const buckets: { level: HeatLevel; items: typeof INTEL_CATALOG }[] = [
    { level: 'hot', items: [] },
    { level: 'blueocean', items: [] },
    { level: 'cooling', items: [] },
    { level: 'steady', items: [] },
  ]
  for (const seed of INTEL_CATALOG) {
    buckets.find((b) => b.level === levelOf(seed.id))!.items.push(seed)
  }
  return buckets.filter((b) => b.items.length > 0)
})

function isChecked(id: string): boolean {
  return store.settings.monitored.includes(id)
}

function addCustom() {
  const name = newName.value.trim()
  if (!name) return
  if (name.length > 20) {
    newName.value = ''
    return
  }
  store.addCustomIndustry(name)
  newName.value = ''
}

function close() {
  emit('update:show', false)
}
</script>

<template>
  <NModal
    :show="props.show"
    @update:show="emit('update:show', $event)"
  >
    <NCard
      class="!w-[min(680px,94vw)]"
      :bordered="false"
      role="dialog"
      title="管理监控行业列表"
      :footer-props="{ style: 'display:none' }"
      @close="close"
      closable
    >
      <!-- 添加自定义赛道 -->
      <div class="flex gap-2 mb-4">
        <NInput
          v-model:value="newName"
          placeholder="添加自定义监控赛道，如：低空经济、宠物经济、法律科技…"
          maxlength="20"
          @keyup.enter="addCustom"
        />
        <NButton type="primary" :icon="AddOutline" @click="addCustom">添加</NButton>
      </div>

      <!-- 已添加的自定义赛道 -->
      <div v-if="store.settings.customIndustries.length" class="mb-4">
        <div class="text-xs font-semibold text-gray-500 mb-2">自定义赛道（AI 模式下刷新可生成在线情报）</div>
        <div class="flex flex-wrap gap-2">
          <NTag
            v-for="c in store.settings.customIndustries"
            :key="c.id"
            closable
            type="info"
            @close="store.removeCustomIndustry(c.id)"
          >
            {{ c.name }}
          </NTag>
        </div>
      </div>

      <NCheckbox
        :checked="store.settings.monitored.length === INTEL_CATALOG.length + store.settings.customIndustries.length"
        @update:checked="(v) => store.setMonitored(v
          ? [...INTEL_CATALOG.map((s) => s.id), ...store.settings.customIndustries.map((c) => c.id)]
          : [])"
      >
        全选/全不选
      </NCheckbox>

      <div class="mt-3 max-h-[46vh] overflow-y-auto pr-1 space-y-4">
        <div v-for="g in groups" :key="g.level">
          <div
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-2"
            :style="{ color: HEAT_COLORS[g.level], background: HEAT_SOFT[g.level] }"
          >
            <span>{{ HEAT_ICONS[g.level] }}</span>{{ HEAT_LABELS[g.level] }}
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <NCheckbox
              v-for="seed in g.items"
              :key="seed.id"
              :checked="isChecked(seed.id)"
              @update:checked="() => store.toggleIndustry(seed.id)"
            >
              {{ seed.name }}
            </NCheckbox>
          </div>
        </div>

        <!-- 未进入任何快照分组的自定义赛道也列出来 -->
        <div v-if="store.settings.customIndustries.length">
          <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-2 bg-slate-50 text-slate-500">
            自定义
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <NCheckbox
              v-for="c in store.settings.customIndustries"
              :key="c.id"
              :checked="isChecked(c.id)"
              @update:checked="() => store.toggleIndustry(c.id)"
            >
              {{ c.name }}
            </NCheckbox>
          </div>
        </div>
      </div>

      <div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span class="text-xs text-gray-400">
          已监控 {{ store.settings.monitored.length }} 个赛道
        </span>
        <NSpace>
          <NButton @click="close">完成</NButton>
          <NButton
            type="primary"
            :loading="store.loading"
            @click="store.refresh().then((ok) => { if (ok) close() })"
          >
            保存并立即刷新
          </NButton>
        </NSpace>
      </div>
    </NCard>
  </NModal>
</template>
