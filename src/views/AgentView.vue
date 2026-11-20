<template>
  <div class="agent-view">
    <!-- 顶部 -->
    <div class="agent-top">
      <div class="agent-top-info">
        <span class="agent-logo">AI</span>
        <div>
          <h2 class="agent-title">学习教练 Agent</h2>
          <p class="text-muted text-xs">LangChain · LangGraph · DeepAgents　|　写操作会先问过你</p>
        </div>
      </div>
      <button class="btn btn-sm btn-secondary" @click="newThread" :disabled="agent.busy">新对话</button>
    </div>

    <div v-if="!isDemoMode" class="agent-history" :aria-busy="agent.historyLoading">
      <label for="agent-thread-select">历史会话</label>
      <select
        id="agent-thread-select"
        class="input agent-thread-select"
        :value="agent.threadId"
        :disabled="agent.busy || agent.historyLoading"
        @change="switchThread"
      >
        <option value="">新对话</option>
        <option v-if="agent.threadId && !agent.threads.some(t => t.threadId === agent.threadId)" :value="agent.threadId">当前会话</option>
        <option v-for="thread in agent.threads" :key="thread.threadId" :value="thread.threadId">
          {{ thread.title }}{{ formatThreadDate(thread.updatedAt) }}{{ thread.status === 'awaiting_approval' ? ' · 待确认' : '' }}
        </option>
      </select>
      <button class="btn btn-sm btn-secondary" :disabled="agent.busy || agent.historyLoading" @click="agent.refreshThreads()">
        {{ agent.historyLoading ? '加载中…' : '刷新' }}
      </button>
    </div>
    <p v-if="agent.historyError" class="agent-error" role="alert">{{ agent.historyError }}</p>

    <div v-if="!appStore.isAiConfigured()" class="agent-notice">
      <span>还没有配置 AI 厂商，Agent 无法启动。</span>
      <router-link to="/settings" class="btn btn-sm btn-primary">去设置</router-link>
    </div>
    <div v-else-if="isDemoMode" class="agent-notice">
      <span>前端演示版没有后端，Agent 需要连接真实后端。</span>
    </div>

    <div v-if="agent.error" class="agent-error" role="alert">{{ agent.error }}</div>

    <!-- 对话 -->
    <div class="agent-body" ref="bodyRef" role="log" aria-label="会话消息" aria-live="polite" :aria-busy="agent.restoring">
      <div v-if="agent.restoring" class="text-muted text-sm" role="status">正在加载会话…</div>
      <div v-if="!visibleMessages.length && !agent.pending.length && !agent.restoring" class="empty-state">
        <p>问我点复习的事：讲透某道题、翻错题、整理笔记。</p>
        <div class="agent-samples">
          <button
            v-for="sample in samples"
            :key="sample"
            class="btn btn-sm btn-secondary"
            @click="useSample(sample)"
            :disabled="!canSend"
          >{{ sample }}</button>
        </div>
      </div>

      <div
        v-for="(msg, index) in visibleMessages"
        :key="msg.id || index"
        class="agent-msg"
        :class="msg.role"
      >
        <div v-if="msg.role === 'assistant'" class="agent-avatar">AI</div>
        <div class="msg-body">
          <div v-if="msg.role === 'user'" class="msg-bubble msg-user">{{ msg.content }}</div>
          <div v-else-if="msg.role === 'tool'" class="msg-tool">🔧 {{ msg.name || 'tool' }} 已执行</div>
          <div v-else class="msg-bubble msg-assistant" v-html="renderMarkdown(msg.content)"></div>
          <div v-if="msg.role === 'user' && msg.status" class="msg-status" :class="{ 'msg-status-error': msg.status === 'failed' }">
            {{ msg.status === 'failed' ? '请求失败，消息已保留' : '等待 AI 回复…' }}
          </div>
        </div>
      </div>

      <!-- 待审批 -->
      <div v-if="agent.pending.length" class="approval-group">
        <div class="approval-group-head">
          <span class="badge badge-warning">待确认 {{ agent.pending.length }} 项写操作</span>
          <span class="text-muted text-xs">每项都选一个决定，然后一起提交</span>
        </div>

        <div v-for="item in agent.pending" :key="item.id" class="approval">
          <div class="approval-head">
            <code class="approval-tool">{{ item.name }}</code>
          </div>
          <p v-if="item.description" class="approval-desc">{{ item.description }}</p>

          <div class="approval-args">
            <div v-for="(value, key) in item.args" :key="key" class="arg-row">
              <span class="arg-key">{{ key }}</span>
              <span class="arg-value">{{ formatArg(value) }}</span>
            </div>
            <p v-if="!Object.keys(item.args || {}).length" class="text-muted text-xs">（无参数）</p>
          </div>

          <div class="approval-choices">
            <button
              v-if="can(item, 'approve')"
              class="btn btn-sm"
              :class="choiceOf(item.id)?.type === 'approve' ? 'btn-primary' : 'btn-secondary'"
              @click="choose(item, 'approve')"
            >批准</button>
            <button
              v-if="can(item, 'edit')"
              class="btn btn-sm"
              :class="choiceOf(item.id)?.type === 'edit' ? 'btn-primary' : 'btn-secondary'"
              @click="choose(item, 'edit')"
            >修改参数</button>
            <button
              v-if="can(item, 'reject')"
              class="btn btn-sm"
              :class="choiceOf(item.id)?.type === 'reject' ? 'btn-primary' : 'btn-secondary'"
              @click="choose(item, 'reject')"
            >拒绝</button>
          </div>

          <template v-if="choiceOf(item.id)?.type === 'edit'">
            <textarea
              v-model="choices[item.id].text"
              class="input agent-edit"
              rows="5"
              spellcheck="false"
            ></textarea>
            <p v-if="choiceOf(item.id)?.error" class="text-xs agent-error">{{ choiceOf(item.id).error }}</p>
          </template>

          <template v-if="choiceOf(item.id)?.type === 'reject'">
            <input
              v-model="choices[item.id].message"
              class="input"
              placeholder="拒绝原因（可选，会转达给 Agent）"
            />
          </template>
        </div>

        <div class="approval-actions">
          <button class="btn btn-primary" @click="submitDecisions" :disabled="agent.busy || !allChosen">
            提交决定
          </button>
          <span v-if="!allChosen" class="text-muted text-xs">还有项没选决定</span>
        </div>
      </div>

      <div v-if="agent.loading" class="agent-typing" role="status" aria-label="AI 正在回复"><span></span><span></span><span></span></div>
    </div>

    <!-- 输入 -->
    <div class="agent-composer">
      <textarea
        v-model="input"
        class="input agent-input"
        rows="2"
        :placeholder="agent.hasPending ? '请先处理上方待确认的操作' : '问点什么…（Enter 发送，Shift+Enter 换行）'"
        aria-label="输入消息"
        @keydown.enter.exact.prevent="send"
      ></textarea>
      <button class="btn btn-primary" @click="send" :disabled="!canSend || !input.trim()">发送</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { marked } from 'marked'
