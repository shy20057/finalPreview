<template>
  <div class="note-toolbar">
    <div class="toolbar-group">
      <button
        class="tool-btn"
        :class="{ active: editor?.isActive('heading', { level: 1 }) }"
        tabindex="-1"
        title="标题1"
        @mousedown.prevent
        @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
      >H1</button>
      <button
        class="tool-btn"
        :class="{ active: editor?.isActive('heading', { level: 2 }) }"
        tabindex="-1"
        title="标题2"
        @mousedown.prevent
        @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
      >H2</button>
      <button
        class="tool-btn"
        :class="{ active: editor?.isActive('heading', { level: 3 }) }"
        tabindex="-1"
        title="标题3"
        @mousedown.prevent
        @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
      >H3</button>
    </div>
    <div class="toolbar-sep"></div>
    <div class="toolbar-group">
      <button
        class="tool-btn"
        :class="{ active: editor?.isActive('bold') }"
        tabindex="-1"
        title="加粗"
        @mousedown.prevent
        @click="editor?.chain().focus().toggleBold().run()"
      >B</button>
      <button
        class="tool-btn italic"
        :class="{ active: editor?.isActive('italic') }"
        tabindex="-1"
        title="斜体"
        @mousedown.prevent
        @click="editor?.chain().focus().toggleItalic().run()"
      >I</button>
      <button
        class="tool-btn underline"
        :class="{ active: editor?.isActive('underline') }"
        tabindex="-1"
        title="下划线"
        @mousedown.prevent
        @click="editor?.chain().focus().toggleUnderline().run()"
      >U</button>
      <button
        class="tool-btn wavy"
        :class="{ active: editor?.isActive('wavyUnderline') }"
        tabindex="-1"
        title="波浪下划线"
        @mousedown.prevent
        @click="editor?.chain().focus().toggleWavyUnderline().run()"
      >S</button>
    </div>
    <div class="toolbar-sep"></div>
    <div class="toolbar-group">
      <button
        class="tool-btn"
        :class="{ active: editor?.isActive('bulletList') }"
        tabindex="-1"
        title="无序列表"
        @mousedown.prevent
        @click="editor?.chain().focus().toggleBulletList().run()"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
          <circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>
        </svg>
      </button>
      <button
        class="tool-btn"
        :class="{ active: editor?.isActive('orderedList') }"
        tabindex="-1"
        title="有序列表"
        @mousedown.prevent
        @click="editor?.chain().focus().toggleOrderedList().run()"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
          <text x="3" y="8" font-size="7" fill="currentColor" stroke="none">1</text>
          <text x="3" y="14" font-size="7" fill="currentColor" stroke="none">2</text>
          <text x="3" y="20" font-size="7" fill="currentColor" stroke="none">3</text>
        </svg>
      </button>
      <button
        class="tool-btn"
        :class="{ active: editor?.isActive('blockquote') }"
        tabindex="-1"
        title="引用"
        @mousedown.prevent
        @click="editor?.chain().focus().toggleBlockquote().run()"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 21c3 0 7-1 7-8V5H3v8c0 4 2 6 4 8z"/><path d="M14 21c3 0 7-1 7-8V5h-7v8c0 4 2 6 4 8z"/>
        </svg>
      </button>
    </div>
    <div class="toolbar-sep"></div>
    <div class="toolbar-group color-group">
      <div class="picker-wrap" ref="highlightPickerRef">
        <button
          class="tool-btn"
          :class="{ active: editor?.isActive('highlight') }"
          tabindex="-1"
          title="高亮"
          @mousedown.prevent
          @click="togglePicker('highlight')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </button>
        <div v-if="openPicker === 'highlight'" class="color-popover">
          <button
            v-for="c in NOTE_HIGHLIGHT_COLORS"
            :key="c"
            class="color-swatch"
            :class="`swatch-hl-${c}`"
            :title="c"
            @mousedown.prevent
            @click="applyHighlight(c)"
          />
          <button class="color-clear" @mousedown.prevent @click="clearHighlight">清除</button>
        </div>
      </div>
      <div class="picker-wrap" ref="textPickerRef">
        <button
          class="tool-btn color-btn"
          tabindex="-1"
          title="文字颜色"
          @mousedown.prevent
          @click="togglePicker('text')"
        >
          <span style="color: var(--note-green)">A</span>
        </button>
        <div v-if="openPicker === 'text'" class="color-popover">
          <button
            v-for="c in NOTE_TEXT_COLORS"
            :key="c"
            class="color-swatch text-swatch"
            :style="{ color: `var(--note-${c})` }"
            :title="c"
            @mousedown.prevent
            @click="applyTextColor(c)"
          >A</button>
          <button class="color-clear" @mousedown.prevent @click="clearTextColor">清除</button>
        </div>
      </div>
    </div>
    <div class="toolbar-sep"></div>
    <div class="toolbar-group">
      <button class="tool-btn" tabindex="-1" title="插入图片" @mousedown.prevent @click="triggerImageUpload">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21,15 16,10 5,21"/>
        </svg>
      </button>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        hidden
        @change="onImageSelected"
      />
      <button
        class="tool-btn"
        :class="{ active: editor?.isActive('link') }"
        tabindex="-1"
        title="链接"
        @mousedown.prevent
        @click="toggleLink"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      </button>
    </div>
    <div class="toolbar-sep"></div>
    <div class="toolbar-group">
      <button class="tool-btn save-btn" tabindex="-1" title="保存" @mousedown.prevent @click="$emit('save')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17,21 17,13 7,13 7,21"/>
          <polyline points="7,3 7,8 15,8"/>
        </svg>
      </button>
      <button class="tool-btn" tabindex="-1" title="导出 .md" @mousedown.prevent @click="$emit('export')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { NOTE_TEXT_COLORS, NOTE_HIGHLIGHT_COLORS } from '../../utils/noteMarkdown.js'

