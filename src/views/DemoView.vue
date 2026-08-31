<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NCard, NTag, NSpin } from 'naive-ui'
import { getDemoSandbox, getDemoGrowthPlan, DEMO_PROFILE } from '@/adapters/local/demo'
import { exportGrowthPDF, exportGrowthHTML } from '@/utils/exporter'

const router = useRouter()

// 示例数据由本地规则引擎基于真实岗位数据集同步生成，内容真实
const loading = ref(true)
const sandbox = computed(() => getDemoSandbox())
const plan = computed(() => getDemoGrowthPlan())
const topRoute = computed(() => sandbox.value.routes[0])

// 模拟短暂加载，让进入更自然
setTimeout(() => {
  loading.value = false
}, 300)

function exportPDF() {
  if (plan.value) exportGrowthPDF(plan.value)
}
function exportHTML() {
  if (plan.value) exportGrowthHTML(plan.value)
}

function startOwn() {
  router.push('/wizard')
}
</script>

<template>
  <div class="max-w-[900px] mx-auto px-4 md:px-6 py-8">
    <div class="flex items-center justify-between mb-6">
      <NButton @click="router.push('/')">← 返回首页</NButton>
      <div class="flex gap-2">
        <NButton @click="exportHTML">🌐 导出 HTML</NButton>
        <NButton type="primary" @click="exportPDF">📄 导出 PDF</NButton>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <NSpin size="large" description="正在加载示例沙盘..." />
    </div>

    <template v-else>
      <!-- 示例说明 Banner -->
      <div class="mb-6 rounded-2xl bg-gradient-to-br from-rose-50 via-white to-orange-50 border border-rose-100 p-5">
        <div class="flex items-center gap-2 text-xs font-bold tracking-wider text-rose-500 uppercase mb-2">
          <span>📌 示例沙盘</span>
          <NTag size="tiny" :bordered="false" type="info">案例演示</NTag>
        </div>
        <p class="text-sm text-gray-600 leading-relaxed">
          以下为一名<b class="text-gray-900">电子商务专业</b>在校生（坐标杭州，目标岗位：电商运营）生成的真实成长方案示例。
          数据来自本地岗位数据集与电商运营成长模板，展示了从运营助理到独立负责店铺单品运营的 12 个月路径。
          你也可以填写自己的信息，生成专属于你的职业沙盘。
        </p>
        <div class="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs text-gray-500">
          <span>专业：<b class="text-gray-700">{{ DEMO_PROFILE.majorOrJob }}</b></span>
          <span>城市：<b class="text-gray-700">{{ DEMO_PROFILE.city }}</b></span>
          <span>目标岗位：<b class="text-gray-700">{{ DEMO_PROFILE.targetIndustries.join('、') }}</b></span>
          <span>匹配路线：<b class="text-gray-700">{{ topRoute.name }}</b></span>
        </div>
      </div>

      <!-- Overview -->
      <NCard :bordered="false" class="shadow-sm mb-6 bg-gradient-to-br from-blue-50 to-white">
        <div class="text-xs text-brand font-medium mb-1">12 个月成长方案</div>
        <h1 class="text-2xl font-bold text-gray-900">{{ plan.routeName }}</h1>
        <p class="text-sm text-gray-600 mt-2">{{ plan.goalSummary }}</p>
        <div class="flex flex-wrap gap-4 mt-4 text-sm text-gray-700">
          <div>🎯 目标岗位：<b>{{ plan.targetRole }}</b></div>
          <div>💰 目标薪资：<b class="text-brand">{{ plan.targetSalary[0] }}-{{ plan.targetSalary[1] }}K</b></div>
          <div>📈 {{ (topRoute.salaryCurve.length - 1) >= 5 ? '8 年' : '3 年' }}薪资上限：<b>{{ topRoute.salaryCurve[topRoute.salaryCurve.length - 1].max }}K</b></div>
        </div>
      </NCard>

      <!-- Timeline -->
      <div class="relative pl-8">
        <div class="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" />
        <div v-for="m in plan.months" :key="m.month" class="relative mb-5">
          <div
            class="absolute -left-[22px] top-3 w-4 h-4 rounded-full border-2 border-white shadow"
            :class="m.month === 1 ? 'bg-brand' : 'bg-gray-300'"
          />
          <NCard :bordered="false" class="shadow-sm" size="small">
            <div class="flex items-center justify-between mb-3">
              <div>
                <span class="text-xs text-brand font-bold">M{{ m.month }}</span>
                <span class="ml-2 font-semibold text-gray-900">{{ m.theme }}</span>
              </div>
            </div>

            <!-- Learning Tasks -->
            <div v-if="m.learningTasks.length" class="mb-2">
              <div class="text-xs text-gray-500 mb-1.5">📚 学习任务</div>
              <div class="space-y-1">
                <div v-for="(t, idx) in m.learningTasks" :key="idx" class="flex items-start gap-2 text-sm">
                  <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                  <div class="flex-1 text-gray-700">{{ t.task || t }}</div>
                </div>
              </div>
            </div>

            <!-- Practice -->
            <div v-if="m.practiceProjects.length" class="mb-2">
              <div class="text-xs text-gray-500 mb-1.5">🛠 实践项目</div>
              <div class="text-sm text-gray-700 leading-relaxed">
                <span v-for="(p, i) in m.practiceProjects" :key="i">{{ p }}<span v-if="i < m.practiceProjects.length - 1">；</span></span>
              </div>
            </div>

            <!-- Job -->
            <div v-if="m.jobActions" class="mb-2">
              <div class="text-xs text-gray-500 mb-1.5">💼 求职动作</div>
              <div class="text-sm text-gray-700">{{ m.jobActions }}</div>
            </div>

            <!-- Cert -->
            <div v-if="m.certPrep" class="mb-2">
              <div class="text-xs text-gray-500 mb-1.5">📜 证书备考</div>
              <div class="text-sm text-gray-700">{{ m.certPrep }}</div>
            </div>

            <!-- Reminder -->
            <div class="bg-amber-50 border border-amber-100 rounded p-2 text-xs text-amber-800 leading-relaxed">
              <b>⚠️ 重点：</b>{{ m.keyReminder }}
            </div>
          </NCard>
        </div>
      </div>

      <!-- CTA -->
      <div class="mt-8 rounded-2xl bg-gradient-to-br from-sky-600 to-cyan-500 text-white p-8 text-center shadow-lg shadow-sky-500/20">
        <h2 class="text-xl font-bold mb-2">想生成你自己的职业沙盘？</h2>
        <p class="text-sm text-sky-50/90 mb-5">填写专业、城市与偏好，1 分钟获得专属于你的多路线推演与 12 个月成长方案。</p>
        <NButton
          size="large"
          round
          class="!px-10 !h-12 !text-base !font-semibold !bg-white !text-sky-600 !border-none !shadow-lg hover:!bg-sky-50"
          @click="startOwn"
        >
          开始我的沙盘推演 →
        </NButton>
      </div>

      <div class="text-center text-xs text-gray-400 mt-6">
        本示例为案例演示，薪资与成长路径基于市场公开 JD 数据生成，实际结果因人而异。
      </div>
    </template>
  </div>
</template>
