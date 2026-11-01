<template>
  <view class="modal-overlay" @click="closeModal">
    <view class="modal animate-scaleIn" @click.stop>
      <!-- 头部 -->
      <view class="modal-header">
        <view class="header-title">
          <view class="header-icon">
            <AppIcon name="i17da90cc" :size="20" />
          </view>
          <view>
            <view class="modal-title">导入题库</view>
            <text class="header-subtitle">从 Markdown 文件导入，或用 AI 生成</text>
          </view>
        </view>
        <view class="close-btn" @click="closeModal" aria-label="关闭">
          <AppIcon name="ieba488ee" :size="18" />
        </view>
      </view>

      <!-- 步骤指示器 -->
      <view class="step-bar">
        <view
          v-for="(s, i) in steps"
          :key="i"
          class="step"
          :class="{ active: step === i + 1, done: step > i + 1 }"
        >
          <view class="step-num">
            <AppIcon :path="'M20 6L9 17l-5-5'" :size="14" v-if="step > i + 1" />
            <text v-else>{{ i + 1 }}</text>
          </view>
          <text class="step-label">{{ s }}</text>
          <view v-if="i < steps.length - 1" class="step-divider"></view>
        </view>
      </view>

      <!-- 主体：双栏 -->
      <view class="modal-body">
        <!-- 左栏：操作区 -->
        <view class="action-col">
          <!-- Step 1: 上传 -->
          <view v-if="step === 1" class="upload-step">
            <view
              class="upload-zone"
              :class="{ dragging: isDragging, error: hasError }"
              @click="pickFile"
            >
              <view class="upload-icon">
                <AppIcon name="ib57f0e77" :size="48" />
              </view>
              <view class="upload-text">拖拽 .md 文件到此处</view>
              <view class="upload-hint">或点击此处选择文件</view>
              <view class="upload-formats">
                <text class="format-chip">.md</text>
                <text class="format-chip">含 ```json 代码块</text>
              </view>
            </view>

            <view v-if="errorMessage" class="error-message animate-fadeIn">
              <AppIcon name="i0e4b50ef" :size="16" />
              <text>{{ errorMessage }}</text>
            </view>

            <!-- 没有文件？引导用户看右栏 -->
            <view class="no-file-hint">
              <AppIcon name="i2f64d701" :size="14" />
              <text>没有 .md 文件？查看右侧"AI 生成"流程</text>
            </view>
          </view>

          <!-- Step 2: 预览 -->
          <view v-else-if="step === 2" class="preview-step">
            <view class="preview-header">
              <view class="preview-title">{{ previewBank?.name }}</view>
              <text class="preview-subject">{{ previewBank?.subject || '未分类' }}</text>
            </view>

            <view class="stats-grid">
              <view class="stat-card">
                <view class="stat-value">{{ previewBank?.questions?.length || 0 }}</view>
                <view class="stat-label">总题数</view>
              </view>
              <view class="stat-card">
                <view class="stat-value">{{ singleCount }}</view>
                <view class="stat-label">单选题</view>
              </view>
              <view class="stat-card">
                <view class="stat-value">{{ multiCount }}</view>
                <view class="stat-label">多选题</view>
              </view>
              <view class="stat-card">
                <view class="stat-value">{{ fillCount }}</view>
                <view class="stat-label">填空题</view>
              </view>
              <view class="stat-card">
                <view class="stat-value">{{ essayCount }}</view>
                <view class="stat-label">简答题</view>
              </view>
              <view class="stat-card stat-total-score">
                <view class="stat-value">{{ totalScore }}</view>
                <view class="stat-label">总分</view>
              </view>
            </view>

            <!-- 题目预览（前 3 题） -->
            <view class="questions-preview">
              <view class="preview-section-label">
                <AppIcon name="i7ea45c6f" :size="14" />题目预览（前 3 题）
              </view>
              <view
                v-for="q in previewQuestions"
                :key="q.id"
                class="question-card"
              >
                <view class="q-head">
                  <text class="q-type-badge" :class="`q-type-${q.type}`">{{ typeLabel(q.type) }}</text>
                  <text class="q-id">#{{ q.id }}</text>
                  <text class="q-score">{{ q.score }} 分</text>
                </view>
                <view class="q-text">{{ q.question }}</view>
              </view>
              <view v-if="(previewBank?.questions?.length || 0) > 3" class="more-questions">还有 {{ (previewBank?.questions?.length || 0) - 3 }} 题未显示，导入后查看完整内容</view>
            </view>
          </view>
        </view>

        <!-- 右栏：常驻引导 -->
        <view class="guide-col">
          <!-- AI 生成流程 -->
          <view class="guide-section">
            <view class="guide-section-header">
              <text class="guide-badge guide-badge-ai">推荐</text>
              <view class="guide-title">用 AI 生成题库</view>
            </view>
            <view class="ai-steps">
              <view class="ai-step">
                <text class="step-marker">1</text>
                <view>
                  <view class="ai-step-title">复制下方提示词</view>
                  <view class="ai-step-desc">粘贴到豆包 / DeepSeek / ChatGPT 等 AI 助手</view>
                </view>
              </view>
              <view class="ai-step">
                <text class="step-marker">2</text>
                <view>
                  <view class="ai-step-title">粘贴学习通原题</view>
                  <view class="ai-step-desc">把提示词末尾的"[粘贴学习通内容]"替换为题目文本</view>
                </view>
              </view>
              <view class="ai-step">
                <text class="step-marker">3</text>
                <view>
                  <view class="ai-step-title">保存为 .md 文件</view>
                  <view class="ai-step-desc">AI 输出的 Markdown 保存为 .md 后上传到左侧</view>
                </view>
              </view>
            </view>
            <view class="prompt-box">
              <view class="prompt-box-header">
                <text>AI 提示词</text>
                <view class="copy-btn" @click="copyPrompt">
                  <AppIcon name="i972898c3" :size="14" />{{ copied ? '已复制' : '复制' }}
                </view>
              </view>
              <view class="prompt-pre">{{ promptText }}</view>
            </view>
          </view>

          <!-- 格式说明 -->
          <view class="guide-section">
            <view class="guide-section-header">
              <text class="guide-badge guide-badge-fmt">格式</text>
              <view class="guide-title">Markdown 结构</view>
            </view>
            <view class="guide-desc">.md 文件需包含 <text class="code-inline">```json</text> 代码块：</view>
            <view class="code-block">
              <view class="code-pre">{{ codeSample }}</view>
            </view>
            <view class="type-tags">
              <text class="type-tag"><text class="code-inline">single</text> 单选</text>
              <text class="type-tag"><text class="code-inline">multi</text> 多选</text>
              <text class="type-tag"><text class="code-inline">fill</text> 填空</text>
              <text class="type-tag"><text class="code-inline">essay</text> 简答</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部按钮 -->
      <view class="modal-footer">
        <view class="btn btn-secondary" @click="closeModal">取消</view>
        <view class="footer-right">
          <view v-if="step === 2" class="btn btn-secondary" @click="step = 1">
            <AppIcon name="i12d56db6" :size="14" />上一步
          </view>
          <view v-if="step === 2" class="btn btn-primary" @click="importBank">
            <AppIcon name="i5ae87180" :size="14" />确认导入
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { parseMdBank } from '../utils/parser.js'
import { validateBank } from '../utils/validator.js'
import { pickTextFile } from '../utils/fs.js'

