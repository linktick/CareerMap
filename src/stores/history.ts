import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CareerSandbox, HistoryRecord, UserProfile, AppMode } from '@/types/career'
import { loadHistory, saveHistory } from '@/utils/storage'
import { genId } from '@/utils/format'

export const useHistoryStore = defineStore('history', () => {
  const records = ref<HistoryRecord[]>(loadHistory())

  function addRecord(
    profile: UserProfile,
    sandbox: CareerSandbox,
    mode: AppMode
  ): string {
    const id = genId('rec')
    const record: HistoryRecord = {
      id,
      createdAt: new Date().toISOString(),
      mode,
      profile,
      sandbox,
    }
    records.value = [record, ...records.value]
    saveHistory(records.value)
    return id
  }

  function updateSelected(historyId: string, routeId: string) {
    const rec = records.value.find((r) => r.id === historyId)
    if (rec) {
      rec.selectedRouteId = routeId
      saveHistory(records.value)
    }
  }

  function deleteRecord(id: string) {
    records.value = records.value.filter((r) => r.id !== id)
    saveHistory(records.value)
  }

  function clearAll() {
    records.value = []
    saveHistory([])
  }

  function getById(id: string): HistoryRecord | undefined {
    return records.value.find((r) => r.id === id)
  }

  return { records, addRecord, updateSelected, deleteRecord, clearAll, getById }
})
