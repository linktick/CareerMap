<script setup lang="ts">
// 简历图片上传 + 视觉解析组件
// 上传简历截图/照片 → 压缩为 base64 → 多模态大模型识别学历/技能/经历/短板 →
// 自动回填推演参数（学历层次、专业、从业月数、身份、技能），无需手动输入。
// 视觉解析仅在线 AI 模式可用（需后端配置视觉模型）；本地模式给出明确引导。
import { computed, ref } from 'vue'
import {
  NButton, NUpload, NTag, NSpace, NSpin, NAlert, useMessage,
  type UploadFileInfo,
} from 'naive-ui'
import { useProfileStore } from '@/stores/profile'
import { useModeStore } from '@/stores/mode'
import type { SchoolTier } from '@/types/career'
import type { ResumeParseResult } from '@/types/research'

const emit = defineEmits<{ (e: 'parsed', result: ResumeParseResult): void }>()

const profileStore = useProfileStore()
const modeStore = useModeStore()
const message = useMessage()

const parsing = ref(false)
const previewUrl = ref('')
const fileName = ref('')
const parsed = ref<ResumeParseResult | null>(profileStore.profile.resume || null)

const isAI = computed(() => modeStore.mode === 'ai')

const VALID_TIERS: SchoolTier[] = ['985', '211', 'regular', 'junior', 'master', 'phd', 'overseas', 'other']