const emit = defineEmits(['close', 'import'])

const isDragging = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const previewBank = ref(null)
const currentFileName = ref('')
const step = ref(1)
const copied = ref(false)

const steps = ['上传文件', '预览确认']

const singleCount = computed(() => previewBank.value?.questions?.filter(q => q.type === 'single').length || 0)
const multiCount = computed(() => previewBank.value?.questions?.filter(q => q.type === 'multi').length || 0)
const fillCount = computed(() => previewBank.value?.questions?.filter(q => q.type === 'fill').length || 0)
const essayCount = computed(() => previewBank.value?.questions?.filter(q => q.type === 'essay').length || 0)
const totalScore = computed(() => {
  if (!previewBank.value?.questions) return 0
  return previewBank.value.questions.reduce((sum, q) => sum + (Number(q.score) || 0), 0).toFixed(1)
})
const previewQuestions = computed(() => (previewBank.value?.questions || []).slice(0, 3))

function typeLabel(t) {
  return { single: '单选', multi: '多选', fill: '填空', essay: '简答' }[t] || t
}

const promptText = `请将以下从学习通导出的题库文本整理为 Markdown 格式，其中题库数据以 \`\`\`json 的代码块形式包裹。

要求：
1. 外层 Markdown 包含标题（如"# 操作系统 - IO设备"）和简短介绍。
2. 代码块内的 JSON 数据必须包含 name（题库名称）、subject（学科）和 questions 数组。
3. 题目类型 type 为 "single"（单选题）、"multi"（多选题）、"fill"（填空题）或 "essay"（简答题）。
4. 单选题包含 options（[{label, text}] 数组）和 answer（"A"/"B"/"C"/"D"）。
5. 多选题包含 options（[{label, text}] 数组）和 answer（["A", "C"] 数组形式，至少两个正确答案）。
6. 填空题包含 blanks（填空数量）和 answer（答案数组）。
7. 简答题包含 answer（参考答案文本字符串）。
8. 单选题和多选题的 options 要去掉序号前缀（如"（1）"、"（2）"），只保留实际选项文本。
9. 填空题的 answer 数组必须使用标准答案，不要保留"我的答案"。
10. 如果题干中有图片引用（如"xxx图.png"），保留题干原样即可。
11. 分值统一用 score 字段（如 2.8、2.9、5.0）。

以下是原始文本：
[粘贴学习通内容]`

