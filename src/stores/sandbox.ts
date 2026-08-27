import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  CareerSandbox,
  CareerRoute,
  GrowthPlan,
  UserProfile,
  CompareResult,
} from '@/types/career'
import type {
  MarketResearchReport,
  ResearchStepState,
  SandboxValidation,
} from '@/types/research'
import { useModeStore } from './mode'
import { useProfileStore } from './profile'
import { useHistoryStore } from './history'
import { __localInternals } from '@/adapters/local'

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'
export type ResearchState = 'idle' | 'running' | 'done' | 'error'

export const useSandboxStore = defineStore('sandbox', () => {
  const modeStore = useModeStore()
  const profileStore = useProfileStore()

  const sandbox = ref<CareerSandbox | null>(null)
  const loadingState = ref<LoadingState>('idle')
  const loadingMessage = ref('')
  const errorMessage = ref('')
  const selectedRouteId = ref<string | null>(null)
  const compareRouteIds = ref<string[]>([])
  const growthPlan = ref<GrowthPlan | null>(null)
  const growthLoading = ref(false)
  const growthError = ref('')
  const compareResult = ref<CompareResult | null>(null)
  const currentHistoryId = ref<string | null>(null)
  // 本地模式下在沙盘页直接调整画像参数时的即时重算状态
  const dynamicUpdating = ref(false)

  // ===== 链式市场调研 + 事实校验（推演完成后自动执行）=====
  const researchState = ref<ResearchState>('idle')
  const researchSteps = ref<ResearchStepState[]>([])
  const researchReport = ref<MarketResearchReport | null>(null)
  const researchError = ref('')
  const validationState = ref<ResearchState>('idle')
  const validation = ref<SandboxValidation | null>(null)

  const routes = computed<CareerRoute[]>(() => sandbox.value?.routes || [])
  const selectedRoute = computed<CareerRoute | null>(
    () => routes.value.find((r) => r.id === selectedRouteId.value) || routes.value[0] || null
  )

  function reset() {
    sandbox.value = null
    loadingState.value = 'idle'
    errorMessage.value = ''
    selectedRouteId.value = null
    compareRouteIds.value = []
    growthPlan.value = null
    growthError.value = ''
    compareResult.value = null
    currentHistoryId.value = null
    researchState.value = 'idle'
    researchSteps.value = []
    researchReport.value = null
    researchError.value = ''
    validationState.value = 'idle'
    validation.value = null
  }

  /**
   * 推演完成后自动执行：Agent 链式深度市场调研 → 沙盘事实校验。
   * 调研链路逐步骤回调进度；任一步骤失败由适配器内部兜底，
   * 整条链失败时 researchState 置 error（不影响已生成的沙盘）。
   */
  async function runResearchAndValidation() {
    if (!sandbox.value) return
    researchState.value = 'running'
    researchError.value = ''
    validationState.value = 'idle'
    validation.value = null
    researchSteps.value = []
    try {
      const report = await modeStore.adapter.runMarketResearch(
        {
          profile: profileStore.profile,
          sandbox: {
            routes: sandbox.value.routes,
            summary: sandbox.value.summary,
            horizon: sandbox.value.horizon ?? 3,
          },
        },
        (step) => {
          const idx = researchSteps.value.findIndex((s) => s.id === step.id)
          if (idx === -1) researchSteps.value.push(step)
          else researchSteps.value[idx] = step
        }
      )
      researchReport.value = report
      researchState.value = 'done'
      if (sandbox.value) sandbox.value.research = report

      // 调研完成后紧接事实校验
      validationState.value = 'running'
      try {
        const result = await modeStore.adapter.validateSandbox({
          profile: profileStore.profile,
          sandbox: {
            routes: sandbox.value.routes,
            summary: sandbox.value.summary,
            horizon: sandbox.value.horizon ?? 3,
          },
          research: report,
        })
        validation.value = result
        validationState.value = 'done'
        if (sandbox.value) sandbox.value.validation = result
      } catch (e: any) {
        validationState.value = 'error'
      }
    } catch (e: any) {
      researchError.value = e?.message || '市场调研失败'
      researchState.value = 'error'
    }
  }

  async function generateRoutes() {
    loadingState.value = 'loading'
    errorMessage.value = ''
    const isAI = modeStore.mode === 'ai'
    const steps = isAI
      ? [
          '正在连接 AI 推理引擎...',
          'AI 深度分析你的背景与偏好（推理模型耗时较长，最长可能等待 20 分钟，请耐心等待）...',
          'AI 正在推演多条职业分支与薪资走势...',
          '仍在思考中，模型正在权衡不同赛道的 trade-off...',
          '测算内卷风险、晋升瓶颈与转行难度...',
          '快要完成了，正在整理结构化结果...',
        ]
      : [
          '分析你的背景与偏好...',
          '正在通过本地岗位数据库生成职业分支...',
          profileStore.profile.deepMode ? '外推 8 年长周期薪资走势与内卷风险...' : '测算 3 年薪资与内卷风险...',
          '渲染沙盘图谱...',
        ]
    let i = 0
    loadingMessage.value = steps[0]
    // AI 模式每 6 秒切换一次提示（因为等待时间长），本地模式 600ms
    const interval = isAI ? 6000 : 600
    const timer = setInterval(() => {
      i = Math.min(i + 1, steps.length - 1)
      loadingMessage.value = steps[i]
    }, interval)

    try {
      const result = await modeStore.adapter.generateRoutes(profileStore.profile)
      result.generatedAt = new Date().toISOString()
      result.mode = modeStore.mode
      sandbox.value = result
      selectedRouteId.value = result.routes[0]?.id || null
      compareRouteIds.value = result.routes.slice(0, 3).map((r) => r.id)
      loadingState.value = 'success'
      // 保存到历史
      const historyStore = useHistoryStore()
      currentHistoryId.value = historyStore.addRecord(
        profileStore.profile,
        result,
        modeStore.mode
      )
      profileStore.clearDraft()
      // 推演完成后自动执行 Agent 链式市场调研 + 事实校验（后台运行，不阻塞沙盘浏览）
      void runResearchAndValidation()
    } catch (e: any) {
      errorMessage.value = e?.message || '推演失败'
      loadingState.value = 'error'
    } finally {
      clearInterval(timer)
    }
  }

  function selectRoute(id: string) {
    selectedRouteId.value = id
    if (currentHistoryId.value) {
      const historyStore = useHistoryStore()
      historyStore.updateSelected(currentHistoryId.value, id)
    }
  }

  function toggleCompare(id: string) {
    if (compareRouteIds.value.includes(id)) {
      compareRouteIds.value = compareRouteIds.value.filter((x) => x !== id)
    } else if (compareRouteIds.value.length < 5) {
      compareRouteIds.value = [...compareRouteIds.value, id]
    }
  }

  async function generateGrowthPlan(route?: CareerRoute): Promise<boolean> {
    const target = route || selectedRoute.value
    if (!target) return false
    growthLoading.value = true
    growthError.value = ''
    try {
      growthPlan.value = await modeStore.adapter.generateGrowthPlan({
        profile: profileStore.profile,
        route: target,
      })
      return true
    } catch (e: any) {
      growthError.value = e?.message || '生成成长方案失败'
      return false
    } finally {
      growthLoading.value = false
    }
  }

  async function runCompare() {
    if (compareRouteIds.value.length < 2) return
    const selectedRoutes = routes.value.filter((r) =>
      compareRouteIds.value.includes(r.id)
    )
    compareResult.value = await modeStore.adapter.compareRoutes({
      profile: profileStore.profile,
      routes: selectedRoutes,
    })
  }

  function loadFromHistory(profile: UserProfile, data: CareerSandbox, historyId: string) {
    profileStore.update(profile)
    sandbox.value = data
    selectedRouteId.value = data.routes[0]?.id || null
    compareRouteIds.value = data.routes.slice(0, 3).map((r) => r.id)
    loadingState.value = 'success'
    currentHistoryId.value = historyId
    // 历史记录中已附带调研/校验结果时直接恢复，不重复执行
    researchReport.value = data.research || null
    researchState.value = data.research ? 'done' : 'idle'
    researchSteps.value = data.research?.stepStatus || []
    validation.value = data.validation || null
    validationState.value = data.validation ? 'done' : 'idle'
  }

  /**
   * 本地模式下的动态推演：用户在沙盘页直接调整期望薪资、工作城市、
   * 加班/异地意愿等画像参数后，用本地规则引擎即时重算路线与薪资，
   * 不显示全量 loading、不写入历史记录。AI 模式调用方应禁用此入口。
   */
  function refreshLocalProfile(patch: Partial<UserProfile>) {
    if (modeStore.mode !== 'local') return
    const newProfile = { ...profileStore.profile, ...patch }
    profileStore.update(patch)
    dynamicUpdating.value = true
    try {
      // 同步调用纯函数版本，避免 1.5s 模拟延迟让交互迟滞
      const result = __localInternals.generateRoutes(newProfile)
      result.generatedAt = new Date().toISOString()
      result.mode = 'local'
      sandbox.value = result
      // 尽量保持当前选中路线；已不存在则回退到第一条
      const stillExists =
        selectedRouteId.value && result.routes.some((r) => r.id === selectedRouteId.value)
      selectedRouteId.value = stillExists
        ? selectedRouteId.value
        : result.routes[0]?.id || null
      compareRouteIds.value = result.routes.slice(0, 3).map((r) => r.id)
      // 参数变化后旧的成长方案/调研结论不再对应当前画像，清空以免误导
      growthPlan.value = null
      researchReport.value = null
      researchSteps.value = []
      researchState.value = 'idle'
      validation.value = null
      validationState.value = 'idle'
      result.research = null
      result.validation = null
      loadingState.value = 'success'
    } finally {
      dynamicUpdating.value = false
    }
  }

  return {
    sandbox,
    loadingState,
    loadingMessage,
    errorMessage,
    selectedRouteId,
    compareRouteIds,
    growthPlan,
    growthLoading,
    growthError,
    compareResult,
    dynamicUpdating,
    researchState,
    researchSteps,
    researchReport,
    researchError,
    validationState,
    validation,
    routes,
    selectedRoute,
    reset,
    generateRoutes,
    selectRoute,
    toggleCompare,
    generateGrowthPlan,
    runCompare,
    runResearchAndValidation,
    loadFromHistory,
    refreshLocalProfile,
  }
})
