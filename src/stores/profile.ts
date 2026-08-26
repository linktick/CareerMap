import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserProfile } from '@/types/career'
import { saveProfileDraft, loadProfileDraft, clearProfileDraft } from '@/utils/storage'

const defaultProfile: UserProfile = {
  identity: 'student',
  majorOrJob: '',
  city: '北京',
  schoolTier: 'regular',
  yearsOfExperience: 0,
  targetIndustries: [],
  preferences: ['高薪收入', '长期发展空间'],
  acceptRelocate: true,
  acceptOvertime: true,
  maxOvertimeHours: 10,
  minSalaryK: 8,
  riskPreference: 'neutral',
  skills: [],
}

export const useProfileStore = defineStore('profile', () => {
  // 合并默认值，兼容旧版本草稿中缺失的字段（如 schoolTier）
  const profile = ref<UserProfile>({ ...defaultProfile, ...(loadProfileDraft() || {}) })

  function update(p: Partial<UserProfile>) {
    profile.value = { ...profile.value, ...p }
    saveProfileDraft(profile.value)
  }

  function reset() {
    profile.value = { ...defaultProfile }
    clearProfileDraft()
  }

  function clearDraft() {
    clearProfileDraft()
  }

  return { profile, update, reset, clearDraft }
})
