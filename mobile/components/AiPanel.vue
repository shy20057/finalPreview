<template>
  <view class="ai-panel-container">
    <view class="panel-header">
      <AppIcon name="i0a3152c6" :size="16" :colored="true" />
      <text class="panel-title">
        <text class="ai-name ai-name-1">上</text><text class="ai-name ai-name-2">上</text><text class="ai-name ai-name-3">帮</text>
        <text class="panel-title-text">题目解析</text>
      </text>
    </view>

    <!-- Question info -->
    <view v-if="question" class="ai-question-info">
      <view class="ai-question-meta">
        <text class="badge badge-accent">{{ question.type === 'single' ? '单选题' : question.type === 'multi' ? '多选题' : question.type === 'essay' ? '简答题' : '填空题' }}</text>
        <text class="text-muted text-xs">第 {{ question.id }} 题</text>
      </view>
      <text class="ai-question-text">{{ truncate(question.question, 60) }}</text>
    </view>

    <!-- Chat Content -->
    <scroll-view class="ai-chat" scroll-y :scroll-top="chatScrollTop" scroll-with-animation>
      <view v-if="!appStore.isAiConfigured()" class="ai-empty">
        <AppIcon name="ief8bc3a1" :size="28" class="text-muted" />
        <text class="text-muted text-sm">请先前往「设置」配置 上上帮 API</text>
        <view class="btn btn-sm btn-primary" @click="goSettings">去设置</view>
      </view>

      <view v-else-if="messages.length === 0 && !loading" class="ai-empty">
        <AppIcon name="i9f37e240" :size="28" class="text-muted" />
        <text class="text-muted text-sm">点击获取 上上帮 解析，或直接在下方提问</text>
        <view
          class="btn btn-sm btn-primary"
          :class="{ disabled: loading || !question }"
          @click="analyze"
        >
          <AppIcon name="i0a3152c6" :size="14" :colored="true" />
          获取 上上帮 解析
        </view>
      </view>

      <template v-else>
        <view
          v-for="(msg, index) in messages"
          :key="index"
          :class="['chat-message', msg.role === 'user' ? 'chat-user' : 'chat-assistant']"
        >
          <view class="chat-avatar">
            <AppIcon name="iafc757a7" :size="14" v-if="msg.role === 'assistant'" />
            <text v-else>我</text>
          </view>

          <!-- Structured analysis rendering -->
          <view v-if="msg.role === 'assistant' && msg.sections" class="chat-bubble analysis-bubble">
            <view
              v-for="(sec, idx) in msg.sections"
              :key="sec.key"
              class="analysis-section"
              :class="['section-' + sec.key, { 'is-open': sec._open }]"
              :style="{ animationDelay: (idx * 0.08) + 's' }"
            >
              <view class="section-header" @click="sec._open = !sec._open">
                <!-- Per-section SVG icon -->
                <view class="section-icon" :style="{ color: sec.color }">
                  <AppIcon name="if5749836" :size="16" v-if="sec.key === 'knowledge'" />
                  <AppIcon name="i75cb12d8" :size="16" v-else-if="sec.key === 'answer'" />
                  <AppIcon name="i2206bdb2" :size="16" v-else-if="sec.key === 'options'" />
                  <AppIcon name="i2689de80" :size="16" v-else-if="sec.key === 'extend'" />
                  <AppIcon name="ifc4acd79" :size="16" v-else />
                </view>
                <text class="section-title" :style="{ color: sec.color }">{{ sec.title }}</text>
                <view class="section-chevron" :class="{ open: sec._open }">
                  <AppIcon name="i453cb8c3" :size="12" />
                </view>
              </view>
              <ViewTransition name="collapse">
                <HtmlContent v-show="sec._open" class="section-body markdown-body" :html="renderMarkdown(sec.body)" />
              </ViewTransition>
            </view>
          </view>

          <!-- Plain chat message -->
          <HtmlContent v-else class="chat-bubble markdown-body" :html="renderMarkdown(msg.content)" />
        </view>

        <view v-if="loading" class="chat-message chat-assistant">
          <view class="chat-avatar ai-loading-avatar">
            <view class="ai-loading-spinner"></view>
          </view>
          <view class="chat-bubble chat-loading">
            <view class="ai-loading-skeleton">
              <view class="skeleton-line" style="width: 60%"></view>
              <view class="skeleton-line" style="width: 85%; margin-top: 6px"></view>
              <view class="skeleton-line" style="width: 45%; margin-top: 6px"></view>
              <view class="skeleton-line" style="width: 70%; margin-top: 12px"></view>
              <view class="skeleton-line" style="width: 90%; margin-top: 6px"></view>
            </view>
          </view>
        </view>
      </template>
    </scroll-view>

    <!-- Chat Input -->
    <view v-if="appStore.isAiConfigured()" class="ai-input-bar">
      <input
        ref="inputRef"
        v-model="chatInput"
        class="input ai-input"
        type="text"
        placeholder="向 上上帮 提问..."
        placeholder-class="input-placeholder"
        :disabled="loading"
        :class="{ disabled: loading }"
        confirm-type="send"
        @confirm="sendChat"
      />
      <view class="send-btn" :class="{ disabled: !chatInput.trim() || loading }" @click="sendChat">
        <AppIcon name="i7dadb077" :size="16" />
      </view>
    </view>
  </view>
