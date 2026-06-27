<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content card animate-scaleIn">
      <div class="modal-header">
        <h3>导入笔记</h3>
        <button class="btn btn-ghost btn-sm" @click="$emit('close')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div
          class="drop-zone"
          :class="{ 'drag-over': isDragOver }"
          @dragover.prevent="isDragOver = true"
          @dragleave="isDragOver = false"
          @drop.prevent="onDrop"
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <p class="text-secondary">拖拽 .md 文件到这里，或点击选择</p>
          <input type="file" accept=".md" class="file-input" @change="onFileSelect" />
        </div>
        <p v-if="error" class="error-msg text-error text-sm">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['close', 'import'])
const isDragOver = ref(false)
const error = ref('')

function onDrop(e) {
  isDragOver.value = false
  const file = e.dataTransfer.files[0]
  if (file) handleFile(file)
}

function onFileSelect(e) {
  const file = e.target.files[0]
  if (file) handleFile(file)
}

function handleFile(file) {
  error.value = ''
  if (!file.name.endsWith('.md')) {
    error.value = '仅支持 .md 文件'
    return
  }
  emit('import', file)
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
.modal-header h3 { font-size: 1rem; font-weight: 600; }
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
.drop-zone p { font-size: 0.875rem; }
.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}
.error-msg { margin-top: 0.75rem; text-align: center; }
</style>