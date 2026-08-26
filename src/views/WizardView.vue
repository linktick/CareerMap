<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NSteps, NStep, NForm, NFormItem, NInput, NSelect, NRadioGroup,
  NRadio, NSwitch, NInputNumber, NDynamicTags, NButton, NSpace,
  NCard, NDescriptions, NDescriptionsItem, NCheckbox, NCascader, useMessage,
} from 'naive-ui'
import { useProfileStore } from '@/stores/profile'
import { useModeStore } from '@/stores/mode'
import { useSandboxStore } from '@/stores/sandbox'
import { CHINA_CITY_OPTIONS } from '@/utils/chinaCities'
import type { UserProfile } from '@/types/career'

const router = useRouter()
const profileStore = useProfileStore()
const modeStore = useModeStore()
const sandboxStore = useSandboxStore()
const message = useMessage()

const current = ref(0)
const form = ref<UserProfile>({ ...profileStore.profile })

const PREF_OPTIONS = [
  '高薪收入', '工作稳定', '低加班', '长期发展空间',
  '创造性', '社会影响力', '工作自由度',
]
const INDUSTRY_OPTIONS = [
  '互联网', '金融科技', 'AI/大数据', '游戏', '电商',
  '企业服务', '教育', '医疗健康', '硬件/半导体', '国企/银行',
]
const SCHOOL_TIER_OPTIONS: { label: string; value: NonNullable<UserProfile['schoolTier']> }[] = [
  { label: '985 院校', value: '985' },
  { label: '211 院校（非 985）', value: '211' },
  { label: '普通本科', value: 'regular' },
  { label: '专科 / 高职', value: 'junior' },
  { label: '硕士（985/211）', value: 'master' },
  { label: '博士', value: 'phd' },
  { label: '海外院校', value: 'overseas' },
  { label: '其他 / 不愿透露', value: 'other' },
]
const schoolTierLabel = (t: UserProfile['schoolTier']) =>
  SCHOOL_TIER_OPTIONS.find((o) => o.value === t)?.label || '—'

// check-strategy="child" 时 v-model 直接绑定叶子节点 value（城市短名），
// 选择器会自动按 "省 / 市" 路径展示

function updateField<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
  form.value[key] = value
  profileStore.update({ [key]: value } as Partial<UserProfile>)
}

function move(delta: number) {
  // 从基础信息页（第 1 步）点击“下一步”时，校验必填项
  if (current.value === 0 && delta > 0) {
    if (!form.value.majorOrJob || !form.value.majorOrJob.trim()) {
      message.warning('请填写“所学专业 / 当前岗位”')
      return
    }
  }
  current.value = Math.max(0, Math.min(3, current.value + delta))
}

const identityLabel = computed(() => ({
  student: '在校生', fresh: '应届毕业生', '0_1y': '0~1年', '1_3y': '1~3年',
} as const)[form.value.identity])

const riskLabel = computed(() => ({
  conservative: '保守(追求稳定)', neutral: '中性(平衡)', aggressive: '激进(愿意冒险)',
} as const)[form.value.riskPreference])

async function submit() {
  if (!form.value.majorOrJob || !form.value.majorOrJob.trim()) {
    message.warning('请填写“所学专业 / 当前岗位”')
    current.value = 0
    return
  }
  profileStore.update(form.value)
  sandboxStore.reset()
  router.push('/sandbox')
  // 等路由切换后再发起推演
  setTimeout(() => sandboxStore.generateRoutes(), 100)
}
</script>