</template>

<script setup>
const chatScrollTop = ref(0)
import { ref, watch, nextTick, getCurrentInstance } from 'vue'
import { useAppStore } from '../stores/app.js'
import { analyzeQuestion, chatWithAi } from '../utils/ai.js'
import { useRouter } from '../utils/router.js'

const props = defineProps({
  question: Object,
  userAnswer: [String, Array],
})

const appStore = useAppStore()
const router = useRouter()
const instance = getCurrentInstance()
const messages = ref([])
const chatInput = ref('')
const loading = ref(false)
const chatRef = ref(null)
const inputRef = ref(null)

// ─── Section metadata ────────────────────────────────────
const SECTION_META = {
  '核心知识点':  { key: 'knowledge', color: '#60a5fa' },
  '知识点':      { key: 'knowledge', color: '#60a5fa' },
  '答案解析':    { key: 'answer',    color: '#22c55e' },
  '选项分析':    { key: 'options',   color: '#f59e0b' },
  '拓展延伸':    { key: 'extend',    color: '#a78bfa' },
  '扩展延伸':    { key: 'extend',    color: '#a78bfa' },
  '总结':        { key: 'summary',   color: '#f43f5e' },
  '要点总结':    { key: 'summary',   color: '#f43f5e' },
}

// ─── Parse 上上帮 analysis into structured sections ─────────
function parseAnalysisSections(text) {
  const headingPattern = /^#{1,3}\s*(.+?)$/gm
  const headings = []
  let match
  while ((match = headingPattern.exec(text)) !== null) {
    headings.push({ title: match[1].trim().replace(/\*\*/g, ''), index: match.index, endIndex: match.index + match[0].length })
  }

  if (headings.length > 0) {
    const sections = []
    for (let i = 0; i < headings.length; i++) {
      const h = headings[i]
      const nextIndex = i + 1 < headings.length ? headings[i + 1].index : text.length
      const body = text.slice(h.endIndex, nextIndex).trim()
      const meta = SECTION_META[h.title]
      if (meta && body) {
        sections.push({ ...meta, body, title: h.title, _open: true })
      }
    }
    if (sections.length > 0) return sections
  }

  // Try bold headers: **核心知识点**：
  const boldPattern = /\*\*(核心知识点|知识点|答案解析|选项分析|拓展延伸|扩展延伸|总结|要点总结)\*\*[：:]/g
  const boldHeadings = []
  while ((match = boldPattern.exec(text)) !== null) {
    boldHeadings.push({ title: match[1].trim(), index: match.index, endIndex: match.index + match[0].length })
  }
  const boldPattern2 = /\*\*(核心知识点|知识点|答案解析|选项分析|拓展延伸|扩展延伸|总结|要点总结)\*\*/g
  while ((match = boldPattern2.exec(text)) !== null) {
    if (!boldHeadings.some(h => h.index === match.index)) {
      boldHeadings.push({ title: match[1].trim(), index: match.index, endIndex: match.index + match[0].length })
    }
  }
  if (boldHeadings.length > 0) {
    const sections = []
    for (let i = 0; i < boldHeadings.length; i++) {
      const h = boldHeadings[i]
      const nextIndex = i + 1 < boldHeadings.length ? boldHeadings[i + 1].index : text.length
      const body = text.slice(h.endIndex, nextIndex).trim()
      const meta = SECTION_META[h.title]
      if (meta && body) {
        sections.push({ ...meta, body, title: h.title, _open: true })
      }
    }
    if (sections.length > 0) return sections
  }

  return null
}

