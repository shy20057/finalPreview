<template>
  <AppShell>
    <view class="settings-view">
      <text class="page-title">设置</text>

      <view class="settings-section card">
        <view class="section-h2">外观</view>
        <view class="setting-row">
          <view class="setting-info">
            <text class="setting-name">主题</text>
          </view>
          <picker
            mode="selector"
            :value="themeIndex"
            :range="themeOptions"
            range-key="label"
            @change="onThemeChange"
          >
            <view class="theme-select">{{ themeOptions[themeIndex].label }}</view>
          </picker>
        </view>
      </view>

      <view class="settings-section card">
        <view class="section-h2">AI 配置</view>
        <view class="text-muted text-sm" style="margin-bottom:1rem">配置 AI API 参数后，可在答题页面使用「AI 题目解析」功能。支持多个厂商，设为默认即生效。</view>

        <!-- 已保存的厂商列表 -->
        <view v-if="savedProviders.length > 0" class="provider-list">
          <text class="provider-label">已配置厂商：</text>
          <template v-for="p in savedProviders" :key="p.name">
            <view
              class="provider-chip"
              :class="{ active: editingProvider === p.name, default: p.isDefault }"
              @click="switchProvider(p.name)"
              @dblclick.stop="setAsDefault(p.name)"
              @longpress.stop="setAsDefault(p.name)"
            >
              {{ p.name }}
              <text v-if="p.isDefault" class="default-badge">默认</text>
            </view>
          </template>
          <view class="provider-chip-add" @click="newProvider">+ 新增</view>
        </view>

        <view class="ai-presets">
          <text class="presets-label">快速填充：</text>
          <view class="preset-btn" @click="applyPreset('deepseek')">DeepSeek</view>
          <view class="preset-btn" @click="applyPreset('openai')">OpenAI</view>
          <view class="preset-btn" @click="applyPreset('siliconflow')">SiliconFlow</view>
          <view class="preset-btn" @click="applyPreset('minimax')">MiniMax</view>
          <view class="preset-btn" @click="applyPreset('bailian')">阿里百炼</view>
        </view>

        <view class="form-group">
          <text class="form-label">厂商名称</text>
          <input
            v-model="aiForm.name"
            type="text"
            placeholder="deepseek / openai / ..."
            placeholder-class="input-placeholder"
            class="form-input"
            :disabled="isEditingExisting"
          />
        </view>
        <view class="form-group">
          <text class="form-label">API Base URL</text>
          <input
            v-model="aiForm.baseUrl"
            type="text"
            placeholder="https://api.openai.com/v1"
            placeholder-class="input-placeholder"
            class="form-input"
          />
        </view>
        <view class="form-group">
          <text class="form-label">API Key</text>
          <input
            v-model="aiForm.apiKey"
            password
            placeholder="sk-..."
            placeholder-class="input-placeholder"
            class="form-input"
          />
        </view>
        <view class="form-group">
          <text class="form-label">模型名称</text>
          <input
            v-model="aiForm.model"
            type="text"
            placeholder="gpt-3.5-turbo"
            placeholder-class="input-placeholder"
            class="form-input"
          />
        </view>
        <view class="ai-actions">
          <view class="btn btn-primary" @click="saveAiConfig">保存配置</view>
          <view
            class="btn btn-secondary"
            :style="{ opacity: aiTesting ? 0.4 : 1 }"
            @click="!aiTesting && testAiConfig()"
          >
            {{ aiTesting ? '测试中...' : '测试连接' }}
          </view>
          <view v-if="isEditingExisting && !isCurrentDefault" class="btn btn-danger-outline" @click="removeProvider">删除</view>
        </view>
        <view v-if="aiTestResult" class="ai-test-result" :class="aiTestOk ? 'text-success' : 'text-error'">{{ aiTestResult }}</view>
      </view>

      <view class="settings-section card">
        <view class="section-h2">数据管理</view>
        <view class="setting-row">
          <view class="setting-info">
            <text class="setting-name">导出数据</text>
            <text class="text-muted text-sm">将所有题库和历史记录导出为 JSON 文件</text>
          </view>
          <view class="btn btn-secondary" @click="exportData">导出</view>
        </view>
        <view class="setting-row">
          <view class="setting-info">
            <text class="setting-name">导入数据</text>
            <text class="text-muted text-sm">从 JSON 文件恢复题库和历史记录</text>
          </view>
          <view class="btn btn-secondary" @click="triggerImport">导入</view>
        </view>
        <view class="setting-row">
          <view class="setting-info">
            <text class="setting-name">清空历史记录</text>
            <text class="text-muted text-sm">共 {{ historyStore.recordCount }} 条记录</text>
          </view>
          <view class="btn btn-danger" @click="clearHistory">清空</view>
        </view>
        <view class="setting-row">
          <view class="setting-info">
            <text class="setting-name">重置所有数据</text>
            <text class="text-muted text-sm">删除 IndexedDB 中所有数据，不可恢复</text>
          </view>
          <view class="btn btn-danger" @click="resetAll">重置</view>
        </view>
      </view>

      <view class="settings-section card">
        <view class="section-h2">连接设置</view>
        <view class="setting-row">
          <view class="setting-info"><text class="setting-name">后端地址</text><text class="text-muted text-sm">{{ getApiBase() }}</text></view>
          <view class="btn btn-secondary" @click="configureServer">修改</view>
        </view>
      </view>
      <view class="settings-section card">
        <view class="section-h2">关于</view>
        <view class="about">
          <view class="text-secondary text-sm">期末复习题库系统</view>
          <view class="text-muted text-xs">版本 2.1 · 基于 Vue 3 + Pinia + IndexedDB</view>
        </view>
      </view>
    </view>
  </AppShell>
