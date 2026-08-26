<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  NButton, NPopover, NModal, NForm, NFormItem, NInput,
  NSpace, NIcon, NSelect, useMessage,
} from 'naive-ui'
import {
  SettingsOutline, HomeOutline, GridOutline, GitCompareOutline, TimeOutline,
} from '@vicons/ionicons5'
import { useModeStore } from '@/stores/mode'
import { useSandboxStore } from '@/stores/sandbox'
import { aiAdapter } from '@/adapters/ai'
import { MODEL_PRESETS } from '@/utils/storage'

const router = useRouter()
const route = useRoute()
const modeStore = useModeStore()
const sandbox = useSandboxStore()
const message = useMessage()

const isAI = computed(() => modeStore.mode === 'ai')
const showSettings = ref(false)
const tempApiBase = ref(modeStore.aiConfig.apiBase)
const tempModel = ref(modeStore.aiConfig.model)
const testing = ref(false)
const testResult = ref<{ ok: boolean; message: string } | null>(null)

const presetOptions = [
  ...MODEL_PRESETS.map((p) => ({
    label: p.note ? `${p.label}（${p.note}）` : p.label,
    value: p.model,
  })),
]

const navItems = [
  { name: 'home', label: '首页', path: '/', icon: HomeOutline },
  { name: 'sandbox', label: '沙盘', path: '/sandbox', icon: GridOutline },
  { name: 'compare', label: '对比', path: '/compare', icon: GitCompareOutline },
  { name: 'history', label: '历史记录', path: '/history', icon: TimeOutline },
]

watch(showSettings, (v) => {
  if (v) {
    tempApiBase.value = modeStore.aiConfig.apiBase
    tempModel.value = modeStore.aiConfig.model
    testResult.value = null
  }
})

function switchMode(target: 'ai' | 'local') {
  if (modeStore.mode === target) return
  if (sandbox.loadingState === 'loading') {
    message.warning('推演进行中，请稍候切换模式')
    return
  }
  modeStore.setMode(target)
  if (route.name === 'sandbox' && sandbox.sandbox) {
    sandbox.reset()
    message.info(`已切换到${target === 'ai' ? 'AI 推演' : '本地模拟'}模式，请重新发起推演`)
    router.push('/wizard')
  } else {
    message.success(`已切换到${target === 'ai' ? 'AI 推演' : '本地模拟'}模式`)
  }
}

function saveSettings() {
  modeStore.updateAIConfig({
    apiBase: tempApiBase.value.trim(),
    model: tempModel.value.trim(),
  })
  showSettings.value = false
  message.success('大模型配置已保存')
}