import { useAgentStore } from '../stores/agent.js'
import { useAppStore } from '../stores/app.js'
import { isDemoMode } from '../utils/demoMode.js'

const agent = useAgentStore()
const appStore = useAppStore()

const input = ref('')
const bodyRef = ref(null)
const canSend = computed(() => !agent.busy && !agent.hasPending && !isDemoMode && appStore.isAiConfigured())
/** { [pendingId]: { type: 'approve'|'edit'|'reject', text, message, error } } */
const choices = ref({})

const samples = [
  '帮我看看最近的错题，讲解其中一道',
  '把「操作系统」的知识点整理成笔记',
  '题库里有哪些关于死锁的题？',
]

const visibleMessages = computed(() =>
  agent.messages.filter(m => m.role !== 'system' && (m.content || '').trim())
)

const allChosen = computed(() =>
  agent.pending.length > 0 && agent.pending.every(item => !!choices.value[item.id]?.type)
)

function renderMarkdown(text) {
  const html = marked.parse(text || '', { breaks: true, gfm: true })
  return typeof html === 'string' ? html : ''
}

function formatArg(value) {
  if (value == null) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function choiceOf(id) {
  return choices.value[id]
}

function can(item, type) {
  const allowed = item.allowedDecisions
  return !allowed?.length || allowed.includes(type)
}

function scrollToBottom() {
  nextTick(() => {
    if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight
  })
}

async function send() {
  const text = input.value.trim()
  if (!text || !canSend.value) return
  input.value = ''
  const request = agent.send(text)
  scrollToBottom()
  await request
  scrollToBottom()
}

function formatThreadDate(value) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return ''
  return ` · ${date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`
}