// 原版这段代码示例是 <pre> 的字面文本；App 端模板编译器会把纯文本节点里的换行
// 折叠成空格，所以改成脚本里的字符串，渲染时原样输出。
const codeSample = `\`\`\`json
{
  "name": "题库名称",
  "subject": "学科",
  "questions": [
    {
      "id": 1,
      "type": "single",
      "question": "题干",
      "options": [
        { "label": "A", "text": "选项A" },
        { "label": "B", "text": "选项B" }
      ],
      "answer": "A",
      "score": 2.8
    }
  ]
}
\`\`\``

function closeModal() {
  emit('close')
}

// 原版用 @click.self：App 端没有 DOM，这里按同样的语义判断事件源是否为遮罩本身。
function onOverlayClick(event) {
  if (event && event.target && event.currentTarget && event.target === event.currentTarget) {
    closeModal()
  }
}

// 原版：<input type="file"> + FileReader + 拖拽。
// App 端用 uni.chooseFile（见 utils/fs.js 的 pickTextFile）选择 .md 文件。
async function pickFile() {
  try {
    const { filename, content } = await pickTextFile()
    if (!/\.md$/i.test(filename)) {
      hasError.value = true
      errorMessage.value = '请上传 .md 格式的文件'
      return
    }
    await processFile({ name: filename, content })
  } catch (e) {
    // 用户取消选择时不报错
    if (String(e?.message || e?.errMsg || '').toLowerCase().includes('cancel')) return
    hasError.value = true
    errorMessage.value = e?.message || '文件读取失败'
  }
}

async function processFile(file) {
  hasError.value = false
  errorMessage.value = ''
  previewBank.value = null
  currentFileName.value = file.name

  try {
    const content = file.content
    const { success, data, error } = parseMdBank(content)
    if (!success) {
      hasError.value = true
      errorMessage.value = error || 'JSON 解析失败'
      return
    }
    const validation = validateBank(data)
    if (!validation.valid) {
      hasError.value = true
      errorMessage.value = validation.errors.join('; ')
      return
    }
    previewBank.value = data
    step.value = 2
  } catch (e) {
    hasError.value = true
    errorMessage.value = '文件读取失败'
  }
}

function importBank() {
  if (previewBank.value) {
    emit('import', {
      ...previewBank.value,
      sourceFile: currentFileName.value
    })
    closeModal()
  }
}

async function copyPrompt() {
  uni.setClipboardData({
    data: promptText,
    success: () => {
      copied.value = true
      setTimeout(() => { copied.value = false }, 1500)
    },
    fail: () => {
      hasError.value = true
      errorMessage.value = '复制失败'
    },
  })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  width: 100%;
  max-width: 880px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

/* ===== 头部 ===== */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.125rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: var(--accent-soft);
  color: var(--accent-primary);
}

.modal-header .modal-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
}

.header-subtitle {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 2px 0 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: var(--bg-surface-raised);
  color: var(--text-primary);
}

/* ===== 步骤指示器 ===== */
.step-bar {
  display: flex;
  align-items: center;
  padding: 0.875rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-surface);
}

.step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 0 0 auto;
}

.step-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.step.active .step-num {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: #fff;
}

.step.done .step-num {
  background: var(--accent-soft);
  border-color: var(--accent-border);
  color: var(--accent-primary);
}

.step-label {
  font-size: 0.82rem;
  color: var(--text-muted);
  font-weight: 500;
}

.step.active .step-label {
  color: var(--text-primary);
  font-weight: 600;
}

.step.done .step-label {
  color: var(--accent-primary);
}

.step-divider {
  width: 32px;
  height: 1px;
  background: var(--border-color);
  margin: 0 0.75rem;
}

/* ===== 主体双栏 ===== */
.modal-body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 340px;
  min-height: 0;
  overflow: hidden;
}