<template>
  <div class="max-w-[960px] mx-auto px-4 md:px-6 py-8 md:py-12">
    <h1 class="text-2xl font-bold text-gray-900 mb-2">填写你的信息</h1>
    <p class="text-sm text-gray-500 mb-8">
      当前模式：
      <span :class="modeStore.mode === 'ai' ? 'text-brand font-medium' : 'text-green-600 font-medium'">
        {{ modeStore.mode === 'ai' ? '在线 AI 推演' : '本地离线模拟器' }}
      </span>
    </p>

    <NCard :bordered="false" class="shadow-sm">
      <NSteps :current="current" class="mb-10">
        <NStep title="基础信息" />
        <NStep title="职业偏好" />
        <NStep title="综合信息" />
        <NStep title="确认提交" />
      </NSteps>

      <!-- Step 1 -->
      <div v-show="current === 0">
        <NForm label-placement="top">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NFormItem label="你的身份" required>
              <NRadioGroup :value="form.identity" @update:value="(v) => updateField('identity', v)">
                <NSpace vertical>
                  <NRadio value="student">在校生</NRadio>
                  <NRadio value="fresh">应届毕业生</NRadio>
                  <NRadio value="0_1y">0~1 年职场人</NRadio>
                  <NRadio value="1_3y">1~3 年职场人</NRadio>
                </NSpace>
              </NRadioGroup>
            </NFormItem>
            <NFormItem label="所在城市（先选省/直辖市，再选城市）" required>
              <NCascader
                :value="form.city"
                :options="CHINA_CITY_OPTIONS"
                check-strategy="child"
                filterable
                :clearable="false"
                placeholder="请选择省/自治区/直辖市，再选择城市"
                @update:value="(v: string) => updateField('city', v)"
              />
            </NFormItem>
            <NFormItem label="所学专业 / 当前岗位" required>
              <NInput
                :value="form.majorOrJob"
                placeholder="如：计算机科学 / 前端实习生 / 机械工程"
                @update:value="(v) => updateField('majorOrJob', v)"
              />
            </NFormItem>
            <NFormItem label="院校层次">
              <NSelect
                :value="form.schoolTier"
                :options="SCHOOL_TIER_OPTIONS"
                @update:value="(v) => updateField('schoolTier', v)"
              />
            </NFormItem>
            <NFormItem label="从业月数（在校生填 0）">
              <NInputNumber
                :value="form.yearsOfExperience"
                :min="0"
                :max="60"
                class="w-full"
                @update:value="(v) => updateField('yearsOfExperience', Number(v) || 0)"
              />
            </NFormItem>
            <NFormItem label="目标行业（可多选，不选则不限）">
              <NSelect
                multiple
                :value="form.targetIndustries"
                :options="INDUSTRY_OPTIONS.map(c => ({ label: c, value: c }))"
                @update:value="(v) => updateField('targetIndustries', v)"
              />
            </NFormItem>
            <NFormItem label="已具备技能（输入后回车）">
              <NDynamicTags
                :value="form.skills"
                @update:value="(v: string[]) => updateField('skills', v)"
              />
            </NFormItem>
          </div>
        </NForm>
      </div>

      <!-- Step 2 -->
      <div v-show="current === 1">
        <NForm label-placement="top">
          <NFormItem label="你最看重哪些？（已按优先级排序，可勾选后再调整顺序）">
            <div class="space-y-2 w-full">
              <div
                v-for="(opt, idx) in PREF_OPTIONS"
                :key="opt"
                class="flex items-center gap-3 p-3 rounded-lg border"
                :class="form.preferences.includes(opt) ? 'border-brand bg-blue-50/40' : 'border-gray-200'"
              >
                <NCheckbox
                  :checked="form.preferences.includes(opt)"
                  @update:checked="(checked) => {
                    if (checked) updateField('preferences', [...form.preferences, opt])
                    else updateField('preferences', form.preferences.filter(p => p !== opt))
                  }"
                />
                <span class="flex-1 text-sm">{{ opt }}</span>
                <NButton
                  size="tiny"
                  :disabled="!form.preferences.includes(opt) || form.preferences.indexOf(opt) === 0"
                  @click="() => {
                    const arr = [...form.preferences]
                    const i = arr.indexOf(opt); if (i <= 0) return
                    ;[arr[i-1], arr[i]] = [arr[i], arr[i-1]]
                    updateField('preferences', arr)
                  }"
                >↑</NButton>
                <NButton
                  size="tiny"
                  :disabled="!form.preferences.includes(opt) || form.preferences.indexOf(opt) === form.preferences.length - 1"
                  @click="() => {
                    const arr = [...form.preferences]
                    const i = arr.indexOf(opt); if (i === -1 || i === arr.length - 1) return
                    ;[arr[i+1], arr[i]] = [arr[i], arr[i+1]]
                    updateField('preferences', arr)
                  }"
                >↓</NButton>
              </div>
            </div>
          </NFormItem>
          <p class="text-xs text-gray-500 -mt-2">
            已选 {{ form.preferences.length }} 项，排在越前优先级越高
          </p>
        </NForm>
      </div>

      <!-- Step 3 -->
      <div v-show="current === 2">
        <NForm label-placement="top">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NFormItem label="是否接受异地工作">
              <NSelect
                :value="String(form.acceptRelocate)"
                :options="[
                  { label: '接受全国机会', value: 'true' },
                  { label: '仅接受一线城市', value: 'tier1' },
                  { label: '仅接受新一线', value: 'new_tier1' },
                  { label: '不接受异地', value: 'false' },
                ]"
                @update:value="(v: string) => updateField('acceptRelocate', v === 'true' ? true : v === 'false' ? false : v as 'tier1' | 'new_tier1')"
              />
            </NFormItem>
            <NFormItem label="能否接受高强度加班">
              <NSwitch
                :value="form.acceptOvertime"
                @update:value="(v) => updateField('acceptOvertime', v)"
              >
                <template #checked>可以接受</template>
                <template #unchecked>不接受</template>
              </NSwitch>
            </NFormItem>
            <NFormItem label="每周可接受最长加班时长（小时）">
              <NInputNumber
                :value="form.maxOvertimeHours"
                :min="0"
                :max="40"
                class="w-full"
                @update:value="(v) => updateField('maxOvertimeHours', Number(v) || 0)"
              />
            </NFormItem>
            <NFormItem label="最低可接受月薪（K）">
              <NInputNumber
                :value="form.minSalaryK"
                :min="0"
                :max="100"
                class="w-full"
                @update:value="(v) => updateField('minSalaryK', Number(v) || 0)"
              />
            </NFormItem>
            <NFormItem label="风险偏好">
              <NRadioGroup :value="form.riskPreference" @update:value="(v) => updateField('riskPreference', v)">
                <NSpace vertical>
                  <NRadio value="conservative">保守（追求稳定）</NRadio>
                  <NRadio value="neutral">中性（平衡风险与收益）</NRadio>
                  <NRadio value="aggressive">激进（愿意承担高风险换高回报）</NRadio>
                </NSpace>
              </NRadioGroup>
            </NFormItem>
          </div>
        </NForm>
      </div>

      <!-- Step 4 -->
      <div v-show="current === 3">
        <NDescriptions bordered :column="2" label-placement="left">
          <NDescriptionsItem label="身份">{{ identityLabel }}</NDescriptionsItem>
          <NDescriptionsItem label="城市">{{ form.city }}</NDescriptionsItem>
          <NDescriptionsItem label="专业/岗位" :span="2">{{ form.majorOrJob || '—' }}</NDescriptionsItem>
          <NDescriptionsItem label="院校层次">{{ schoolTierLabel(form.schoolTier) }}</NDescriptionsItem>
          <NDescriptionsItem label="从业月数">{{ form.yearsOfExperience }} 个月</NDescriptionsItem>
          <NDescriptionsItem label="目标行业">{{ form.targetIndustries.join('、') || '不限' }}</NDescriptionsItem>
          <NDescriptionsItem label="技能" :span="2">
            <span v-if="form.skills.length">{{ form.skills.join('、') }}</span>
            <span v-else class="text-gray-400">未填写</span>
          </NDescriptionsItem>
          <NDescriptionsItem label="职业偏好" :span="2">{{ form.preferences.join(' > ') || '默认' }}</NDescriptionsItem>
          <NDescriptionsItem label="异地">
            {{ form.acceptRelocate === true ? '接受全国' : form.acceptRelocate === 'tier1' ? '仅一线' : form.acceptRelocate === 'new_tier1' ? '仅新一线' : '不接受' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="加班">
            {{ form.acceptOvertime ? `可接受（${form.maxOvertimeHours}h/周）` : '不接受' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="最低月薪">{{ form.minSalaryK }}K</NDescriptionsItem>
          <NDescriptionsItem label="风险偏好">{{ riskLabel }}</NDescriptionsItem>
        </NDescriptions>
      </div>

      <div class="flex justify-between mt-10">
        <NButton @click="router.push('/')">取消</NButton>
        <NSpace>
          <NButton v-if="current > 0" @click="move(-1)">上一步</NButton>
          <NButton v-if="current < 3" type="primary" @click="move(1)">下一步</NButton>
          <NButton v-if="current === 3" type="primary" @click="submit">
            开始沙盘推演 →
          </NButton>
        </NSpace>
      </div>
    </NCard>
  </div>
</template>