async function switchThread(event) {
  const target = event.target
  const id = target.value
  const restored = id ? await agent.restore(id) : agent.startNewThread()
  target.value = agent.threadId
  if (!restored) return
  choices.value = {}
  input.value = ''
  scrollToBottom()
}

function useSample(text) {
  input.value = text
  send()
}

function choose(item, type) {
  choices.value[item.id] = {
    type,
    text: JSON.stringify(item.args || {}, null, 2),
    message: '',
    error: '',
  }
}

async function submitDecisions() {
  const decisions = []
  for (const item of agent.pending) {
    const choice = choices.value[item.id]
    if (!choice) return
    if (choice.type === 'edit') {
      let args
      try {
        args = JSON.parse(choice.text)
      } catch {
        choice.error = '参数必须是合法 JSON'
        return
      }
      decisions.push({ type: 'edit', edited_action: { name: item.name, args } })
    } else if (choice.type === 'reject') {
      decisions.push({ type: 'reject', message: choice.message || '' })
    } else {
      decisions.push({ type: 'approve' })
    }
  }
  await agent.decide(decisions)
  choices.value = {}
  scrollToBottom()
}

function newThread() {
  if (!agent.startNewThread()) return
  choices.value = {}
  input.value = ''
}

watch(() => agent.messages.length, scrollToBottom)
watch(() => agent.pending.length, scrollToBottom)

onMounted(async () => {
  if (!isDemoMode) await agent.restore(undefined, { refresh: true })
  scrollToBottom()
})
</script>

<style scoped>
.agent-view {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ─── 顶部 ─── */
.agent-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-shrink: 0;
}

.agent-top-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.agent-logo {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 12px;
  background: var(--accent-gradient);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.agent-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.agent-history {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-shrink: 0;
}

.agent-history label {
  flex-shrink: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.agent-thread-select {
  flex: 1;
  min-width: 0;
  width: 0;
  min-height: 44px;
}

.agent-history .btn {
  min-height: 44px;
  flex-shrink: 0;
}

.agent-history :disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.agent-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 0.9rem;
  border-radius: var(--radius-md);
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  color: var(--text-secondary);
  font-size: 0.875rem;
  flex-shrink: 0;
}

.agent-error {
  padding: 0.6rem 0.9rem;
  border-radius: var(--radius-md);
  background: var(--error-soft);
  border: 1px solid var(--error-border);
  color: var(--error);
  font-size: 0.875rem;
  flex-shrink: 0;
}

/* ─── 对话区 ─── */
.agent-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1rem;
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.agent-samples {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  margin-top: 0.75rem;
}

.agent-msg {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
}

.agent-msg.user {
  justify-content: flex-end;
}

.agent-avatar {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--accent-gradient);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
}

.msg-body {
  min-width: 0;
  max-width: 82%;
}

.msg-bubble {
  padding: 0.6rem 0.85rem;
  border-radius: var(--radius-lg);
  font-size: 0.9rem;
  line-height: 1.65;
  word-break: break-word;
}

