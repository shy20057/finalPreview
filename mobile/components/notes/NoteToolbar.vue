<template>
  <view class="note-toolbar" @click.stop>
    <view class="toolbar-group">
      <view
        class="tool-btn"
        :class="{ active: active.heading1 }"
        tabindex="-1"
        title="标题1"
        @touchstart.stop
        @click="emit('format', 'heading', { level: 1 })"
      >H1</view>
      <view
        class="tool-btn"
        :class="{ active: active.heading2 }"
        tabindex="-1"
        title="标题2"
        @touchstart.stop
        @click="emit('format', 'heading', { level: 2 })"
      >H2</view>
      <view
        class="tool-btn"
        :class="{ active: active.heading3 }"
        tabindex="-1"
        title="标题3"
        @touchstart.stop
        @click="emit('format', 'heading', { level: 3 })"
      >H3</view>
    </view>
    <view class="toolbar-sep"></view>
    <view class="toolbar-group">
      <view
        class="tool-btn"
        :class="{ active: active.bold }"
        tabindex="-1"
        title="加粗"
        @touchstart.stop
        @click="emit('format', 'bold')"
      >B</view>
      <view
        class="tool-btn italic"
        :class="{ active: active.italic }"
        tabindex="-1"
        title="斜体"
        @touchstart.stop
        @click="emit('format', 'italic')"
      >I</view>
      <view
        class="tool-btn underline"
        :class="{ active: active.underline }"
        tabindex="-1"
        title="下划线"
        @touchstart.stop
        @click="emit('format', 'underline')"
      >U</view>
      <view
        class="tool-btn wavy"
        :class="{ active: active.wavyUnderline }"
        tabindex="-1"
        title="波浪下划线"
        @touchstart.stop
        @click="emit('format', 'wavy')"
      >S</view>
    </view>
    <view class="toolbar-sep"></view>
    <view class="toolbar-group">
      <view
        class="tool-btn"
        :class="{ active: active.bulletList }"
        tabindex="-1"
        title="无序列表"
        @touchstart.stop
        @click="emit('format', 'bulletList')"
      >
        <AppIcon name="i093d1247" :size="14" />
      </view>
      <view
        class="tool-btn"
        :class="{ active: active.orderedList }"
        tabindex="-1"
        title="有序列表"
        @touchstart.stop
        @click="emit('format', 'orderedList')"
      >
        <AppIcon name="if5291fb0" :size="14" />
      </view>
      <view
        class="tool-btn"
        :class="{ active: active.blockquote }"
        tabindex="-1"
        title="引用"
        @touchstart.stop
        @click="emit('format', 'blockquote')"
      >
        <AppIcon name="i7bba16d4" :size="14" />
      </view>
    </view>
    <view class="toolbar-sep"></view>
    <view class="toolbar-group color-group">
      <view class="picker-wrap">
        <view
          class="tool-btn"
          :class="{ active: active.highlight }"
          tabindex="-1"
          title="高亮"
          @touchstart.stop
          @click="togglePicker('highlight')"
        >
          <AppIcon name="i4a7728a1" :size="14" />
        </view>
        <view v-if="openPicker === 'highlight'" class="color-popover">
          <view
            v-for="c in NOTE_HIGHLIGHT_COLORS"
            :key="c"
            class="color-swatch"
            :class="`swatch-hl-${c}`"
            :title="c"
            @touchstart.stop
            @click="applyHighlight(c)"
          />
          <view class="color-clear" @touchstart.stop @click="clearHighlight">清除</view>
        </view>
      </view>
      <view class="picker-wrap">
        <view
          class="tool-btn color-btn"
          tabindex="-1"
          title="文字颜色"
          @touchstart.stop
          @click="togglePicker('text')"
        >
          <text style="color: var(--note-green)">A</text>
        </view>
        <view v-if="openPicker === 'text'" class="color-popover">
          <view
            v-for="c in NOTE_TEXT_COLORS"
            :key="c"
            class="color-swatch text-swatch"
            :style="{ color: `var(--note-${c})` }"
            :title="c"
            @touchstart.stop
            @click="applyTextColor(c)"
          >A</view>
          <view class="color-clear" @touchstart.stop @click="clearTextColor">清除</view>
        </view>
      </view>
    </view>
    <view class="toolbar-sep"></view>
    <view class="toolbar-group">
      <view class="tool-btn" tabindex="-1" title="插入图片" @touchstart.stop @click="triggerImageUpload">
        <AppIcon name="i9e9efb7f" :size="14" />
      </view>
      <view
        class="tool-btn"
        :class="{ active: active.link }"
        tabindex="-1"
        title="链接"
        @touchstart.stop
        @click="emit('format', 'link')"
      >
        <AppIcon name="ib6ac940c" :size="14" />
      </view>
    </view>
    <view class="toolbar-sep"></view>
    <view class="toolbar-group">
      <view
        class="tool-btn save-btn"
        :class="{ 'save-success': saved }"
        tabindex="-1"
        title="保存"
        @touchstart.stop
        @click="emit('save')"
      >
        <AppIcon name="i9478cf07" :size="14" v-if="!saved" class="save-icon" />
        <AppIcon name="i2dafc4b0" :size="14" v-else class="check-icon" />
      </view>
      <view class="tool-btn" tabindex="-1" title="导出 .md" @touchstart.stop @click="emit('export')">
        <AppIcon name="i15ffbe30" :size="14" />
      </view>
    </view>
  </view>
