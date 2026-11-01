<template>
  <view :class="{ 'router-link-active': active, 'router-link-exact-active': exact }" @click="navigate">
    <slot />
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from '../utils/router.js'
const props = defineProps({ to: { type: [String, Object], required: true }, replace: Boolean })
const emit = defineEmits(['click'])
const route = useRoute()
const router = useRouter()
const targetPath = computed(() => typeof props.to === 'string' ? props.to.split('?')[0] : '')
const exact = computed(() => route.path === targetPath.value)
const active = computed(() => exact.value || (targetPath.value !== '/' && route.path.startsWith(`${targetPath.value}/`)))
function navigate(event) {
  emit('click', event)
  if (!exact.value) props.replace ? router.replace(props.to) : router.push(props.to)
}
</script>
