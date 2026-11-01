<template>
  <view class="wrong-empty card">
    <AppIcon name="i980120ab" :size="48" class="text-muted" />
    <text class="text-muted">{{ message }}</text>
    <slot name="action">
      <view v-if="showAction" class="btn btn-primary" @click="goBanks">去答题</view>
    </slot>
  </view>
</template>

<script setup>
import { useRouter } from '../../utils/router.js'

defineProps({
  message: { type: String, default: '暂无错题，继续加油！' },
  showAction: { type: Boolean, default: true },
})

const router = useRouter()

function goBanks() {
  router.push('/banks')
}
</script>

<style scoped>
.wrong-empty {
  padding: 3rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}
</style>