.action-col {
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.guide-col {
  padding: 1.25rem 1.25rem 1.25rem 0.5rem;
  border-left: 1px solid var(--border-color);
  background: var(--bg-surface);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ===== 上传区 ===== */
.upload-step {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.upload-zone {
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-lg);
  padding: 2.25rem 1.5rem;
  text-align: center;
  transition: all 0.2s ease;
  background: var(--bg-surface);
  cursor: pointer;
}

.upload-zone:hover {
  border-color: var(--accent-border);
  background: var(--accent-soft);
}

.upload-zone.dragging {
  border-color: var(--accent-primary);
  background: var(--accent-soft);
  transform: scale(1.01);
}

.upload-zone.error {
  border-color: var(--error);
}

.upload-icon {
  color: var(--text-muted);
  margin-bottom: 0.875rem;
}

.upload-zone:hover .upload-icon,
.upload-zone.dragging .upload-icon {
  color: var(--accent-primary);
}

.upload-text {
  font-size: 0.95rem;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.upload-hint {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.875rem;
}

.upload-formats {
  display: flex;
  gap: 0.375rem;
  justify-content: center;
}

.format-chip {
  font-size: 0.7rem;
  padding: 0.15rem 0.55rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  color: var(--text-muted);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--error-soft);
  border: 1px solid var(--error-border);
  border-radius: var(--radius-md);
  color: var(--error);
  font-size: 0.85rem;
}

.no-file-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  border-radius: var(--radius-md);
  background: var(--accent-soft);
  color: var(--accent-primary);
  font-size: 0.78rem;
}

/* ===== 预览 step ===== */
.preview-step {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.preview-header {
  display: flex;
  align-items: baseline;
  gap: 0.625rem;
  flex-wrap: wrap;
}

.preview-header .preview-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.preview-subject {
  font-size: 0.75rem;
  color: var(--accent-primary);
  background: var(--accent-soft);
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.stat-card {
  padding: 0.75rem 0.875rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  text-align: center;
}

.stat-total-score {
  background: var(--accent-soft);
  border-color: var(--accent-border);
}

.stat-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.1;
}

.stat-total-score .stat-value {
  color: var(--accent-primary);
}

.stat-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 0.2rem;
}

.questions-preview {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preview-section-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.25rem;
}

.question-card {
  padding: 0.625rem 0.875rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.q-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
  font-size: 0.72rem;
}

.q-type-badge {
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.68rem;
}

.q-type-single { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
.q-type-multi { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
.q-type-fill { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
.q-type-essay { background: rgba(34, 197, 94, 0.15); color: #4ade80; }

.q-id, .q-score {
  color: var(--text-muted);
}

.q-score {
  margin-left: auto;
}

.q-text {
  font-size: 0.82rem;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.more-questions {
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-muted);
  padding: 0.5rem;
  background: var(--bg-surface);
  border-radius: var(--radius-md);
}

/* ===== 右栏：引导 ===== */
.guide-section {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.guide-section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.guide-section-header .guide-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.guide-badge {
  font-size: 0.65rem;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.guide-badge-ai {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
}

.guide-badge-fmt {
  background: var(--accent-soft);
  color: var(--accent-primary);
}

.ai-steps {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.ai-steps .ai-step {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  font-size: 0.78rem;
}

.ai-steps .ai-step-title {
  color: var(--text-primary);
  font-weight: 600;
  display: block;
  margin-bottom: 0.1rem;
}

.ai-steps .ai-step-desc {
  color: var(--text-muted);
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.4;
}

.step-marker {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--accent-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
}

.prompt-box {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.prompt-box-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0.625rem;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.72rem;
  color: var(--text-muted);
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.55rem;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-sm);
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--accent-primary);
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.copy-btn:hover {
  background: var(--accent-primary);
  color: #fff;
}

.prompt-pre {
  margin: 0;
  padding: 0.625rem;
  font-size: 0.68rem;
  color: var(--text-secondary);
  white-space: pre-wrap;
  max-height: 140px;
  overflow-y: auto;
  line-height: 1.5;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.guide-desc {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0;
}

.guide-desc .code-inline {
  background: var(--bg-card);
  padding: 0.05em 0.35em;
  border-radius: 3px;
  font-size: 0.78em;
  color: var(--accent-primary);
}

.code-block {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 0.625rem;
  overflow-x: auto;
}

.code-block .code-pre {
  margin: 0;
  font-size: 0.68rem;
  color: var(--text-secondary);
  white-space: pre;
  line-height: 1.5;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.type-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.type-tag {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  color: var(--text-muted);
}

.type-tag .code-inline {
  color: var(--accent-primary);
  font-weight: 600;
}

/* ===== 底部按钮 ===== */
.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.625rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
}

.footer-right {
  display: flex;
  gap: 0.5rem;
}

.modal-footer .btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

/* ===== 响应式 ===== */
@media (max-width: 720px) {
  .modal {
    max-width: 100%;
    max-height: 95vh;
  }
  .modal-body {
    grid-template-columns: 1fr;
  }
  .guide-col {
    border-left: none;
    border-top: 1px solid var(--border-color);
    padding: 1rem 1.25rem;
  }
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .step-divider {
    width: 16px;
    margin: 0 0.375rem;
  }
  .step-label {
    display: none;
  }
}
</style>