</template>

<script setup>
import { inject, onMounted, onBeforeUnmount } from 'vue'
const appScope = inject('appScope', '')
function closePicker() { openPicker.value = null }
onMounted(() => uni.$on(`page-tap:${appScope}`, closePicker))
onBeforeUnmount(() => uni.$off(`page-tap:${appScope}`, closePicker))
import { ref } from 'vue'
import { NOTE_TEXT_COLORS, NOTE_HIGHLIGHT_COLORS } from '../../utils/noteMarkdown.js'

// The view-layer Tiptap editor sends serializable selection state and receives commands.
const props = defineProps({
  active: { type: Object, default: () => ({}) },
  saved: { type: Boolean, default: false },
})
const emit = defineEmits(['save', 'export', 'insert-image', 'format'])

const openPicker = ref(null)

function togglePicker(name) {
  openPicker.value = openPicker.value === name ? null : name
}

function applyHighlight(color) {
  emit('format', 'highlight', { color })
  openPicker.value = null
}

function clearHighlight() {
  emit('format', 'highlight', { color: null })
  openPicker.value = null
}

function applyTextColor(color) {
  emit('format', 'textColor', { color })
  openPicker.value = null
}

function clearTextColor() {
  emit('format', 'textColor', { color: null })
  openPicker.value = null
}

// App 端没有 <input type="file">，改用系统相册选择器。
function triggerImageUpload() {
  uni.chooseImage({
    count: 1,
    sizeType: ['original'],
    success: (res) => {
      const path = res.tempFilePaths && res.tempFilePaths[0]
      if (!path) return
      const file = res.tempFiles && res.tempFiles[0]
      emit('insert-image', {
        path,
        size: (file && file.size) || 0,
        name: (file && file.name) || path.split('/').pop() || 'image',
      })
    },
  })
}
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
.save-btn.save-success {
  color: #22c55e;
  animation: save-pop 0.4s ease;
}
.save-btn.save-success .check-icon {
  animation: check-draw 0.35s ease forwards;
}
@keyframes save-pop {
  0% { transform: scale(1); }
  40% { transform: scale(1.3); }
  100% { transform: scale(1); }
}
@keyframes check-draw {
  0% { stroke-dasharray: 30; stroke-dashoffset: 30; opacity: 0; }
  50% { opacity: 1; }
  100% { stroke-dasharray: 30; stroke-dashoffset: 0; opacity: 1; }
}
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