const props = defineProps({
  editor: { type: Object, default: null },
})
const emit = defineEmits(['save', 'export', 'insert-image'])

const openPicker = ref(null)
const fileInputRef = ref(null)
const highlightPickerRef = ref(null)
const textPickerRef = ref(null)

function togglePicker(name) {
  openPicker.value = openPicker.value === name ? null : name
}

function applyHighlight(color) {
  props.editor?.chain().focus().toggleHighlight({ color }).run()
  openPicker.value = null
}

function clearHighlight() {
  props.editor?.chain().focus().unsetHighlight().run()
  openPicker.value = null
}

function applyTextColor(color) {
  const hexMap = {
    green: '#22c55e',
    blue: '#3b82f6',
    red: '#ef4444',
    yellow: '#eab308',
    purple: '#a855f7',
  }
  props.editor?.chain().focus().setColor(hexMap[color]).run()
  openPicker.value = null
}

function clearTextColor() {
  props.editor?.chain().focus().unsetColor().run()
  openPicker.value = null
}

function triggerImageUpload() {
  fileInputRef.value?.click()
}

function onImageSelected(e) {
  const file = e.target.files?.[0]
  if (file) emit('insert-image', file)
  e.target.value = ''
}

function toggleLink() {
  const ed = props.editor
  if (!ed) return
  const prev = ed.getAttributes('link').href
  if (prev) {
    ed.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  const url = window.prompt('输入链接地址', 'https://')
  if (!url) return
  ed.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

function onDocClick(e) {
  if (
    openPicker.value &&
    !highlightPickerRef.value?.contains(e.target) &&
    !textPickerRef.value?.contains(e.target)
  ) {
    openPicker.value = null
  }
}

onMounted(() => document.addEventListener('mousedown', onDocClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick))
</script>

<style scoped>
.note-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-surface);
  flex-wrap: wrap;
}
.toolbar-group { display: flex; gap: 2px; align-items: center; }
.toolbar-sep { width: 1px; height: 20px; background: var(--border-color); margin: 0 4px; }
.tool-btn {
  display: flex; align-items: center; justify-content: center;
  min-width: 28px; height: 28px; padding: 0 6px;
  background: none; border: none; border-radius: var(--radius-sm);
  cursor: pointer; color: var(--text-secondary); font-size: 0.8rem; font-weight: 600;
  transition: background 0.1s, color 0.1s;
}
.tool-btn:hover { background: var(--bg-surface-raised); color: var(--text-primary); }
.tool-btn:focus { outline: none; }
.tool-btn.active { background: var(--accent-soft); color: var(--accent-primary); }
.tool-btn.italic { font-style: italic; }
.tool-btn.underline { text-decoration: underline; }
.tool-btn.wavy { text-decoration: underline wavy; text-underline-offset: 2px; }
.color-btn { font-weight: 700; }
.picker-wrap { position: relative; }
.color-popover {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.color-swatch {
  width: 22px;
  height: 22px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
}
.color-swatch:hover { transform: scale(1.1); }
.text-swatch {
  background: var(--bg-surface);
  font-weight: 700;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.swatch-hl-yellow { background: rgba(234, 179, 8, 0.45); }
.swatch-hl-green { background: rgba(34, 197, 94, 0.45); }
.swatch-hl-blue { background: rgba(59, 130, 246, 0.45); }
.swatch-hl-red { background: rgba(239, 68, 68, 0.45); }
.swatch-hl-purple { background: rgba(168, 85, 247, 0.45); }
.color-clear {
  margin-left: 2px;
  padding: 2px 6px;
  font-size: 0.7rem;
  border: none;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
}
.color-clear:hover { color: var(--text-primary); background: var(--bg-surface); }
</style>
