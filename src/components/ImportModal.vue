<template>
  <div class="modal-overlay" @click.self="closeModal">
    <div class="modal animate-scaleIn">
      <!-- 头部 -->
      <div class="modal-header">
        <div class="header-title">
          <div class="header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17,8 12,3 7,8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div>
            <h2>导入题库</h2>
            <p class="header-subtitle">从 Markdown 文件导入，或用 AI 生成</p>
          </div>
        </div>
        <button class="close-btn" @click="closeModal" aria-label="关闭">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- 步骤指示器 -->
      <div class="step-bar">
        <div
          v-for="(s, i) in steps"
          :key="i"
          class="step"
          :class="{ active: step === i + 1, done: step > i + 1 }"
        >
          <div class="step-num">
            <svg v-if="step > i + 1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
            <span v-else>{{ i + 1 }}</span>
          </div>
          <span class="step-label">{{ s }}</span>
          <div v-if="i < steps.length - 1" class="step-divider"></div>
        </div>
      </div>

      <!-- 主体：双栏 -->
      <div class="modal-body">
        <!-- 左栏：操作区 -->
        <div class="action-col">
          <!-- Step 1: 上传 -->
          <div v-if="step === 1" class="upload-step">
            <div
              class="upload-zone"
              :class="{ dragging: isDragging, error: hasError }"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleDrop"
              @click="$refs.fileInput.click()"
            >
              <input
                type="file"
                accept=".md"
                @change="handleFileSelect"
                ref="fileInput"
                style="display: none"
              />
              <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17,8 12,3 7,8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <p class="upload-text">拖拽 .md 文件到此处</p>
              <p class="upload-hint">或点击此处选择文件</p>
              <div class="upload-formats">
                <span class="format-chip">.md</span>
                <span class="format-chip">含 ```json 代码块</span>
              </div>
            </div>

            <div v-if="errorMessage" class="error-message animate-fadeIn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01"/>
              </svg>
              <span>{{ errorMessage }}</span>
            </div>

            <!-- 没有文件？引导用户看右栏 -->
            <div class="no-file-hint">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <span>没有 .md 文件？查看右侧"AI 生成"流程</span>
            </div>
          </div>

          <!-- Step 2: 预览 -->
          <div v-else-if="step === 2" class="preview-step">
            <div class="preview-header">
              <h3>{{ previewBank?.name }}</h3>
              <span class="preview-subject">{{ previewBank?.subject || '未分类' }}</span>
            </div>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">{{ previewBank?.questions?.length || 0 }}</div>
                <div class="stat-label">总题数</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ singleCount }}</div>
                <div class="stat-label">单选题</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ multiCount }}</div>
                <div class="stat-label">多选题</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ fillCount }}</div>
                <div class="stat-label">填空题</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ essayCount }}</div>
                <div class="stat-label">简答题</div>
              </div>
              <div class="stat-card stat-total-score">
                <div class="stat-value">{{ totalScore }}</div>
                <div class="stat-label">总分</div>
              </div>
            </div>

            <!-- 题目预览（前 3 题） -->
            <div class="questions-preview">
              <div class="preview-section-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
                题目预览（前 3 题）
              </div>
              <div
                v-for="q in previewQuestions"
                :key="q.id"
                class="question-card"
              >
                <div class="q-head">
                  <span class="q-type-badge" :class="`q-type-${q.type}`">{{ typeLabel(q.type) }}</span>
                  <span class="q-id">#{{ q.id }}</span>
                  <span class="q-score">{{ q.score }} 分</span>
                </div>
                <p class="q-text">{{ q.question }}</p>
              </div>
              <div v-if="(previewBank?.questions?.length || 0) > 3" class="more-questions">
                还有 {{ (previewBank?.questions?.length || 0) - 3 }} 题未显示，导入后查看完整内容
              </div>
            </div>
          </div>
        </div>

        <!-- 右栏：常驻引导 -->
        <aside class="guide-col">
          <!-- AI 生成流程 -->
          <div class="guide-section">
            <div class="guide-section-header">
              <span class="guide-badge guide-badge-ai">推荐</span>
              <h4>用 AI 生成题库</h4>
            </div>
            <ol class="ai-steps">
              <li>
                <span class="step-marker">1</span>
                <div>
                  <strong>复制下方提示词</strong>
                  <p>粘贴到豆包 / DeepSeek / ChatGPT 等 AI 助手</p>
                </div>
              </li>
              <li>
                <span class="step-marker">2</span>
                <div>
                  <strong>粘贴学习通原题</strong>
                  <p>把提示词末尾的"[粘贴学习通内容]"替换为题目文本</p>
                </div>
              </li>
              <li>
                <span class="step-marker">3</span>
                <div>
                  <strong>保存为 .md 文件</strong>
                  <p>AI 输出的 Markdown 保存为 .md 后上传到左侧</p>
                </div>
              </li>
            </ol>
            <div class="prompt-box">
              <div class="prompt-box-header">
                <span>AI 提示词</span>
                <button class="copy-btn" @click="copyPrompt">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  {{ copied ? '已复制' : '复制' }}
                </button>
              </div>
              <pre class="prompt-pre">{{ promptText }}</pre>
            </div>
          </div>

          <!-- 格式说明 -->
          <div class="guide-section">
            <div class="guide-section-header">
              <span class="guide-badge guide-badge-fmt">格式</span>
              <h4>Markdown 结构</h4>
            </div>
            <p class="guide-desc">.md 文件需包含 <code>```json</code> 代码块：</p>
            <div class="code-block">
<pre>```json
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
```</pre>
            </div>
            <div class="type-tags">
              <span class="type-tag"><code>single</code> 单选</span>
              <span class="type-tag"><code>multi</code> 多选</span>
              <span class="type-tag"><code>fill</code> 填空</span>
              <span class="type-tag"><code>essay</code> 简答</span>
            </div>
          </div>
        </aside>
      </div>

      <!-- 底部按钮 -->
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="closeModal">取消</button>
        <div class="footer-right">
          <button v-if="step === 2" class="btn btn-secondary" @click="step = 1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15,18 9,12 15,6"/>
            </svg>
            上一步
          </button>
          <button v-if="step === 2" class="btn btn-primary" @click="importBank">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
            确认导入
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { parseMdBank, readFileContent } from '../utils/parser.js'
import { validateBank } from '../utils/validator.js'

const emit = defineEmits(['close', 'import'])

const fileInput = ref(null)
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

function closeModal() {
  emit('close')
}

async function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file) await processFile(file)
  // 清空 input 允许重复选择同一文件
  event.target.value = ''
}

async function handleDrop(event) {
  isDragging.value = false
  const file = event.dataTransfer.files[0]
  if (file && file.name.endsWith('.md')) {
    await processFile(file)
  } else {
    hasError.value = true
    errorMessage.value = '请上传 .md 格式的文件'
  }
}

async function processFile(file) {
  hasError.value = false
  errorMessage.value = ''
  previewBank.value = null
  currentFileName.value = file.name

  try {
    const content = await readFileContent(file)
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
  try {
    await navigator.clipboard.writeText(promptText)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch {
    // 兜底
    const ta = document.createElement('textarea')
    ta.value = promptText
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  }
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

.modal-header h2 {
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

.preview-header h3 {
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

.guide-section-header h4 {
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

.ai-steps li {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  font-size: 0.78rem;
}

.ai-steps strong {
  color: var(--text-primary);
  font-weight: 600;
  display: block;
  margin-bottom: 0.1rem;
}

.ai-steps p {
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

.guide-desc code {
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

.code-block pre {
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

.type-tag code {
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