async function handleTest() {
  modeStore.updateAIConfig({
    apiBase: tempApiBase.value.trim(),
    model: tempModel.value.trim(),
  })
  testing.value = true
  testResult.value = null
  try {
    const result = await aiAdapter.testConnection()
    testResult.value = result
    if (result.ok) message.success(result.message)
    else message.error(result.message)
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <header
    class="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-sky-200/80 shadow-[0_1px_3px_rgba(14,165,233,0.08)]"
  >
    <div class="max-w-[1440px] mx-auto px-4 md:px-8 h-[68px] flex items-center justify-between gap-4">
      <!-- Logo -->
      <div class="flex items-center gap-3 cursor-pointer shrink-0" @click="router.push('/')">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 via-sky-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-sky-500/30">
          职
        </div>
        <div class="hidden sm:block">
          <div class="font-extrabold text-sky-900 leading-tight text-[17px] tracking-tight">职途星图</div>
          <div class="text-[11px] text-sky-400 leading-tight tracking-wider">CAREER MAP</div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex items-center gap-1 bg-sky-100/70 rounded-2xl p-1.5">
        <button
          v-for="item in navItems"
          :key="item.name"
          class="nav-item relative flex items-center gap-2 px-4 md:px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200"
          :class="route.name === item.name
            ? 'bg-white text-brand shadow-sm font-semibold'
            : 'text-sky-700/70 hover:text-sky-900 hover:bg-white/60'"
          @click="router.push(item.path)"
        >
          <n-icon :component="item.icon" class="text-[18px]" />
          <span class="hidden md:inline">{{ item.label }}</span>
          <span
            v-if="route.name === item.name"
            class="absolute left-1/2 -translate-x-1/2 bottom-[-2px] w-8 h-[3px] rounded-full bg-brand"
          />
        </button>
      </nav>

      <!-- Right controls -->
      <div class="flex items-center gap-3 shrink-0">
        <NPopover trigger="hover" placement="bottom">
          <template #trigger>
            <div class="mode-switch flex items-center rounded-full bg-sky-100 p-0.5 text-xs font-semibold select-none shadow-inner">
              <button
                class="mode-btn px-3.5 py-1.5 rounded-full transition-all duration-200"
                :class="isAI
                  ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-sm'
                  : 'text-sky-700/70 hover:text-sky-900'"
                @click="switchMode('ai')"
              >
                AI 推演
              </button>
              <button
                class="mode-btn px-3.5 py-1.5 rounded-full transition-all duration-200"
                :class="!isAI
                  ? 'bg-gradient-to-r from-sky-700 to-sky-800 text-white shadow-sm'
                  : 'text-sky-700/70 hover:text-sky-900'"
                @click="switchMode('local')"
              >
                本地模拟
              </button>
            </div>
          </template>
          <div class="text-xs text-gray-600 max-w-[260px] leading-relaxed">
            <div><b class="text-brand">AI 推演</b>：调用你配置的大模型（DeepSeek、Kimi 等）动态生成职业路径，需要后端代理服务</div>
            <div class="mt-1.5"><b class="text-sky-800">本地模拟</b>：使用内置岗位数据集离线推演，无需联网和 Key</div>
          </div>
        </NPopover>

        <button
          class="w-9 h-9 rounded-full flex items-center justify-center text-sky-600/70 hover:text-brand hover:bg-sky-100 transition"
          title="AI 设置"
          @click="showSettings = true"
        >
          <n-icon :component="SettingsOutline" class="text-xl" />
        </button>
      </div>
    </div>
  </header>

  <NModal v-model:show="showSettings" preset="card" title="大模型接口配置" style="max-width: 560px">
    <NForm label-placement="top">
      <NFormItem label="后端代理服务地址">
        <NInput
          v-model:value="tempApiBase"
          clearable
          placeholder="http://localhost:8000"
        />
        <div class="text-xs text-gray-400 mt-1">
          本项目 FastAPI 代理服务地址；上游大模型的 API Key 与接口地址在后端 <code>.env</code>
          中配置，前端不接触密钥
        </div>
      </NFormItem>

      <NFormItem label="模型 ID（留空则使用后端默认模型）">
        <NSelect
          :value="tempModel"
          filterable
          tag
          clearable
          :options="presetOptions"
          placeholder="选择或输入模型 ID，如 deepseek-chat"
          @update:value="(v: string | null) => (tempModel = v ?? '')"
        />
        <div class="text-xs text-gray-400 mt-1">
          支持任意 OpenAI 兼容接口：豆包（doubao-seed-1-6-250615 等）、
          DeepSeek（deepseek-chat / deepseek-reasoner）、Kimi（moonshot-v1-32k）、
          通义千问（qwen-plus）等；具体可用模型由后端配置的厂商决定
        </div>
      </NFormItem>

      <div v-if="testResult" class="text-xs mb-2" :class="testResult.ok ? 'text-green-600' : 'text-red-500'">
        {{ testResult.ok ? '✓' : '✗' }} {{ testResult.message }}
      </div>

      <div class="text-xs text-gray-500 leading-relaxed">
        所有 AI 请求通过后端代理转发到你在 <code>.env</code> 中配置的大模型服务，
        API Key 由后端保管，避免在浏览器端暴露密钥或遭遇 CORS 跨域问题。
        切换 DeepSeek / Kimi / 通义千问等厂商时，只需修改后端 <code>LLM_BASE_URL</code>、
        <code>LLM_API_KEY</code>、<code>LLM_MODEL</code> 三项并重启，详见项目 README。
      </div>
    </NForm>
    <template #footer>
      <NSpace justify="space-between">
        <NButton :loading="testing" @click="handleTest">测试连接</NButton>
        <NSpace>
          <NButton @click="showSettings = false">取消</NButton>
          <NButton type="primary" @click="saveSettings">保存</NButton>
        </NSpace>
      </NSpace>
    </template>
  </NModal>
</template>
