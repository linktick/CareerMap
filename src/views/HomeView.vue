<script setup lang="ts">
import { useRouter } from 'vue-router'
import { NButton } from 'naive-ui'
import { useModeStore } from '@/stores/mode'

const router = useRouter()
const modeStore = useModeStore()

function goAIWizard() {
  if (modeStore.mode !== 'ai') modeStore.setMode('ai')
  router.push('/wizard')
}

function goLocalWizard() {
  if (modeStore.mode !== 'local') modeStore.setMode('local')
  router.push('/wizard')
}

const features = [
  { icon: '📊', title: '真实 JD 数据推演', desc: '基于全国主流招聘平台市场现状，拒绝空洞鸡汤', accent: 'from-blue-500 to-blue-600' },
  { icon: '🌿', title: '多路线沙盘分叉', desc: '一次生成 3~5 条职业分支，看清不同选择的代价', accent: 'from-emerald-500 to-teal-600' },
  { icon: '💰', title: '3 年薪资金曲线', desc: '量化每一年的薪资区间、瓶颈与晋升天花板', accent: 'from-amber-500 to-orange-600' },
  { icon: '🔥', title: '内卷风险预警', desc: '红/黄/绿三色标识赛道竞争激烈程度，提前避坑', accent: 'from-rose-500 to-red-600' },
  { icon: '🛠️', title: '12 个月清单', desc: '按月拆分学习/实践/求职/证书，可编辑可导出', accent: 'from-violet-500 to-purple-600' },
  { icon: '📴', title: '离线也能跑', desc: '本地模拟器内置岗位数据集，不联网也能完整使用', accent: 'from-slate-500 to-gray-600' },
]

const steps = [
  { n: '01', t: '填写个人信息', d: '向导式分步表单，1 分钟完成' },
  { n: '02', t: '生成职业沙盘', d: 'AI 或本地引擎推演出多条路线' },
  { n: '03', t: '对比权衡', d: '薪资、内卷、瓶颈多维度横向比较' },
  { n: '04', t: '拿到行动清单', d: '12 个月按月计划，导出 PDF 执行' },
]
</script>

