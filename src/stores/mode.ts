import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppMode } from '@/types/career'
import { localAdapter } from '@/adapters/local'
import { aiAdapter } from '@/adapters/ai'
import type { CareerAdapter } from '@/types/career'
import { loadAIConfig, saveAIConfig, type AIConfig } from '@/utils/storage'

export const useModeStore = defineStore('mode', () => {
  const mode = ref<AppMode>('local')
  const aiConfig = ref<AIConfig>(loadAIConfig())

  const adapter = computed<CareerAdapter>(() =>
    mode.value === 'ai' ? aiAdapter : localAdapter
  )

  function toggleMode(): AppMode {
    mode.value = mode.value === 'ai' ? 'local' : 'ai'
    return mode.value
  }

  function setMode(m: AppMode) {
    mode.value = m
  }

  function updateAIConfig(cfg: Partial<AIConfig>) {
    aiConfig.value = { ...aiConfig.value, ...cfg }
    saveAIConfig(aiConfig.value)
    aiAdapter.refreshConfig(aiConfig.value)
  }

  return { mode, aiConfig, adapter, toggleMode, setMode, updateAIConfig }
})
