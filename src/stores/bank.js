import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { loadBuiltinBanks as fetchBuiltinBanks } from '../utils/parser.js'
import { loadBanks as fetchUserBanks, addBank as saveBank, deleteBank as removeBank, updateBank as modifyBank } from '../utils/storage.js'

export const useBankStore = defineStore('bank', () => {
  const builtinBanks = ref([])
  const userBanks = ref([])
  const currentBank = ref(null)
  const importModalOpen = ref(false)
  const selectedSubject = ref('全部')

  const allBanks = computed(() => {
    const banks = [...builtinBanks.value, ...userBanks.value]
    console.log('allBanks computed, total banks:', banks.length, 'userBanks:', userBanks.value.length)
    return banks
  })

  const currentBankId = computed(() => currentBank.value?.id || null)

  const subjects = computed(() => {
    const all = allBanks.value.map(b => b.subject).filter(Boolean)
    return ['全部', ...new Set(all)]
  })

  const banksBySubject = computed(() => {
    const map = {}
    for (const bank of allBanks.value) {
      const key = bank.subject || '未分类'
      if (!map[key]) map[key] = []
      map[key].push(bank)
    }
    return map
  })

  const filteredBanks = computed(() => {
    if (selectedSubject.value === '全部') return allBanks.value
    return allBanks.value.filter(b => (b.subject || '未分类') === selectedSubject.value)
  })

  function selectBank(bank) {
    currentBank.value = bank
  }

  function deselectBank() {
    currentBank.value = null
  }

  async function loadBuiltinBanks() {
    builtinBanks.value = await fetchBuiltinBanks()
  }

  async function loadUserBanks() {
    userBanks.value = await fetchUserBanks()
  }

  async function addBank(bankData) {
    const newBank = await saveBank(bankData)
    userBanks.value = await fetchUserBanks()
    return newBank
  }

  async function deleteBank(bankId) {
    // 内置题库不允许删除
    const builtin = builtinBanks.value.find(b => String(b.id) === String(bankId))
    if (builtin) {
      console.warn('内置题库不允许删除:', builtin.name)
      return
    }
    try {
      console.log('deleteBank called with:', bankId, 'current userBanks:', userBanks.value.map(b => b.id))
      await removeBank(bankId)
      console.log('removeBank completed')
      const freshBanks = await fetchUserBanks()
      console.log('fetchUserBanks returned:', freshBanks.length, 'banks')
      userBanks.value = freshBanks
      console.log('userBanks.value is now:', userBanks.value.length)
    } catch (e) {
      console.error('deleteBank error:', e)
    }
  }

  async function updateBank(bankId, data) {
    // 内置题库不允许修改
    const builtin = builtinBanks.value.find(b => String(b.id) === String(bankId))
    if (builtin) {
      console.warn('内置题库不允许修改:', builtin.name)
      return
    }
    await modifyBank(bankId, data)
    userBanks.value = await fetchUserBanks()
    if (String(currentBank.value?.id) === String(bankId)) {
      currentBank.value = userBanks.value.find(b => String(b.id) === String(bankId)) || currentBank.value
    }
  }

  function openImportModal() {
    importModalOpen.value = true
  }

  function closeImportModal() {
    importModalOpen.value = false
  }

  return {
    builtinBanks,
    userBanks,
    currentBank,
    allBanks,
    currentBankId,
    importModalOpen,
    selectedSubject,
    subjects,
    banksBySubject,
    filteredBanks,
    selectBank,
    deselectBank,
    loadBuiltinBanks,
    loadUserBanks,
    addBank,
    deleteBank,
    updateBank,
    openImportModal,
    closeImportModal,
  }
})