// ─── Markdown rendering ──────────────────────────────────
function renderMarkdown(text) {
  let html = text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/(<li>.*?<\/li>)\s*(?=<li>)/gs, '$1')
    .replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>')
    .replace(/\n/gim, '<br>')
  return html
}

// 原版：chatRef.value.scrollTop = chatRef.value.scrollHeight
// App 端没有 DOM，用 selector query 把 .ai-chat 滚到底。
function scrollToBottom() {
  nextTick(() => { chatScrollTop.value += 100000 })
}

// ─── Analyze – structured response ───────────────────────
async function analyze() {
  if (!props.question || !appStore.isAiConfigured() || loading.value) return
  loading.value = true
  try {
    const res = await analyzeQuestion(appStore.aiConfig, {
      type: props.question.type,
      question: props.question.question,
      options: props.question.options,
      answer: props.question.answer,
      blanks: props.question.blanks,
      userAnswer: props.userAnswer,
    })
    const sections = parseAnalysisSections(res)
    messages.value.push({
      role: 'assistant',
      content: res,
      sections: sections,
    })
  } catch (err) {
    messages.value.push({ role: 'assistant', content: `**解析失败**：${err.message}` })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

// ─── Chat ────────────────────────────────────────────────
async function sendChat() {
  const text = chatInput.value.trim()
  if (!text || loading.value || !props.question) return

  messages.value.push({ role: 'user', content: text })
  chatInput.value = ''
  loading.value = true
  scrollToBottom()

  try {
    const context = buildContext()
    const apiMessages = [
      { role: 'user', content: context },
      ...messages.value.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: text },
    ]
    const res = await chatWithAi(appStore.aiConfig, apiMessages)
    messages.value.push({ role: 'assistant', content: res })
  } catch (err) {
    messages.value.push({ role: 'assistant', content: `**错误**：${err.message}` })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

function buildContext() {
  let ctx = `当前题目：${props.question.question}\n`
  if ((props.question.type === 'single' || props.question.type === 'multi') && props.question.options) {
    ctx += '选项：\n'
    for (const opt of props.question.options) {
      ctx += `${opt.label}. ${opt.text}\n`
    }
    if (props.question.type === 'single') {
      ctx += `正确答案：${props.question.answer}\n`
    } else {
      ctx += `正确答案：${Array.isArray(props.question.answer) ? props.question.answer.join('、') : props.question.answer}\n`
    }
  } else if (props.question.type === 'fill') {
    ctx += `填空数：${props.question.blanks}，答案：${props.question.answer.join(' / ')}\n`
  } else if (props.question.type === 'essay') {
    ctx += `参考答案：${props.question.answer}\n`
  }
  if (props.userAnswer !== undefined && props.userAnswer !== null) {
    if (props.question.type === 'multi') {
      ctx += `我的答案：${Array.isArray(props.userAnswer) ? props.userAnswer.join('、') : props.userAnswer}\n`
    } else {
      ctx += `我的答案：${Array.isArray(props.userAnswer) ? props.userAnswer.join(' / ') : props.userAnswer}\n`
    }
  }
  ctx += '\n请基于以上题目信息回答我的问题。'
  return ctx
}

function goSettings() {
  router.push('/settings')
}

watch(() => props.question?.id, () => {
  messages.value = []
})

function truncate(str, len) {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}
</script>

<style scoped>
.ai-panel-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: calc(100vh - 140px);
  min-height: 400px;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--accent-primary);
  font-weight: 600;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.panel-title {
  display: inline-flex;
  align-items: center;
  gap: 0.05em;
}

.ai-name {
  display: inline-block;
}

.ai-name-1 {
  font-family: 'Ma Shan Zheng', cursive;
  color: #7347FF;
  font-size: 1.1em;
  line-height: 1;
}

.ai-name-2 {
  font-family: 'ZCOOL XiaoWei', serif;
  color: #00CFCA;
  font-size: 1em;
  line-height: 1;
}

.ai-name-3 {
  font-family: 'Noto Serif SC', serif;
  font-weight: 700;
  color: #00EBD2;
  font-size: 1em;
  line-height: 1;
}

.panel-title-text {
  font-family: var(--font-sans, system-ui, sans-serif);
  font-weight: 600;
  color: var(--text-primary);
  margin-left: 0.15em;
}

.ai-question-info {
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  padding: 0.5rem 0.625rem;
  flex-shrink: 0;
}

.ai-question-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.25rem;
}

.ai-question-text {
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0;
  font-size: 0.8rem;
}

/* Chat area */
.ai-chat {
  flex: 1;
  overflow-y: auto;
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  padding: 0.625rem;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ai-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 100%;
  text-align: center;
}

/* Chat messages */
.chat-message {
  display: flex;
  gap: 0.4rem;
  align-items: flex-start;
}

.chat-user {
  flex-direction: row-reverse;
}

.chat-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 0.65rem;
  font-weight: 600;
  margin-top: 2px;
}

