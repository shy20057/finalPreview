<template>
  <view class="note-editor">
    <NoteToolbar v-if="ready" :active="active" :saved="saved"
      @save="sendAction('snapshot', { intent: 'save' })"
      @export="sendAction('snapshot', { intent: 'export' })"
      @format="handleFormat" @insert-image="insertImageFile" />
    <view class="editor-content">
      <view :id="hostId" class="editor-wysiwyg-wrap"
        :initial="initial" :change:initial="rich.initialize"
        :action="action" :change:action="rich.applyAction">
        <view class="editor-mount" />
      </view>
    </view>
  </view>
</template>

<script>
import NoteToolbar from './NoteToolbar.vue'
import { useNoteStore } from '../../stores/note.js'
import { useAuthStore } from '../../stores/auth.js'
import { getApiBase, getToken } from '../../utils/api.js'
import { accountStorageKey } from '../../utils/accountScope.js'
import { readFileAsDataUrl, MAX_IMAGE_SIZE } from '../../utils/noteMarkdown.js'
import { writeTextFile, shareFile } from '../../utils/fs.js'
import { promptText, showError } from '../../utils/dialog.js'

export default {
  components: { NoteToolbar },
  data() {
    return { hostId: `fp-editor-${Math.random().toString(36).slice(2)}`, initial: null, action: null, ready: false, saved: false, active: {}, revision: 0 }
  },
  created() {
    this.noteStore = useNoteStore()
    this.noteId = this.noteStore.currentNoteId
    this.origin = getApiBase()
    this.token = getToken()
    this.draftKey = accountStorageKey(`note-draft:${this.noteId}`, useAuthStore().user?.id)
    this.content = this.noteStore.currentNote?.content || ''
    this.originalContent = this.content
    this.dirty = false
    this.saveQueue = Promise.resolve()
    this.disposed = false
  },
  async mounted() {
    let restored = false
    const local = uni.getStorageSync(this.draftKey)
    if (local && typeof local.content === 'string' && local.content !== this.content) {
      const answer = await uni.showModal({ title: '恢复笔记草稿', content: '这篇笔记有尚未保存的本机草稿，是否恢复？', confirmText: '恢复', cancelText: '使用云端' })
      if (this.disposed) return
      if (answer.confirm) { this.content = local.content; restored = true }
      else uni.removeStorageSync(this.draftKey)
    }
    if (!this.disposed) this.initial = { id: this.noteId, hostId: this.hostId, content: this.content, restored }
  },
  beforeUnmount() {
    this.disposed = true
    clearTimeout(this.saveTimer)
    clearTimeout(this.feedbackTimer)
    if (this.dirty) this.persist(false).catch(() => {})
  },
  methods: {
    sendAction(type, payload = {}) { this.action = { type, ...payload, serial: ++this.revision } },
    onEditorMessage(message) {
      if (message.id !== this.noteId || this.disposed) return
      if (message.type === 'error') { showError(message.message, '编辑器加载失败'); return }
      this.ready = true
      this.active = message.active || {}
      if (message.type === 'ready' && !this.initial?.restored) return
      if (message.type === 'selection') return
      if (typeof message.content !== 'string') return
      if (message.type !== 'snapshot' || this.dirty) this.content = message.content
      this.dirty = this.content !== this.originalContent
      if (this.dirty) {
        try { uni.setStorageSync(this.draftKey, { content: this.content, updatedAt: Date.now() }) }
        catch { uni.showToast({ title: '本机草稿写入失败，请及时保存', icon: 'none' }) }
      }
      if (message.type === 'snapshot') {
        this.persist(true).then(async () => {
          if (message.intent === 'export') {
            const result = await this.noteStore.downloadNote(this.noteId)
            const filePath = await writeTextFile(result.filename, result.content)
            await shareFile(filePath, '导出笔记')
          }
        }).catch(error => { if (error.message !== 'cancel') showError(error, '保存或导出失败') })
      } else {
        clearTimeout(this.saveTimer)
        this.saveTimer = setTimeout(() => this.persist(false).catch(error => {
          if (!this.disposed) uni.showToast({ title: '保存失败，草稿已保留', icon: 'none' })
        }), 500)
      }
    },
    persist(feedback) {
      clearTimeout(this.saveTimer)
      const content = this.content
      const write = async () => {
        if (getApiBase() !== this.origin || getToken() !== this.token) throw new Error('账号已切换，请重新打开笔记')
        if (content !== this.originalContent) await this.noteStore.saveContent(this.noteId, content)
        this.originalContent = content
        if (this.content === content) {
          this.dirty = false
          uni.removeStorageSync(this.draftKey)
        }
        if (feedback && !this.disposed) {
          this.saved = true
          clearTimeout(this.feedbackTimer)
          this.feedbackTimer = setTimeout(() => { this.saved = false }, 800)
        }
      }
      this.saveQueue = this.saveQueue.catch(() => {}).then(write)
      return this.saveQueue
    },
    async handleFormat(name, payload = {}) {
      if (name === 'link' && !this.active.link) {
        const href = await promptText('输入链接地址', 'https://')
        if (!href) return
        if (!/^(https?:\/\/|mailto:)/i.test(href)) { showError('请输入 HTTP、HTTPS 或邮件链接'); return }
        this.sendAction('format', { name, payload: { href } })
      } else this.sendAction('format', { name, payload })
    },
    async insertImageFile(file) {
      if (!file || file.size > MAX_IMAGE_SIZE) { showError('图片大小不能超过 5MB'); return }
      try {
        const src = await readFileAsDataUrl(file)
        this.sendAction('image', { src, alt: file.name || '' })
      } catch (error) { showError(error, '图片读取失败') }
    },
  },
}
</script>