</template>

<script setup>
import { getApiBase } from '../../utils/api.js'
import { configureServer } from '../../utils/serverAddress.js'
import { onPageReady } from '../../composables/usePageReady.js'

import { ref, onMounted, reactive, computed } from 'vue'
import { useAppStore } from '../../stores/app.js'
import { useHistoryStore } from '../../stores/history.js'
import { exportAll, importAll, clearHistory as dbClearHistory, saveBanks } from '../../utils/storage.js'
import { readFileContent } from '../../utils/parser.js'
import { writeTextFile, shareFile, pickTextFile } from '../../utils/fs.js'
import { analyzeQuestion } from '../../utils/ai.js'
import AppShell from '../../components/AppShell.vue'

const appStore = useAppStore()
const historyStore = useHistoryStore()

const editingProvider = ref('')

const aiForm = reactive({
  name: '',
  baseUrl: '',
  apiKey: '',
  model: '',
})

const aiTesting = ref(false)
const aiTestResult = ref('')
const aiTestOk = ref(false)

// 主题下拉项（原版 <select> 的两个 option）
const themeOptions = [
  { label: '暗蓝风格', value: 'dark-blue' },
  { label: '浅色主题', value: 'light' },
]

const themeIndex = computed(() => {
  const i = themeOptions.findIndex(o => o.value === appStore.theme)
  return i < 0 ? 0 : i
})

function onThemeChange(e) {
  const i = Number(e.detail.value)
  const opt = themeOptions[i]
  if (opt) appStore.setTheme(opt.value)
}

