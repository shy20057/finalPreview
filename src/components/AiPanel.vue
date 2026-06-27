<template>
  <div class="ai-panel-container">
    <div class="panel-header">
      <svg width="16" height="16" viewBox="0 0 1024 1024">
        <path d="M122.281 287v450L317.15 624.5v-225z" fill="#0423DB"/>
        <path d="M317.15 399.5v225L512 512z" fill="#1C54E4"/>
        <path d="M512 512L317.15 399.5l389.625-225.131L901.719 287z" fill="#AB9BFF"/>
        <path d="M317.15 399.5L122.281 287 512 62l194.775 112.369z" fill="#7347FF"/>
        <path d="M901.719 737L512 962 317.15 849.5l389.7-225z" fill="#00CFCA"/>
        <path d="M706.85 624.5L901.719 512v225z m-389.7 225L122.281 737 512 512l194.85 112.5z" fill="#00EBD2"/>
      </svg>
      <span class="panel-title">AI 题目解析</span>
    </div>

    <!-- Question info -->
    <div v-if="question" class="ai-question-info">
      <div class="ai-question-meta">
        <span class="badge badge-accent">{{ question.type === 'single' ? '单选题' : question.type === 'multi' ? '多选题' : question.type === 'essay' ? '简答题' : '填空题' }}</span>
        <span class="text-muted text-xs">第 {{ question.id }} 题</span>
      </div>
      <p class="ai-question-text">{{ truncate(question.question, 60) }}</p>
    </div>

    <!-- Chat Content -->
    <div class="ai-chat" ref="chatRef">
      <div v-if="!appStore.isAiConfigured()" class="ai-empty">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
        <p class="text-muted text-sm">请先前往「设置」配置 AI API</p>
        <router-link to="/settings" class="btn btn-sm btn-primary">去设置</router-link>
      </div>

      <div v-else-if="messages.length === 0" class="ai-empty">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <p class="text-muted text-sm">点击获取 AI 解析，或直接在下方提问</p>
        <button class="btn btn-sm btn-primary" @click="analyze" :disabled="loading || !question">
          <svg width="14" height="14" viewBox="0 0 1024 1024">
            <path d="M122.281 287v450L317.15 624.5v-225z" fill="#0423DB"/>
            <path d="M317.15 399.5v225L512 512z" fill="#1C54E4"/>
            <path d="M512 512L317.15 399.5l389.625-225.131L901.719 287z" fill="#AB9BFF"/>
            <path d="M317.15 399.5L122.281 287 512 62l194.775 112.369z" fill="#7347FF"/>
            <path d="M901.719 737L512 962 317.15 849.5l389.7-225z" fill="#00CFCA"/>
            <path d="M706.85 624.5L901.719 512v225z m-389.7 225L122.281 737 512 512l194.85 112.5z" fill="#00EBD2"/>
          </svg>
          获取 AI 解析
        </button>
      </div>

      <template v-else>
        <div
          v-for="(msg, index) in messages"
          :key="index"
          :class="['chat-message', msg.role === 'user' ? 'chat-user' : 'chat-assistant']"
        >
          <div class="chat-avatar">
            <svg v-if="msg.role === 'assistant'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            <span v-else>我</span>
          </div>
          <div class="chat-bubble markdown-body" v-html="renderMarkdown(msg.content)"></div>
        </div>

        <div v-if="loading" class="chat-message chat-assistant">
          <div class="chat-avatar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
          </div>
          <div class="chat-bubble chat-loading">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>
      </template>
    </div>

    <!-- Chat Input -->
    <div v-if="appStore.isAiConfigured()" class="ai-input-bar">
      <input
        ref="inputRef"
        v-model="chatInput"
        type="text"
        placeholder="向 AI 提问..."
        :disabled="loading"
        @keydown.enter="sendChat"
      />
      <button class="send-btn" :disabled="!chatInput.trim() || loading" @click="sendChat">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useAppStore } from '../stores/app.js'
import { analyzeQuestion, chatWithAi } from '../utils/ai.js'

const props = defineProps({
  question: Object,
  userAnswer: [String, Array],
})

const appStore = useAppStore()
const messages = ref([])
const chatInput = ref('')
const loading = ref(false)
const chatRef = ref(null)
const inputRef = ref(null)

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
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n/gim, '<br>')
  return html
}

function scrollToBottom() {
  nextTick(() => {
    if (chatRef.value) {
      chatRef.value.scrollTop = chatRef.value.scrollHeight
    }
  })
}

async function analyze() {
  if (!props.question || !appStore.isAiConfigured()) return
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
    messages.value.push({ role: 'assistant', content: res })
  } catch (err) {
    messages.value.push({ role: 'assistant', content: `**解析失败**：${err.message}` })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

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

/* Markdown compact */
.chat-bubble :deep(h1), .chat-bubble :deep(h2), .chat-bubble :deep(h3) {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0.4rem 0 0.2rem;
  line-height: 1.3;
}

.chat-bubble :deep(p) {
  margin: 0.15rem 0;
}

.chat-bubble :deep(strong) {
  color: var(--text-primary);
}

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

.chat-bubble :deep(pre code) {
  background: none;
  padding: 0;
}

.chat-bubble :deep(ul) {
  padding-left: 1rem;
  margin: 0.2rem 0;
}

.chat-bubble :deep(li) {
  margin: 0.1rem 0;
}

.chat-bubble :deep(br) {
  display: block;
  content: '';
  margin-bottom: 0.2rem;
}

/* Loading dots */
.chat-loading {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.6rem 0.75rem;
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

/* Input bar */
.ai-input-bar {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}

.ai-input-bar input {
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

.ai-input-bar input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.ai-input-bar input::placeholder {
  color: var(--text-muted);
}

.ai-input-bar input:disabled {
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
  transition: opacity 0.15s ease;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
