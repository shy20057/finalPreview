<template>
  <div class="note-editor">
    <NoteToolbar
      v-if="editor"
      :editor="editor"
      @save="handleSave"
      @export="handleExport"
      @insert-image="insertImageFile"
    />
    <div class="editor-content">
      <EditorContent :editor="editor" class="editor-wysiwyg-wrap" />
    </div>
  </div>
</template>

<script setup>
import { watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { useNoteStore } from '../../stores/note.js'
import NoteToolbar from './NoteToolbar.vue'
import { WavyUnderline } from './extensions/wavyUnderline.js'
import {
  markdownToHtml,
  htmlToMarkdown,
  readFileAsDataUrl,
  MAX_IMAGE_SIZE,
} from '../../utils/noteMarkdown.js'

const noteStore = useNoteStore()

let debounceTimer = null

function scheduleSave(html) {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    if (!noteStore.currentNoteId) return
    const markdown = htmlToMarkdown(html)
    await noteStore.saveContent(noteStore.currentNoteId, markdown)
  }, 500)
}

async function insertImageFile(file) {
  if (!file || !editor.value) return
  if (!file.type.startsWith('image/')) {
    alert('请选择图片文件')
    return
  }
  if (file.size > MAX_IMAGE_SIZE) {
    alert('图片大小不能超过 5MB')
    return
  }
  try {
    const src = await readFileAsDataUrl(file)
    editor.value.chain().focus().setImage({ src, alt: file.name }).run()
  } catch {
    alert('图片读取失败')
  }
}

const editor = useEditor({
  content: markdownToHtml(noteStore.currentNote?.content || ''),
  extensions: [
    StarterKit.configure({ strike: false }),
    Underline,
    WavyUnderline,
    Image.configure({
      inline: false,
      allowBase64: true,
      HTMLAttributes: { class: 'note-image' },
    }),
    Highlight.configure({ multicolor: true }),
    TextStyle,
    Color,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'note-link' },
    }),
  ],
  editorProps: {
    attributes: {
      class: 'editor-wysiwyg',
    },
    handlePaste(_view, event) {
      const items = event.clipboardData?.items
      if (!items) return false
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          event.preventDefault()
          const file = item.getAsFile()
          if (file) insertImageFile(file)
          return true
        }
      }
      return false
    },
    handleDrop(_view, event) {
      const file = event.dataTransfer?.files?.[0]
      if (!file?.type.startsWith('image/')) return false
      event.preventDefault()
      insertImageFile(file)
      return true
    },
  },
  onUpdate: ({ editor: ed }) => {
    scheduleSave(ed.getHTML())
  },
})

watch(
  () => noteStore.currentNoteId,
  (newId, oldId) => {
    if (newId !== oldId && editor.value) {
      editor.value.commands.setContent(
        markdownToHtml(noteStore.currentNote?.content || ''),
        false
      )
    }
  }
)

onBeforeUnmount(() => {
  clearTimeout(debounceTimer)
  editor.value?.destroy()
})

async function handleSave() {
  if (!editor.value) return
  clearTimeout(debounceTimer)
  const markdown = htmlToMarkdown(editor.value.getHTML())
  await noteStore.saveContent(noteStore.currentNoteId, markdown)
}

async function handleExport() {
  if (!noteStore.currentNoteId) return
  try {
    const { blob, filename } = await noteStore.downloadNote(noteStore.currentNoteId)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e) {
    alert('导出失败：' + e.message)
  }
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