.msg-user {
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  color: var(--text-primary);
  white-space: pre-wrap;
}

.msg-status {
  margin-top: 0.3rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: right;
}

.msg-status-error {
  color: var(--error);
}

.msg-assistant {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.msg-tool {
  display: inline-block;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  font-size: 0.75rem;
}

/* Markdown（v-html 内容不带 scoped 属性，用 :deep 命中） */
.msg-assistant :deep(p) { margin: 0 0 0.6rem; }
.msg-assistant :deep(p:last-child) { margin-bottom: 0; }
.msg-assistant :deep(ul),
.msg-assistant :deep(ol) { margin: 0.3rem 0 0.6rem; padding-left: 1.2rem; }
.msg-assistant :deep(li) { margin-bottom: 0.2rem; }
.msg-assistant :deep(h1),
.msg-assistant :deep(h2),
.msg-assistant :deep(h3),
.msg-assistant :deep(h4) { margin: 0.6rem 0 0.35rem; font-size: 0.95rem; color: var(--accent-primary); }
.msg-assistant :deep(code) {
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  background: var(--bg-surface-raised);
  font-size: 0.85em;
}
.msg-assistant :deep(pre) {
  padding: 0.7rem;
  border-radius: var(--radius-md);
  background: var(--bg-surface-raised);
  overflow-x: auto;
}
.msg-assistant :deep(pre code) { background: none; padding: 0; }
.msg-assistant :deep(blockquote) {
  margin: 0.4rem 0;
  padding-left: 0.7rem;
  border-left: 3px solid var(--accent-border);
  color: var(--text-secondary);
}
.msg-assistant :deep(table) { width: 100%; border-collapse: collapse; margin: 0.4rem 0; }
.msg-assistant :deep(th),
.msg-assistant :deep(td) { border: 1px solid var(--border-color); padding: 0.3rem 0.5rem; text-align: left; }

/* ─── 待审批 ─── */
.approval-group {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.approval-group-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.approval {
  padding: 0.85rem;
  border-radius: var(--radius-lg);
  background: var(--warning-soft);
  border: 1px solid var(--warning-border);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.approval-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.approval-tool {
  font-size: 0.8rem;
  color: var(--text-secondary);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 0.1rem 0.4rem;
}

.approval-desc {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.approval-args {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.arg-row {
  display: flex;
  gap: 0.5rem;
  font-size: 0.82rem;
  align-items: baseline;
}

.arg-key {
  flex-shrink: 0;
  color: var(--accent-primary);
  font-weight: 600;
  font-family: var(--font-mono, monospace);
}

.arg-value {
  color: var(--text-secondary);
  word-break: break-word;
  white-space: pre-wrap;
}

.approval-choices,
.approval-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.agent-edit {
  font-family: var(--font-mono, monospace);
  font-size: 0.8rem;
  resize: vertical;
}

/* ─── 输入区 ─── */
.agent-composer {
  display: flex;
  gap: 0.6rem;
  align-items: flex-end;
  flex-shrink: 0;
}

.agent-input {
  flex: 1;
  resize: vertical;
  min-height: 44px;
  max-height: 160px;
  font-family: inherit;
  line-height: 1.5;
}

/* ─── 思考中 ─── */
.agent-typing {
  display: flex;
  gap: 0.3rem;
  padding: 0.2rem 0;
}

.agent-typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-primary);
  animation: agent-blink 1.2s infinite ease-in-out;
}

.agent-typing span:nth-child(2) { animation-delay: 0.2s; }
.agent-typing span:nth-child(3) { animation-delay: 0.4s; }

@keyframes agent-blink {
  0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-2px); }
}

@media (prefers-reduced-motion: reduce) {
  .agent-typing span { animation: none; }
}

@media (max-width: 768px) {
  .msg-body { max-width: 100%; }
}
</style>