const presets = {
  deepseek: { name: 'deepseek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  openai: { name: 'openai', baseUrl: 'https://api.openai.com/v1', model: 'gpt-3.5-turbo' },
  siliconflow: { name: 'siliconflow', baseUrl: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3' },
  minimax: { name: 'minimax', baseUrl: 'https://api.minimax.chat/v1', model: 'abab6.5s-chat' },
  bailian: { name: 'bailian', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-turbo' },
}

const savedProviders = computed(() => {
  return appStore.allAiConfigs.map(c => ({ name: c.name, isDefault: !!c.isDefault }))
})

const isEditingExisting = computed(() => {
  return savedProviders.value.some(p => p.name === editingProvider.value)
})
const isCurrentDefault = computed(() => {
  const c = appStore.allAiConfigs.find(c => c.name === editingProvider.value)
  return c && c.isDefault
})

function applyPreset(name) {
  const p = presets[name]
  if (p) {
    aiForm.name = p.name
    aiForm.baseUrl = p.baseUrl
    aiForm.model = p.model
    editingProvider.value = p.name
  }
}

function switchProvider(name) {
  const config = appStore.allAiConfigs.find(c => c.name === name)
  if (config) {
    editingProvider.value = name
    aiForm.name = config.name
    aiForm.baseUrl = config.baseUrl
    aiForm.apiKey = config.apiKey
    aiForm.model = config.model
  }
}

function newProvider() {
  editingProvider.value = ''
  aiForm.name = ''
  aiForm.baseUrl = ''
  aiForm.apiKey = ''
  aiForm.model = ''
}

async function setAsDefault(name) {
  await appStore.setDefaultProvider(name)
}

async function saveAiConfig() {
  if (!aiForm.name.trim()) {
    aiTestResult.value = '请输入厂商名称'
    aiTestOk.value = false
    return
  }
  try {
    await appStore.updateAiConfig({
      name: aiForm.name.trim(),
      baseUrl: aiForm.baseUrl.trim(),
      apiKey: aiForm.apiKey.trim(),
      model: aiForm.model.trim(),
      isDefault: true,
    })
    editingProvider.value = aiForm.name.trim()
    aiTestResult.value = '配置已保存到服务端'
    aiTestOk.value = true
    setTimeout(() => { aiTestResult.value = '' }, 2000)
  } catch (err) {
    aiTestResult.value = `保存失败：${err.message}`
    aiTestOk.value = false
  }
}

async function removeProvider() {
  const res = await uni.showModal({
    title: '删除配置',
    content: `确定删除「${editingProvider.value}」的配置？`,
    showCancel: true,
  })
  if (!res.confirm) return
  await appStore.removeAiConfig(editingProvider.value)
  newProvider()
}

async function testAiConfig() {
  aiTesting.value = true
  aiTestResult.value = ''
  try {
    const config = {
      baseUrl: aiForm.baseUrl.trim(),
      apiKey: aiForm.apiKey.trim(),
      model: aiForm.model.trim(),
    }
    await analyzeQuestion(config, {
      type: 'single',
      question: '测试连接',
      options: [{ label: 'A', text: '测试' }],
      answer: 'A',
    })
    aiTestResult.value = '连接成功！'
    aiTestOk.value = true
  } catch (err) {
    aiTestResult.value = `连接失败：${err.message}`
    aiTestOk.value = false
  } finally {
    aiTesting.value = false
  }
}

onPageReady(async () => {
  try {
    await appStore.fetchAiConfigs()
  } catch {
    aiTestResult.value = 'AI 配置加载失败，请检查服务端连接'
    aiTestOk.value = false
  }
  const def = appStore.allAiConfigs.find(c => c.isDefault) || appStore.allAiConfigs[0]
  if (def) {
    editingProvider.value = def.name
    aiForm.name = def.name
    aiForm.baseUrl = def.baseUrl
    aiForm.apiKey = def.apiKey
    aiForm.model = def.model
  }
  historyStore.loadRecords()
})

async function exportData() {
  try {
    const data = await exportAll()
    const filename = `quiz-backup-${new Date().toISOString().slice(0, 10)}.json`
    const path = await writeTextFile(filename, JSON.stringify(data, null, 2))
    await shareFile(path, '导出数据')
  } catch (err) {
    uni.showModal({
      title: '导出失败',
      content: err?.message || '导出失败',
      showCancel: false,
    })
  }
}

async function triggerImport() {
  try {
    const file = await pickTextFile(['.json'])
    const data = JSON.parse(file.content)
    await importAll(data)
    uni.showModal({ title: '导入成功', content: '数据已恢复，页面即将刷新', showCancel: false,
      success: () => uni.reLaunch({ url: '/pages/settings/index' }) })
  } catch (error) {
    if (error.message === 'cancel') return
    uni.showModal({ title: '导入失败', content: error.message || '请检查文件格式', showCancel: false })
  }
}

async function clearHistory() {
  const res = await uni.showModal({
    title: '清空历史记录',
    content: '确定清空所有答题历史？',
    showCancel: true,
  })
  if (res.confirm) {
    await historyStore.clearHistory()
  }
}

async function resetAll() {
  const res = await uni.showModal({
    title: '重置所有数据',
    content: '确定重置所有数据？此操作将删除 IndexedDB 中所有题库和历史记录，不可恢复。',
    showCancel: true,
  })
  if (!res.confirm) return
  await dbClearHistory()
  await saveBanks([])
  // Clear legacy localStorage as well
  uni.removeStorageSync('quiz_banks')
  uni.removeStorageSync('quiz_history')
  uni.showModal({
    title: '已重置',
    content: '已重置，页面即将刷新',
    showCancel: false,
    success: () => uni.reLaunch({ url: '/pages/settings/index' }),
  })
}
</script>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 640px;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.settings-section {
  padding: 1.25rem;
}

.settings-section .section-h2 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 1rem;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
}

.setting-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
}

.setting-name {
  font-size: 0.95rem;
  font-weight: 500;
}

.about {
  text-align: center;
  padding: 0.5rem 0;
}

/* AI Config */
.ai-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
  align-items: center;
}

.presets-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-right: 0.25rem;
}

.provider-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
  align-items: center;
}

.provider-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-right: 0.25rem;
}

.provider-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.provider-chip:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.provider-chip.active {
  background: var(--accent-soft);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.provider-chip .default-badge {
  font-size: 0.65rem;
  background: var(--accent-primary);
  color: #fff;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
}

.provider-chip-add {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.6rem;
  background: transparent;
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.provider-chip-add:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.preset-btn {
  padding: 0.35rem 0.75rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-btn:hover {
  background: var(--accent-soft);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.form-group {
  margin-bottom: 0.875rem;
}

.form-group .form-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 0.35rem;
}

.form-input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: 0.9rem;
  color: var(--text-primary);
  transition: border-color 0.15s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.ai-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.ai-test-result {
  margin-top: 0.75rem;
  font-size: 0.85rem;
}

.theme-select {
  padding: 0.4rem 0.75rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: 0.875rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: border-color 0.15s ease;
  min-width: 140px;
}

.theme-select:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

@media (max-width: 768px) {
  .settings-view {
    padding-bottom: 72px;
    gap: 1rem;
  }

  .page-title {
    font-size: 1.1rem;
  }

  .settings-section {
    padding: 1rem;
  }

  .setting-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .setting-row .btn {
    width: 100%;
    justify-content: center;
  }

  .ai-presets {
    justify-content: flex-start;
  }

  .ai-actions {
    flex-direction: column;
  }

  .ai-actions .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
