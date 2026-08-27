import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type {
  CycleDays,
  HeatLevel,
  IntelIndustry,
  IntelSettings,
  IntelSnapshot,
} from '@/types/intel'
import { useModeStore } from './mode'
import { localIntelAdapter, generateSnapshot, generateIndustry, seedHistory } from '@/adapters/local/intel'
import { aiIntelAdapter } from '@/adapters/aiIntel'
import {
  loadIntelSettings,
  saveIntelSettings,
  loadIntelSnapshots,
  saveIntelSnapshots,
} from '@/utils/storage'

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_SNAPSHOTS = 20

export interface HistoryPoint {
  date: string
  heat: number
  demand: number
  salaryMid: number
  source: string
}

export const useIntelStore = defineStore('intel', () => {
  const modeStore = useModeStore()

  const settings = ref<IntelSettings>(loadIntelSettings())
  const snapshots = ref<IntelSnapshot[]>(loadIntelSnapshots())
  const loading = ref(false)
  /** 最近一次刷新的错误/告警信息（AI 失败已兜底本地数据，或部分批次失败时用作文案提示） */
  const lastError = ref<string | null>(null)
  /** AI 分批并发采集进度：done/total 为批次计数 */
  const progress = ref<{ done: number; total: number } | null>(null)
  const selectedId = ref<string | null>(null)
  let timer: number | null = null
  /** 进行中的采集 Promise：自动采集与手动点击共享同一次请求，避免重复触发/互相忽略 */
  let inflight: Promise<boolean> | null = null

  // 同步 AI 配置（AppHeader 保存后端地址后立即生效）
  aiIntelAdapter.refreshConfig(modeStore.aiConfig)
  watch(
    () => modeStore.aiConfig,
    (cfg) => aiIntelAdapter.refreshConfig(cfg),
    { deep: true }
  )

  // 首次使用：用本地数据回填 7 期历史，趋势图开箱即有走势
  if (snapshots.value.length === 0) {
    snapshots.value = seedHistory(settings.value)
    persistSnapshots()
  }

  const latest = computed<IntelSnapshot | null>(
    () => snapshots.value[snapshots.value.length - 1] || null
  )
  const industries = computed<IntelIndustry[]>(() => {
    const list = latest.value?.industries ?? []
    // 以监控列表为准排序；刚加入监控、最新快照里还没有的赛道用本地引擎即时生成占位
    return settings.value.monitored.map((id) => {
      const found = list.find((ind) => ind.id === id)
      if (found) return found
      const placeholder = generateIndustry(
        settings.value,
        id,
        new Date(latest.value?.createdAt ?? Date.now())
      )
      placeholder.tags = ['待采集', ...placeholder.tags.filter((t) => t !== '待采集')]
      return placeholder
    })
  })
  const lastRefreshedAt = computed(() => latest.value?.createdAt ?? null)
  const source = computed(() => latest.value?.source ?? 'local')

  const byLevel = (level: HeatLevel) =>
    industries.value.filter((i) => i.heatLevel === level)
  const hotTracks = computed(() => byLevel('hot'))
  const coolingTracks = computed(() => byLevel('cooling'))
  const blueOceanTracks = computed(() => byLevel('blueocean'))
  const avgHeat = computed(() =>
    industries.value.length
      ? Math.round(industries.value.reduce((s, i) => s + i.heatScore, 0) / industries.value.length)
      : 0
  )

  const isDue = computed(() => {
    if (!lastRefreshedAt.value) return true
    const age = Date.now() - new Date(lastRefreshedAt.value).getTime()
    return age >= settings.value.cycleDays * DAY_MS
  })
  const nextRefreshAt = computed(() => {
    if (!lastRefreshedAt.value || !settings.value.autoRefresh) return null
    return new Date(new Date(lastRefreshedAt.value).getTime() + settings.value.cycleDays * DAY_MS)
  })

  function industryById(id: string | null): IntelIndustry | undefined {
    if (!id) return undefined
    return industries.value.find((i) => i.id === id)
  }

  function selectIndustry(id: string) {
    selectedId.value = id
  }

  /** 某赛道的全部历史点；旧快照中缺失（后来才加入监控）的赛道用本地数据补点 */
  function historyFor(id: string): HistoryPoint[] {
    return snapshots.value.map((snap) => {
      const ind = snap.industries.find((i) => i.id === id)
      if (ind) {
        return {
          date: snap.createdAt,
          heat: ind.heatScore,
          demand: ind.demandLevel,
          salaryMid: Math.round((ind.salaryMid[0] + ind.salaryMid[1]) / 2),
          source: snap.source,
        }
      }
      // 补点：该快照生成时此赛道尚未加入监控
      const filled = generateIndustry(settings.value, id, new Date(snap.createdAt))
      return {
        date: snap.createdAt,
        heat: filled.heatScore,
        demand: filled.demandLevel,
        salaryMid: Math.round((filled.salaryMid[0] + filled.salaryMid[1]) / 2),
        source: 'fill',
      }
    })
  }

  function persistSettings() {
    saveIntelSettings(settings.value)
  }
  function persistSnapshots() {
    saveIntelSnapshots(snapshots.value)
  }

  /**
   * 采集一次最新情报。
   * AI 模式下赛道分批并发请求（适配器内部），通过 progress 回报批次进度；
   * 单批失败由适配器用本地数据补全，整链失败才降级为本地模拟快照并保留错误提示，
   * 保证定时采集不中断、卡片永远有数据。
   * 并发调用（定时自动采集 + 手动点击）共享同一次进行中的请求。
   */
  function refresh(): Promise<boolean> {
    if (inflight) return inflight
    inflight = doRefresh().finally(() => {
      inflight = null
    })
    return inflight
  }

  async function doRefresh(): Promise<boolean> {
    if (settings.value.monitored.length === 0) {
      lastError.value = '监控列表为空，请先添加要监控的赛道'
      return false
    }
    loading.value = true
    lastError.value = null
    progress.value = null
    const usedAI = modeStore.mode === 'ai'
    let fatalMsg: string | null = null
    let failedBatches = 0
    try {
      let list: IntelIndustry[]
      try {
        const adapter = usedAI ? aiIntelAdapter : localIntelAdapter
        list = await adapter.fetchIndustries(settings.value, (done, total, failed) => {
          failedBatches = failed
          progress.value = { done, total }
        })
      } catch (e) {
        if (!usedAI) throw e
        // AI 整链失败 → 本地兜底，错误信息留给界面提示
        fatalMsg = `在线情报获取失败（${(e as Error).message}），已生成本地模拟快照`
        list = generateSnapshot(settings.value, new Date(), 'local').industries
      }

      // 部分批次失败：适配器已用本地模板补全对应赛道，给一条告警但数据源仍为 AI
      if (!fatalMsg && usedAI && failedBatches > 0) {
        lastError.value = `部分赛道在线采集失败（${failedBatches} 个批次），已用本地数据补全，可稍后重试`
      }

      const prev = latest.value
      list.forEach((ind) => {
        const p = prev?.industries.find((x) => x.id === ind.id)
        ind.heatDelta = p ? ind.heatScore - p.heatScore : 0
      })

      const snap: IntelSnapshot = {
        id: `snap_${Date.now()}`,
        createdAt: new Date().toISOString(),
        source: fatalMsg ? 'local' : modeStore.mode,
        cycleDays: settings.value.cycleDays,
        industries: list,
      }
      snapshots.value = [...snapshots.value, snap].slice(-MAX_SNAPSHOTS)
      persistSnapshots()
      if (!selectedId.value || !list.some((i) => i.id === selectedId.value)) {
        selectedId.value = list[0]?.id ?? null
      }
      if (fatalMsg) lastError.value = fatalMsg
      return true
    } finally {
      loading.value = false
      progress.value = null
    }
  }

  function setCycle(days: CycleDays) {
    settings.value.cycleDays = days
    persistSettings()
  }

  function setAutoRefresh(v: boolean) {
    settings.value.autoRefresh = v
    persistSettings()
  }

  function setMonitored(ids: string[]) {
    settings.value.monitored = ids
    persistSettings()
  }

  function toggleIndustry(id: string) {
    const i = settings.value.monitored.indexOf(id)
    if (i >= 0) settings.value.monitored.splice(i, 1)
    else settings.value.monitored.push(id)
    persistSettings()
  }

  function slugify(name: string): string {
    return 'custom:' + name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '')
  }

  /** 添加自定义赛道，返回其 id */
  function addCustomIndustry(name: string): string {
    const trimmed = name.trim()
    if (!trimmed) return ''
    const existed = settings.value.customIndustries.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (existed) {
      if (!settings.value.monitored.includes(existed.id)) {
        settings.value.monitored.push(existed.id)
        persistSettings()
      }
      return existed.id
    }
    const id = slugify(trimmed) || `custom:${Date.now()}`
    settings.value.customIndustries.push({ id, name: trimmed })
    if (!settings.value.monitored.includes(id)) settings.value.monitored.push(id)
    persistSettings()
    return id
  }

  function removeCustomIndustry(id: string) {
    settings.value.customIndustries = settings.value.customIndustries.filter((c) => c.id !== id)
    settings.value.monitored = settings.value.monitored.filter((m) => m !== id)
    persistSettings()
  }

  /** 定时调度：每 60 秒检查一次，到期且页面可见时自动采集 */
  function initScheduler() {
    if (timer !== null) return
    timer = window.setInterval(() => {
      if (!settings.value.autoRefresh || loading.value) return
      if (document.visibilityState !== 'visible') return
      if (isDue.value) void refresh()
    }, 60_000)
  }

  return {
    settings,
    snapshots,
    loading,
    lastError,
    progress,
    selectedId,
    latest,
    industries,
    source,
    lastRefreshedAt,
    isDue,
    nextRefreshAt,
    hotTracks,
    coolingTracks,
    blueOceanTracks,
    avgHeat,
    refresh,
    setCycle,
    setAutoRefresh,
    setMonitored,
    toggleIndustry,
    addCustomIndustry,
    removeCustomIndustry,
    industryById,
    selectIndustry,
    historyFor,
    initScheduler,
  }
})
