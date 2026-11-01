<template>
  <view class="modal-overlay" @click.self="emit('close')">
    <view class="modal-content card animate-scaleIn">
      <view class="modal-header">
        <text>导入笔记</text>
        <view class="btn btn-ghost btn-sm" @click="emit('close')">
          <AppIcon name="i818664ab" :size="16" />
        </view>
      </view>
      <view class="modal-body">
        <view
          class="drop-zone"
          :class="{ 'drag-over': isDragOver }"
          @click="onPickFile"
        >
          <AppIcon name="i66f9939e" :size="40" />
          <text class="text-secondary">拖拽 .md 文件到这里，或点击选择</text>
        </view>
        <text v-if="error" class="error-msg text-error text-sm">{{ error }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { pickTextFile } from '../../utils/fs.js'

const emit = defineEmits(['close', 'import'])
const isDragOver = ref(false)
const error = ref('')

// App 端没有 <input type="file"> / 拖拽，改用系统文件选择器。
async function onPickFile() {
  error.value = ''
  try {
    const { filename, content } = await pickTextFile()
    handleFile(filename, content)
  } catch (e) {
    const msg = e?.message || '选择文件失败'
    if (msg.includes('cancel')) return
    error.value = msg
  }
}

function handleFile(filename, content) {
  error.value = ''
  if (!String(filename).endsWith('.md')) {
    error.value = '仅支持 .md 文件'
    return
  }
  emit('import', filename, content)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}
.modal-content {
  width: 90%;
  max-width: 400px;
  padding: 0;
  overflow: hidden;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
}
.modal-header text { font-size: 1rem; font-weight: 600; }
.modal-body { padding: 1.25rem; }
.drop-zone {
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-lg);
  padding: 2.5rem 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  position: relative;
}
.drop-zone:hover, .drop-zone.drag-over {
  border-color: var(--accent-primary);
  background: var(--accent-soft);
}
.drop-zone text { font-size: 0.875rem; }
.error-msg { margin-top: 0.75rem; text-align: center; }
</style>