/** 图片压缩：最长边限制 1600px，JPEG 0.82，控制 base64 体积在多模态请求可接受范围 */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1600
        let { width, height } = img
        if (width > MAX || height > MAX) {
          const scale = Math.min(MAX / width, MAX / height)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(reader.result as string)
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function handleChange(options: { fileList: UploadFileInfo[] }) {
  const file = options.fileList[options.fileList.length - 1]
  if (!file?.file) return
  const raw = file.file as File
  if (!raw.type.startsWith('image/')) {
    message.warning('请上传简历图片（jpg / png 等格式）')
    return
  }
  fileName.value = raw.name
  previewUrl.value = await compressImage(raw)
  parsed.value = null
}

async function parse() {
  if (!previewUrl.value) return
  if (!isAI.value) {
    message.warning('简历视觉解析需要在线 AI 模式，请先切换到「在线 AI 推演」（后端需配置视觉模型）')
    return
  }
  parsing.value = true
  try {
    const result = await modeStore.adapter.parseResume({
      imageDataUrl: previewUrl.value,
      fileName: fileName.value,
    })
    if (!result.skills.length && !result.workExperience.length && !result.rawSummary) {
      message.warning(result.weaknesses[0] || '未能从图片中识别到简历内容，请更换更清晰的图片')
      return
    }
    parsed.value = result
    applyToProfile(result)
    emit('parsed', result)
    message.success('简历解析完成，画像参数已自动填充')
  } catch (e: any) {
    message.error(e?.message || '简历解析失败，请稍后重试')
  } finally {
    parsing.value = false
  }
}

/** 把解析结果映射为画像参数并合并进 store */
function applyToProfile(r: ResumeParseResult) {
  const patch: Record<string, unknown> = { resume: r }

  // 院校层次
  if (r.education.tier) {
    const tier = String(r.education.tier).toLowerCase().trim()
    if (VALID_TIERS.includes(tier as SchoolTier)) patch.schoolTier = tier
  }
  // 专业/岗位：用户未填时用简历专业填充
  if (!profileStore.profile.majorOrJob) {
    if (r.education.major) patch.majorOrJob = r.education.major
    else if (r.workExperience[0]) patch.majorOrJob = r.workExperience[0]
  }
  // 从业月数
  if (typeof r.yearsOfExperience === 'number' && r.yearsOfExperience >= 0) {
    patch.yearsOfExperience = r.yearsOfExperience
  }
  // 身份
  if (r.identity) patch.identity = r.identity
  // 技能合并去重
  const existing = new Set(profileStore.profile.skills.map((s) => s.trim()))
  const merged = [...profileStore.profile.skills]
  for (const s of r.skills) {
    const skill = s.trim()
    if (skill && !existing.has(skill)) {
      existing.add(skill)
      merged.push(skill)
    }
  }
  patch.skills = merged.slice(0, 20)

  profileStore.update(patch as never)
}

function clearResume() {
  previewUrl.value = ''
  fileName.value = ''
  parsed.value = null
  profileStore.update({ resume: null } as never)
}
</script>

<template>
  <div class="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
    <div class="flex items-center justify-between gap-3 mb-3">
        <div>
          <div class="text-sm font-semibold text-gray-800">📄 上传简历，自动识别填写（可选）</div>
          <div class="text-xs text-gray-500 mt-0.5">
            支持简历截图/照片，自动识别学历、技能、工作/项目经历与短板，推演参数将自动适配
          </div>
        </div>
        <NTag v-if="parsed" type="success" size="small" :bordered="false">已解析</NTag>
      </div>

      <div v-if="!isAI" class="mb-3">
        <NAlert type="warning" :show-icon="true" class="!py-2">
          <span class="text-xs">视觉解析需在线 AI 模式（后端配置视觉模型，如 doubao-vision / qwen-vl）。当前为本地模拟器，可先手动填写。</span>
        </NAlert>
      </div>

      <div class="flex flex-col sm:flex-row gap-4">
        <div class="shrink-0">
          <NUpload
            :max="1"
            accept="image/*"
            :default-upload="false"
            :show-file-list="false"
            @change="handleChange"
          >
            <div
              class="w-40 h-48 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-white cursor-pointer hover:border-brand transition"
            >
              <img v-if="previewUrl" :src="previewUrl" class="w-full h-full object-contain" alt="简历预览" />
              <div v-else class="text-center text-gray-400 px-2">
                <div class="text-2xl mb-1">📷</div>
                <div class="text-xs">点击选择简历图片</div>
              </div>
            </div>
          </NUpload>
        </div>

        <div class="flex-1 min-w-0">
          <NSpin v-if="parsing" description="视觉模型正在识别简历内容…" class="w-full" />
          <template v-else-if="parsed">
            <div class="space-y-2 text-xs">
              <div v-if="parsed.education.school || parsed.education.degree" class="text-gray-700">
                🎓 {{ [parsed.education.degree, parsed.education.school, parsed.education.major].filter(Boolean).join(' · ') }}
              </div>
              <div v-if="parsed.workExperience.length" class="text-gray-600">
                <div class="font-medium text-gray-700 mb-0.5">工作经历</div>
                <ul class="list-disc pl-4 space-y-0.5">
                  <li v-for="(w, i) in parsed.workExperience.slice(0, 3)" :key="i" class="truncate">{{ w }}</li>
                </ul>
              </div>
              <div v-if="parsed.projects.length" class="text-gray-600">
                <div class="font-medium text-gray-700 mb-0.5">项目经验</div>
                <ul class="list-disc pl-4 space-y-0.5">
                  <li v-for="(p, i) in parsed.projects.slice(0, 2)" :key="i" class="truncate">{{ p }}</li>
                </ul>
              </div>
              <div v-if="parsed.skills.length">
                <div class="font-medium text-gray-700 mb-1">识别技能</div>
                <NSpace wrap :size="[4, 4]">
                  <NTag v-for="s in parsed.skills.slice(0, 10)" :key="s" size="small" type="info" :bordered="false">{{ s }}</NTag>
                </NSpace>
              </div>
              <div v-if="parsed.weaknesses.length" class="bg-red-50 border border-red-100 rounded-lg p-2">
                <div class="font-medium text-red-600 mb-0.5">⚠️ 识别出的短板</div>
                <ul class="list-disc pl-4 space-y-0.5 text-red-700">
                  <li v-for="(w, i) in parsed.weaknesses.slice(0, 4)" :key="i">{{ w }}</li>
                </ul>
              </div>
            </div>
          </template>
          <div v-else class="text-xs text-gray-400 leading-relaxed">
            识别结果将用于自动适配推演参数：院校层次、从业时长、技能标签与短板都会纳入路线推演，
            短板会在路线瓶颈与风险提示中闭环体现。简历图片仅在本次解析时发送给模型，不会被持久化存储。
          </div>
        </div>
      </div>

      <div class="flex gap-2 mt-3">
        <NButton
          size="small"
          type="primary"
          :disabled="!previewUrl || parsing"
          :loading="parsing"
          @click="parse"
        >
          {{ parsed ? '重新识别' : '开始视觉识别' }}
        </NButton>
        <NButton v-if="previewUrl" size="small" quaternary @click="clearResume">移除图片</NButton>
      </div>
  </div>
</template>
