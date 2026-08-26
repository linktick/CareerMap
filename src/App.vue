<script setup lang="ts">
import { NMessageProvider, NDialogProvider, NConfigProvider, zhCN, dateZhCN } from 'naive-ui'
import AppHeader from '@/components/AppHeader.vue'
</script>

<template>
  <NConfigProvider :locale="zhCN" :date-locale="dateZhCN">
    <NMessageProvider>
      <NDialogProvider>
        <div class="min-h-full flex flex-col bg-sky-50">
          <AppHeader />
          <main class="flex-1">
            <router-view v-slot="{ Component }">
              <transition name="fade" mode="out-in">
                <component :is="Component" />
              </transition>
            </router-view>
          </main>
          <footer class="text-center text-xs text-sky-700/60 py-6 border-t border-sky-100 bg-white/80 backdrop-blur">
            职途星图 CareerMap · 沙盘推演职业赛道，看清未来前行方向 ·
            数据仅供参考，不构成职业决策唯一依据
          </footer>
        </div>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