<script module="rich" lang="renderjs">
import '../../utils/viewPolyfills.js'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { WavyUnderline } from './extensions/wavyUnderline.js'
import { markdownToHtml, htmlToMarkdown, MAX_IMAGE_SIZE } from '../../utils/noteMarkdownView.js'

export default {
  mounted() {
    this.viewReady = true
    if (this.pendingInitial) this.initialize(this.pendingInitial)
    this.observer = new MutationObserver(() => {
      if (this.host && !this.host.isConnected) {
        this.editor?.destroy()
        this.editor = null
        this.observer.disconnect()
      }
    })
    this.observer.observe(document.body, { childList: true, subtree: true })
  },
  methods: {
    initialize(value) {
      if (!value) return
      this.pendingInitial = value
      if (!this.viewReady || this.editor) return
      this.host = document.getElementById(value.hostId)
      if (!this.host) { setTimeout(() => this.initialize(value), 16); return }
      this.noteId = value.id
      this.htmlSource = /^\s*<(?:p|div|h[1-6]|ul|ol|blockquote|pre|table|section)\b/i.test(value.content)
      try {
        const mount = this.host.querySelector('.editor-mount')
        this.editor = new Editor({
          element: mount,
          content: this.htmlSource ? value.content : markdownToHtml(value.content),
          extensions: [
            StarterKit.configure({ strike: false, underline: false, link: false }),
            Underline, WavyUnderline,
            Image.configure({ inline: false, allowBase64: true, HTMLAttributes: { class: 'note-image' } }),
            Highlight.configure({ multicolor: true }), TextStyle, Color,
            Link.configure({ openOnClick: false, HTMLAttributes: { class: 'note-link' } }),
          ],
          editorProps: {
            attributes: { class: 'editor-wysiwyg' },
            handlePaste: (_view, event) => {
              const image = [...(event.clipboardData?.items || [])].find(item => item.type.startsWith('image/'))
              if (!image) return false
              event.preventDefault()
              this.insertBrowserImage(image.getAsFile())
              return true
            },
            handleDrop: (_view, event) => {
              const image = event.dataTransfer?.files?.[0]
              if (!image?.type.startsWith('image/')) return false
              event.preventDefault()
              this.insertBrowserImage(image)
              return true
            },
          },
          onUpdate: () => this.notify('change'),
          onSelectionUpdate: () => this.notify('selection'),
        })
        this.notify('ready')
      } catch (error) { this.$ownerInstance.callMethod('onEditorMessage', { type: 'error', id: value.id, message: error.message }) }
    },
    notify(type, intent) {
      const editor = this.editor
      if (!editor || editor.isDestroyed) return
      const active = {}
      for (const mark of ['bold', 'italic', 'underline', 'wavyUnderline', 'bulletList', 'orderedList', 'blockquote', 'highlight', 'link']) active[mark] = editor.isActive(mark)
      for (let level = 1; level <= 3; level++) active[`heading${level}`] = editor.isActive('heading', { level })
      const message = { type, id: this.noteId, active, intent }
      if (type !== 'selection') message.content = this.htmlSource ? editor.getHTML() : htmlToMarkdown(editor.getHTML())
      this.$ownerInstance.callMethod('onEditorMessage', message)
    },
    insertBrowserImage(file) {
      if (!file || file.size > MAX_IMAGE_SIZE) return
      const reader = new FileReader()
      reader.onload = () => { if (this.editor && !this.editor.isDestroyed) this.editor.chain().focus().setImage({ src: reader.result, alt: file.name }).run() }
      reader.readAsDataURL(file)
    },
    applyAction(action) {
      if (!action || !this.editor) return
      if (action.type === 'snapshot') { this.notify('snapshot', action.intent); return }
      const chain = this.editor.chain().focus()
      if (action.type === 'image') { chain.setImage({ src: action.src, alt: action.alt }).run(); return }
      const payload = action.payload || {}
      const colors = { green: '#22c55e', blue: '#3b82f6', red: '#ef4444', yellow: '#eab308', purple: '#a855f7' }
      switch (action.name) {
        case 'heading': chain.toggleHeading({ level: payload.level }); break
        case 'bold': chain.toggleBold(); break
        case 'italic': chain.toggleItalic(); break
        case 'underline': chain.toggleUnderline(); break
        case 'wavy': chain.toggleWavyUnderline(); break
        case 'bulletList': chain.toggleBulletList(); break
        case 'orderedList': chain.toggleOrderedList(); break
        case 'blockquote': chain.toggleBlockquote(); break
        case 'highlight': payload.color ? chain.toggleHighlight({ color: payload.color }) : chain.unsetHighlight(); break
        case 'textColor': payload.color ? chain.setColor(colors[payload.color]) : chain.unsetColor(); break
        case 'link': payload.href ? chain.extendMarkRange('link').setLink({ href: payload.href }) : chain.extendMarkRange('link').unsetLink(); break
        default: return
      }
      chain.run()
      this.notify('selection')
    },
  },
}
</script>
<style scoped>
.note-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.editor-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}
.editor-wysiwyg-wrap {
  height: 100%;
  overflow-y: auto;
}
.editor-mount { min-height: 100%; }
.editor-wysiwyg-wrap :deep(.editor-wysiwyg) {
  width: 100%;
  min-height: 100%;
  padding: 1.25rem;
  background: var(--bg-surface);
  border: none;
  font-size: 0.95rem;
  line-height: 1.75;
  color: var(--text-primary);
  outline: none;
}
.editor-wysiwyg-wrap :deep(.editor-wysiwyg:focus) {
  outline: none;
}
.editor-wysiwyg-wrap :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: '开始写笔记...';
  color: var(--text-muted);
  pointer-events: none;
  float: left;
  height: 0;
}
.editor-wysiwyg-wrap :deep(h1) {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}
.editor-wysiwyg-wrap :deep(h2) {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}
.editor-wysiwyg-wrap :deep(h3) {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}
.editor-wysiwyg-wrap :deep(p) {
  margin-bottom: 0.75rem;
}
.editor-wysiwyg-wrap :deep(code) {
  background: var(--bg-surface-raised);
  padding: 0.1em 0.3em;
  border-radius: 4px;
  font-size: 0.9em;
}
.editor-wysiwyg-wrap :deep(pre) {
  background: var(--bg-surface-raised);
  padding: 1rem;
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin-bottom: 1rem;
}
.editor-wysiwyg-wrap :deep(pre code) {
  background: none;
  padding: 0;
}
.editor-wysiwyg-wrap :deep(ul),
.editor-wysiwyg-wrap :deep(ol) {
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}
.editor-wysiwyg-wrap :deep(blockquote) {
  border-left: 3px solid var(--accent-primary);
  padding-left: 1rem;
  margin-bottom: 0.75rem;
  color: var(--text-secondary);
}
.editor-wysiwyg-wrap :deep(.note-image) {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-md);
  margin: 0.75rem 0;
  display: block;
}
.editor-wysiwyg-wrap :deep(.note-link) {
  color: var(--accent-primary);
  text-decoration: underline;
  cursor: pointer;
}
</style>
