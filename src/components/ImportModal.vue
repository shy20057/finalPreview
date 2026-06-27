<template>
  <div class="modal-overlay" @click.self="closeModal">
    <div class="modal card animate-scaleIn">
      <div class="modal-header">
        <h2>导入题库</h2>
        <button class="close-btn" @click="closeModal">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <!-- Step 1: Upload -->
        <div v-if="step === 1" class="upload-step">
          <div
            class="upload-zone"
            :class="{ dragging: isDragging, error: hasError }"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
          >
            <input
              type="file"
              accept=".md"
              @change="handleFileSelect"
              ref="fileInput"
              style="display: none"
            />
            <div class="upload-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17,8 12,3 7,8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p class="upload-text">拖拽 .md 文件到此处</p>
            <p class="upload-hint">或点击选择文件</p>
            <button class="btn btn-secondary" @click="$refs.fileInput.click()">选择文件</button>
          </div>

          <div v-if="errorMessage" class="error-message animate-fadeIn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
            <span>{{ errorMessage }}</span>
          </div>
        </div>

        <!-- Step 2: Preview -->
        <div v-else-if="step === 2" class="preview-step">
          <div class="preview-info">
            <div class="info-item">
              <span class="info-label">题库名称</span>
              <span class="info-value">{{ previewBank.name }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">学科</span>
              <span class="info-value">{{ previewBank.subject || '未分类' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">题目数量</span>
              <span class="info-value">{{ previewBank.questions?.length || 0 }} 题</span>
            </div>
            <div class="info-item">
              <span class="info-label">单选题</span>
              <span class="info-value">{{ singleCount }} 题</span>
            </div>
            <div class="info-item">
              <span class="info-label">多选题</span>
              <span class="info-value">{{ multiCount }} 题</span>
            </div>
            <div class="info-item">
              <span class="info-label">填空题</span>
              <span class="info-value">{{ fillCount }} 题</span>
            </div>
            <div class="info-item">
              <span class="info-label">简答题</span>
              <span class="info-value">{{ essayCount }} 题</span>
            </div>
          </div>
        </div>

        <!-- Help toggle -->
        <details class="help-details">
          <summary>格式说明与 AI 提示词</summary>
          <div class="help-content">
            <p class="text-sm text-secondary">上传的 Markdown 文档需包含一个 <code>```json</code> 代码块：</p>
            <div class="code-block">
<pre>```json
{
  "name": "题库名称",
  "subject": "学科",
  "questions": [
    {
      "id": 1,
      "type": "single",
      "question": "单选题题干",
      "options": [
        { "label": "A", "text": "选项A" },
        { "label": "B", "text": "选项B" }
      ],
      "answer": "A",
      "score": 2.8
    },
    {
      "id": 2,
      "type": "multi",
      "question": "多选题题干",
      "options": [
        { "label": "A", "text": "选项A" },
        { "label": "B", "text": "选项B" },
        { "label": "C", "text": "选项C" }
      ],
      "answer": ["A", "B"],
      "score": 3.0
    },
    {
      "id": 3,
      "type": "fill",
      "question": "填空题(__①__)",
      "blanks": 1,
      "answer": ["答案"],
      "score": 2.9
    },
    {
      "id": 4,
      "type": "essay",
      "question": "简答题题干",
      "answer": "参考答案文本，支持多行内容",
      "score": 5.0
    }
  ]
}
```</pre>
            </div>
            <div class="prompt-section">
              <p class="text-sm text-secondary">将以下内容发送给 AI，让它帮你整理题库：</p>
              <div class="prompt-box">
                <pre>{{ promptText }}</pre>
                <button class="copy-btn" @click="copyPrompt">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  复制
                </button>
              </div>
            </div>
          </div>
        </details>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="closeModal">取消</button>
        <button
          v-if="step === 1"
          class="btn btn-primary"
          disabled
        >下一步</button>
        <template v-else>
          <button class="btn btn-secondary" @click="step = 1">上一步</button>
          <button class="btn btn-primary" @click="importBank">确认导入</button>
        </template>
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

const singleCount = computed(() => {
  if (!previewBank.value?.questions) return 0
  return previewBank.value.questions.filter(q => q.type === 'single').length
})

const multiCount = computed(() => {
  if (!previewBank.value?.questions) return 0
  return previewBank.value.questions.filter(q => q.type === 'multi').length
})

const fillCount = computed(() => {
  if (!previewBank.value?.questions) return 0
  return previewBank.value.questions.filter(q => q.type === 'fill').length
})

const essayCount = computed(() => {
  if (!previewBank.value?.questions) return 0
  return previewBank.value.questions.filter(q => q.type === 'essay').length
})

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

完整 JSON 格式示例（所有题型）：

\`\`\`json
{
  "name": "题库名称",
  "subject": "学科名称",
  "questions": [
    {
      "id": 1,
      "type": "single",
      "question": "单选题题干",
      "options": [
        { "label": "A", "text": "选项A文本" },
        { "label": "B", "text": "选项B文本" },
        { "label": "C", "text": "选项C文本" },
        { "label": "D", "text": "选项D文本" }
      ],
      "answer": "A",
      "score": 2.8
    },
    {
      "id": 2,
      "type": "multi",
      "question": "多选题题干",
      "options": [
        { "label": "A", "text": "选项A文本" },
        { "label": "B", "text": "选项B文本" },
        { "label": "C", "text": "选项C文本" },
        { "label": "D", "text": "选项D文本" }
      ],
      "answer": ["A", "B"],
      "score": 3.0
    },
    {
      "id": 3,
      "type": "fill",
      "question": "填空题题干，包含(  ①  )和(  ②  )",
      "blanks": 2,
      "answer": ["第一空答案", "第二空答案"],
      "score": 2.9
    },
    {
      "id": 4,
      "type": "essay",
      "question": "简答题题干",
      "answer": "参考答案文本，支持多行详细内容",
      "score": 5.0
    }
  ]
}
\`\`\`

输入格式示例（学习通原始文本）：

type="content"\n---\n1. (单选题)1.在一般大型计算机系统中...
A. （1）控制器可控制通道...
B. （2）通道控制控制器...
我的答案:B:（2）通道控制控制器...;正确答案:B:（2）通道控制控制器...;
2.8分AI讲解
26. (填空题)1. 对打印机的I/O控制方式常采用(  ①  )...
我的答案：
2.9分
(1)
中断驱动方式
(2)
DMA控制方式
正确答案：
(1) 中断驱动方式
(2) DMA控制方式
AI讲解

输出格式示例：

\`\`\`json
{
  "name": "操作系统-IO设备",
  "subject": "操作系统",
  "questions": [
    {
      "id": 1,
      "type": "single",
      "question": "在一般大型计算机系统中...",
      "options": [
        { "label": "A", "text": "控制器可控制通道，设备在通道控制下工作" },
        { "label": "B", "text": "通道控制控制器，设备在控制器控制下工作" }
      ],
      "answer": "B",
      "score": 2.8
    },
    {
      "id": 2,
      "type": "multi",
      "question": "以下哪些是进程调度算法？",
      "options": [
        { "label": "A", "text": "先来先服务" },
        { "label": "B", "text": "短作业优先" },
        { "label": "C", "text": "银行家算法" },
        { "label": "D", "text": "时间片轮转" }
      ],
      "answer": ["A", "B", "D"],
      "score": 3
    },
    {
      "id": 26,
      "type": "fill",
      "question": "对打印机的I/O控制方式常采用(  ①  )，对磁盘的I/O控制方式常采用(  ②  )。",
      "blanks": 2,
      "answer": ["中断驱动方式", "DMA控制方式"],
      "score": 2.9
    },
    {
      "id": 30,
      "type": "essay",
      "question": "请简述操作系统中进程调度的基本原理。",
      "answer": "进程调度是操作系统核心功能之一，其基本原理包括...",
      "score": 5.0
    }
  ]
}
\`\`\`

以下是原始文本：
[粘贴学习通内容]`

function closeModal() {
  emit('close')
}

async function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file) await processFile(file)
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

function copyPrompt() {
  navigator.clipboard.writeText(promptText)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  font-size: 1.1rem;
  font-weight: 600;
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

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.upload-zone {
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-lg);
  padding: 2rem;
  text-align: center;
  transition: all 0.2s ease;
  background: var(--bg-surface);
}

.upload-zone.dragging {
  border-color: var(--accent-primary);
  background: var(--accent-soft);
}

.upload-zone.error {
  border-color: var(--error);
}

.upload-icon {
  color: var(--text-muted);
  margin-bottom: 0.75rem;
}

.upload-text {
  font-size: 0.95rem;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.upload-hint {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
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

.preview-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.625rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.625rem;
  background: var(--bg-surface);
  border-radius: var(--radius-md);
}

.info-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.info-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.help-details {
  border-top: 1px solid var(--border-color);
  padding-top: 0.75rem;
}

.help-details summary {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.help-content {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.code-block {
  background: var(--bg-surface-raised);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  overflow-x: auto;
}

.code-block pre {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: pre-wrap;
}

.prompt-box {
  position: relative;
  background: var(--bg-surface-raised);
  border-radius: var(--radius-md);
  padding: 0.75rem;
}

.prompt-box pre {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: pre-wrap;
  max-height: 160px;
  overflow-y: auto;
}

.copy-btn {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.3rem 0.6rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.copy-btn:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.625rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border-color);
}
</style>
