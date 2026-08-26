<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard, NButton, NTag, NEmpty, NPopconfirm, NSpace, NTabPane, NTabs,
  NModal, NDescriptions, NDescriptionsItem, useMessage,
} from 'naive-ui'
import dayjs from 'dayjs'
import { useHistoryStore } from '@/stores/history'
import { useSandboxStore } from '@/stores/sandbox'
import { useProfileStore } from '@/stores/profile'
import type { HistoryRecord } from '@/types/career'

const router = useRouter()
const historyStore = useHistoryStore()
const sandboxStore = useSandboxStore()
const profileStore = useProfileStore()
const message = useMessage()

const filter = ref<'all' | 'ai' | 'local'>('all')

const filtered = computed(() =>
  filter.value === 'all'
    ? historyStore.records
    : historyStore.records.filter((r) => r.mode === filter.value)
)

function openRecord(rec: HistoryRecord) {
  sandboxStore.reset()
  sandboxStore.loadFromHistory(rec.profile, rec.sandbox, rec.id)
  router.push('/sandbox')
}

function rerun(rec: HistoryRecord) {
  profileStore.update(rec.profile)
  sandboxStore.reset()
  router.push('/wizard')
  message.info('已载入上次信息，可修改后重新推演')
}

function remove(id: string) {
  historyStore.deleteRecord(id)
  message.success('已删除')
}

function clearAll() {
  historyStore.clearAll()
  message.success('已清空全部记录')
}

function routeSummary(rec: HistoryRecord): string {
  return rec.sandbox.routes.map((r) => r.name).join(' / ')
}
</script>

<template>
  <div class="max-w-[1100px] mx-auto px-4 md:px-8 py-8 md:py-10">
    <div class="relative bg-gradient-to-r from-slate-800 to-gray-900 rounded-2xl p-6 md:p-8 mb-8 text-white shadow-lg overflow-hidden">
      <div class="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
      <div class="relative flex items-center justify-between flex-wrap gap-4">
        <div>
          <div class="text-xs font-semibold tracking-wider text-gray-400 uppercase mb-2">History</div>
          <h1 class="text-2xl md:text-3xl font-extrabold">历史推演记录</h1>
          <p class="text-sm md:text-base text-gray-300/80 mt-2">数据保存在浏览器本地，清除浏览器数据会丢失</p>
        </div>
        <NPopconfirm @positive-click="clearAll">
          <template #trigger>
            <NButton :disabled="!historyStore.records.length" type="error" ghost size="large">清空全部</NButton>
          </template>
          确定要清空所有历史记录吗？此操作不可恢复。
        </NPopconfirm>
      </div>
    </div>

    <NTabs v-model:value="filter" type="line" class="mb-4">
      <NTabPane name="all" :tab="`全部 (${historyStore.records.length})`" />
      <NTabPane name="ai" :tab="`AI 模式 (${historyStore.records.filter(r => r.mode === 'ai').length})`" />
      <NTabPane name="local" :tab="`本地模式 (${historyStore.records.filter(r => r.mode === 'local').length})`" />
    </NTabs>

    <div v-if="filtered.length === 0">
      <NEmpty description="还没有任何推演记录" class="py-20">
        <NButton type="primary" @click="router.push('/wizard')">开始第一次推演</NButton>
      </NEmpty>
    </div>

    <div v-else class="space-y-4">
      <NCard
        v-for="rec in filtered"
        :key="rec.id"
        :bordered="false"
        class="!rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
        size="small"
      >
        <div class="flex items-start justify-between gap-4 flex-wrap">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-3">
              <NTag
                size="small"
                :type="rec.mode === 'ai' ? 'info' : 'success'"
                :bordered="false"
                round
              >
                {{ rec.mode === 'ai' ? 'AI 推演' : '本地模拟器' }}
              </NTag>
              <span class="text-xs text-gray-500">{{ dayjs(rec.createdAt).format('YYYY-MM-DD HH:mm') }}</span>
            </div>
            <div class="text-base font-bold text-gray-900 mb-1.5">
              {{ rec.profile.majorOrJob || '未填写岗位' }}
              <span class="text-sm font-normal text-gray-400 mx-1.5">·</span>
              <span class="text-sm font-normal text-gray-500">{{ rec.profile.city }}</span>
            </div>
            <div class="text-sm text-gray-600 mb-1.5">
              <b class="text-brand">{{ rec.sandbox.routes.length }}</b> 条路线：{{ routeSummary(rec) }}
            </div>
            <div class="text-xs text-gray-400">
              偏好：{{ rec.profile.preferences.join('、') || '默认' }}
            </div>
          </div>
          <NSpace class="shrink-0">
            <NButton size="medium" type="primary" @click="openRecord(rec)">打开沙盘</NButton>
            <NButton size="medium" @click="rerun(rec)">再次推演</NButton>
            <NPopconfirm @positive-click="remove(rec.id)">
              <template #trigger>
                <NButton size="medium" type="error" ghost>删除</NButton>
              </template>
              确定删除该记录？
            </NPopconfirm>
          </NSpace>
        </div>
      </NCard>
    </div>
  </div>
</template>