.chat-assistant .chat-avatar {
  background: var(--accent-soft);
  color: var(--accent-primary);
}

.ai-loading-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-soft) !important;
}

.ai-loading-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid var(--accent-primary);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.chat-user .chat-avatar {
  background: var(--border-color);
  color: var(--text-secondary);
}

.chat-bubble {
  max-width: calc(100% - 32px);
  padding: 0.5rem 0.625rem;
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

.chat-assistant .chat-bubble {
  background: var(--bg-card);
  border-top-left-radius: 2px;
}

.chat-user .chat-bubble {
  background: var(--accent-soft);
  color: var(--accent-primary);
  border-top-right-radius: 2px;
}

/* ─── Structured analysis bubble ─────────────────────── */
.analysis-bubble {
  padding: 0 !important;
  background: transparent !important;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-width: 100% !important;
}

.analysis-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
  animation: sectionEnter 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.analysis-section:hover {
  border-color: rgba(255,255,255,0.12);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

@keyframes sectionEnter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Section header — clickable toggle */
.section-header {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.55rem;
  background: rgba(255,255,255,0.015);
  border-bottom: 1px solid transparent;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.section-header:hover {
  background: rgba(255,255,255,0.03);
}

.is-open > .section-header {
  border-bottom-color: var(--border-color);
}

/* Left color bar */
.section-knowledge { border-left: 3px solid #60a5fa; }
.section-answer    { border-left: 3px solid #22c55e; }
.section-options   { border-left: 3px solid #f59e0b; }
.section-extend    { border-left: 3px solid #a78bfa; }
.section-summary   { border-left: 3px solid #f43f5e; }

/* Section icon wrapper */
.section-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  opacity: 0.9;
  transition: opacity 0.2s ease;
}
.section-header:hover .section-icon {
  opacity: 1;
}

/* Section title */
.section-title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  flex: 1;
}

/* Chevron toggle */
.section-chevron {
  display: flex;
  align-items: center;
  color: var(--text-muted);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  flex-shrink: 0;
}
.section-chevron.open {
  transform: rotate(180deg);
}

/* ─── Collapse transition ─────────────────────────────── */
.collapse-enter-active {
  animation: collapseIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.collapse-leave-active {
  animation: collapseOut 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
@keyframes collapseIn {
  from {
    opacity: 0;
    max-height: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    max-height: 600px;
    transform: translateY(0);
  }
}
@keyframes collapseOut {
  from {
    opacity: 1;
    max-height: 600px;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    max-height: 0;
    transform: translateY(-4px);
  }
}

/* Summary section — special highlight */
.section-summary {
  border-color: rgba(244, 63, 94, 0.18) !important;
  background: linear-gradient(135deg, rgba(244,63,94,0.05) 0%, rgba(244,63,94,0.01) 60%);
}
.section-summary .section-header {
  background: rgba(244,63,94,0.05);
}
.section-summary .section-body {
  font-weight: 500;
}

/* Section body */
.section-body {
  padding: 0.45rem 0.6rem;
  overflow: hidden;
}

/* ─── Markdown inside sections ────────────────────────── */
.section-body :deep(h1),
.section-body :deep(h2),
.section-body :deep(h3) {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0.25rem 0 0.15rem;
  line-height: 1.3;
}

.section-body :deep(p) {
  margin: 0.1rem 0;
}

.section-body :deep(strong) {
  color: var(--text-primary);
}

.section-body :deep(code) {
  background: rgba(0,0,0,0.15);
  padding: 0.05rem 0.25rem;
  border-radius: 3px;
  font-size: 0.75em;
}

.section-body :deep(pre) {
  background: rgba(0,0,0,0.15);
  padding: 0.35rem;
  border-radius: var(--radius-sm);
  overflow-x: auto;
  margin: 0.2rem 0;
}

.section-body :deep(pre code) {
  background: none;
  padding: 0;
}

.section-body :deep(ul) {
  padding-left: 1rem;
  margin: 0.15rem 0;
}

.section-body :deep(li) {
  margin: 0.08rem 0;
}

.section-body :deep(br) {
  display: block;
  content: '';
  margin-bottom: 0.15rem;
}

/* ─── Plain chat bubble markdown ──────────────────────── */
.chat-bubble :deep(h1), .chat-bubble :deep(h2), .chat-bubble :deep(h3) {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0.4rem 0 0.2rem;
  line-height: 1.3;
}

.chat-bubble :deep(p) { margin: 0.15rem 0; }
.chat-bubble :deep(strong) { color: var(--text-primary); }

.chat-bubble :deep(code) {
  background: rgba(0,0,0,0.15);
  padding: 0.05rem 0.25rem;
  border-radius: 3px;
  font-size: 0.75em;
}

.chat-bubble :deep(pre) {
  background: rgba(0,0,0,0.15);
  padding: 0.4rem;
  border-radius: var(--radius-sm);
  overflow-x: auto;
  margin: 0.3rem 0;
}

.chat-bubble :deep(pre code) { background: none; padding: 0; }
.chat-bubble :deep(ul) { padding-left: 1rem; margin: 0.2rem 0; }
.chat-bubble :deep(li) { margin: 0.1rem 0; }

.chat-bubble :deep(br) {
  display: block;
  content: '';
  margin-bottom: 0.2rem;
}

/* ─── Loading state ───────────────────────────────────── */
.chat-loading {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.6rem 0.75rem;
}

.loading-text {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-right: 0.15rem;
}

.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: typing 1.4s infinite ease-in-out both;
}

.typing-dot:nth-child(1) { animation-delay: -0.32s; }
.typing-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* 上上帮 Loading Skeleton */
.ai-loading-skeleton {
  width: 100%;
  min-width: 200px;
}

.skeleton-line {
  height: 10px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--bg-card-hover) 25%,
    rgba(255,255,255,0.06) 50%,
    var(--bg-card-hover) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.6s infinite ease-in-out;
}

.skeleton-line:nth-child(2) { animation-delay: 0.1s; }
.skeleton-line:nth-child(3) { animation-delay: 0.2s; }
.skeleton-line:nth-child(4) { animation-delay: 0.15s; }
.skeleton-line:nth-child(5) { animation-delay: 0.25s; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Input bar */
.ai-input-bar {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}

.ai-input-bar .ai-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: 0.85rem;
  color: var(--text-primary);
  transition: border-color 0.15s ease;
}

.ai-input-bar .ai-input:focus-within {
  outline: none;
  border-color: var(--accent-primary);
}

.ai-input-bar .ai-input.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.send-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-primary);
  border: none;
  border-radius: var(--radius-md);
  color: #fff;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.15s ease;
  flex-shrink: 0;
}

.send-btn:hover:not(.disabled) {
  opacity: 0.9;
  transform: scale(1.05);
}

.send-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