<template>
  <div>
    <!-- Hero Section -->
    <section class="relative overflow-hidden bg-gradient-to-br from-sky-600 via-sky-500 to-cyan-400 text-white">
      <!-- Decorative background -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-white/15 blur-3xl" />
        <div class="absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full bg-cyan-200/20 blur-3xl" />
        <div class="absolute bottom-0 right-1/3 w-[300px] h-[300px] rounded-full bg-sky-200/15 blur-3xl" />
        <!-- Grid pattern -->
        <div
          class="absolute inset-0 opacity-[0.06]"
          style="background-image: linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px); background-size: 60px 60px;"
        />
      </div>

      <div class="relative max-w-[1200px] mx-auto px-6 py-20 md:py-32 text-center">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur border border-white/25 text-xs font-medium mb-8">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
          面向大学生与 0~3 年职场新人
        </div>

        <h1 class="text-4xl md:text-6xl font-extrabold leading-[1.15] tracking-tight">
          沙盘推演你的
          <span class="bg-gradient-to-r from-white via-cyan-100 to-sky-100 bg-clip-text text-transparent drop-shadow-sm">
            职业未来
          </span>
        </h1>

        <p class="mt-6 text-base md:text-xl text-sky-50/85 max-w-2xl mx-auto leading-relaxed">
          基于真实招聘市场，生成多条 3 年期职业分支沙盘，<br class="hidden md:block" />
          模拟薪资走势、发展瓶颈、必备技能与内卷风险，输出可落地的 12 个月成长清单。
        </p>

        <div class="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
          <NButton
            type="primary"
            size="large"
            round
            class="!px-10 !h-12 !text-base !font-semibold !bg-white !text-sky-600 !border-none !shadow-lg !shadow-sky-900/20 hover:!bg-sky-50 transition-colors"
            @click="router.push('/wizard')"
          >
            开始沙盘推演 →
          </NButton>
          <NButton
            size="large"
            round
            ghost
            class="!px-8 !h-12 !text-base !text-white/95 !border-white/40 hover:!bg-white/15 hover:!border-white/60 !transition"
            @click="router.push('/demo')"
          >
            查看示例沙盘
          </NButton>
        </div>

        <div class="mt-8 flex items-center justify-center gap-6 text-xs text-sky-50/70">
          <span class="flex items-center gap-1.5">
            <span class="w-1 h-1 rounded-full bg-cyan-200" />
            默认本地模拟器，开箱即用
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-1 h-1 rounded-full bg-cyan-200" />
            可切换 AI 大模型模式
          </span>
        </div>
      </div>

      <!-- Bottom wave -->
      <svg class="relative block w-full h-12 text-sky-50" viewBox="0 0 1440 48" preserveAspectRatio="none">
        <path fill="currentColor" d="M0,32 C360,48 720,0 1080,16 C1260,24 1380,32 1440,28 L1440,48 L0,48 Z" />
      </svg>
    </section>

    <!-- Features -->
    <section class="max-w-[1200px] mx-auto px-6 py-16 md:py-24">
      <div class="text-center mb-14">
        <div class="text-xs font-bold tracking-[0.2em] text-brand uppercase mb-3">Features</div>
        <h2 class="text-3xl md:text-4xl font-extrabold text-gray-900">为什么选择职途星图</h2>
        <p class="mt-3 text-gray-500 max-w-xl mx-auto">六大核心能力，帮你把"看不清的未来"变成"可量化的选择"</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="(f, i) in features"
          :key="f.title"
          class="group relative bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
        >
          <div
            class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity"
            :class="f.accent"
          />
          <div
            class="w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-2xl mb-5 shadow-md group-hover:scale-110 transition-transform"
            :class="f.accent"
          >
            {{ f.icon }}
          </div>
          <div class="text-[15px] font-bold text-gray-900 mb-2">{{ f.title }}</div>
          <div class="text-sm text-gray-500 leading-relaxed">{{ f.desc }}</div>
          <div class="absolute bottom-4 right-5 text-5xl font-black text-gray-50 group-hover:text-gray-100 transition-colors select-none">
            {{ String(i + 1).padStart(2, '0') }}
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="bg-white border-t border-b border-gray-100 py-16 md:py-24">
      <div class="max-w-[1200px] mx-auto px-6">
        <div class="text-center mb-14">
          <div class="text-xs font-bold tracking-[0.2em] text-brand uppercase mb-3">How it works</div>
          <h2 class="text-3xl md:text-4xl font-extrabold text-gray-900">四步看清你的职业未来</h2>
        </div>

        <div class="relative grid grid-cols-1 md:grid-cols-4 gap-8">
          <!-- Connecting line (desktop) -->
          <div class="hidden md:block absolute top-8 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-sky-300 to-transparent" />

          <div v-for="(step, i) in steps" :key="i" class="relative text-center">
            <div class="relative inline-flex items-center justify-center mb-5">
              <div class="absolute inset-0 rounded-full bg-sky-200 animate-ping opacity-30" />
              <div class="relative w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-sky-500/30">
                {{ step.n }}
              </div>
            </div>
            <div class="font-bold text-gray-900 mb-1.5 text-[15px]">{{ step.t }}</div>
            <div class="text-sm text-gray-500">{{ step.d }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Dual mode -->
    <section class="max-w-[1200px] mx-auto px-6 py-16 md:py-24">
      <div class="text-center mb-12">
        <div class="text-xs font-bold tracking-[0.2em] text-brand uppercase mb-3">Two modes</div>
        <h2 class="text-3xl md:text-4xl font-extrabold text-gray-900">双引擎模式，按需切换</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- AI mode -->
        <div class="group relative bg-gradient-to-br from-sky-500 to-cyan-500 rounded-2xl p-8 text-white shadow-xl shadow-sky-500/20 overflow-hidden hover:shadow-2xl hover:shadow-sky-500/30 transition-shadow">
          <div class="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition" />
          <div class="relative">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold mb-4 backdrop-blur">
              <span class="w-1.5 h-1.5 rounded-full bg-cyan-200" />
              大模型驱动
            </div>
            <h3 class="text-2xl font-bold mb-3">在线 AI 推演模式</h3>
            <p class="text-sky-50/90 text-sm leading-relaxed mb-6">
              调用你配置的大模型（DeepSeek、Kimi、通义千问等 OpenAI 兼容接口），
              根据你的具体背景动态生成个性化路线。通过后端代理转发请求，
              API Key 由后端保管，浏览器端不接触密钥。
            </p>
            <NButton
              size="medium"
              class="!bg-white !text-sky-600 !font-semibold !border-none hover:!bg-sky-50"
              @click="goAIWizard"
            >
              使用 AI 推演 →
            </NButton>
          </div>
        </div>

        <!-- Local mode -->
        <div class="group relative bg-gradient-to-br from-sky-700 to-sky-900 rounded-2xl p-8 text-white shadow-xl shadow-sky-700/20 overflow-hidden hover:shadow-2xl hover:shadow-sky-700/30 transition-shadow">
          <div class="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl group-hover:bg-white/10 transition" />
          <div class="relative">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-200 text-xs font-semibold mb-4 backdrop-blur">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              默认模式 · 离线可用
            </div>
            <h3 class="text-2xl font-bold mb-3">本地离线模拟器</h3>
            <p class="text-sky-100/80 text-sm leading-relaxed mb-6">
              纯前端内置岗位行业数据集 + 规则引擎，无需联网、不调用任何接口。
              适用于演示、本地预览、网络受限场景。返回数据结构与 AI 完全一致。
            </p>
            <NButton
              size="medium"
              class="!bg-white/15 !text-white !font-semibold !border-white/25 hover:!bg-white/25"
              @click="goLocalWizard"
            >
              立即本地推演 →
            </NButton>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
