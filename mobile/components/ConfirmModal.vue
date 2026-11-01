<!-- mobile/components/ConfirmModal.vue -->
<!-- Port of src/components/ConfirmModal.vue — App-Vue 端（详见 mobile/PORTING.md） -->
<template>
  <view class="confirm-modal-overlay" @click.self="handleCancel">
    <view class="confirm-modal card animate-scaleIn" role="dialog" aria-modal="true">
      <view class="confirm-icon" :class="type">
        <AppIcon name="i870bd079" :size="24" v-if="type === 'danger'" />
        <AppIcon name="i518e26d7" :size="24" v-else-if="type === 'warning'" />
        <AppIcon name="i888b9bda" :size="24" v-else />
      </view>
      <text class="confirm-title">{{ title }}</text>
      <text v-if="message" class="confirm-message">{{ message }}</text>
      <view class="confirm-actions">
        <view class="btn btn-secondary" @click="handleCancel">{{ cancelText }}</view>
        <view
          class="btn"
          :class="confirmClass"
          @click="handleConfirm"
        >{{ confirmText }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: '确认操作'
  },
  message: {
    type: String,
    default: ''
  },
  confirmText: {
    type: String,
    default: '确认'
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  type: {
    type: String,
    default: 'danger', // 'danger' | 'warning' | 'info'
    validator: v => ['danger', 'warning', 'info'].includes(v)
  }
})

const emit = defineEmits(['confirm', 'cancel'])

const confirmClass = computed(() => {
  switch (props.type) {
    case 'danger': return 'btn-danger'
    case 'warning': return 'btn-warning'
    default: return 'btn-primary'
  }
})

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
}
</script>

<style scoped>
.confirm-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}

.confirm-modal {
  width: 100%;
  max-width: 360px;
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
}

.confirm-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.25rem;
}

.confirm-icon.danger {
  background: var(--error-soft);
  color: var(--error);
}

.confirm-icon.warning {
  background: var(--warning-soft);
  color: var(--warning);
}

.confirm-icon.info {
  background: var(--accent-soft);
  color: var(--accent-primary);
}

.confirm-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.confirm-message {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
  width: 100%;
}

.confirm-actions .btn {
  flex: 1;
  justify-content: center;
}
</style>
