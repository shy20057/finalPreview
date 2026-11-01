<template>
  <view class="date-picker" ref="pickerRef" @click.stop>
    <button
      type="button"
      class="web-button date-picker-trigger"
      :class="{ active: isOpen, filled: modelValue }"
      @click="toggle"
    >
      <AppIcon name="i80931511" :size="24" class="date-icon" />
      <text class="date-text">{{ displayText }}</text>
    </button>

    <ViewTransition name="date-picker-pop">
      <view v-if="isOpen" class="date-picker-panel">
        <view class="date-picker-header">
          <button type="button" class="web-button nav-btn" @click="prevMonth">
            <AppIcon name="i327d52bc" :size="24" />
          </button>
          <text class="current-month">{{ currentYear }}年{{ currentMonth + 1 }}月</text>
          <button type="button" class="web-button nav-btn" @click="nextMonth">
            <AppIcon name="idf26d94a" :size="24" />
          </button>
        </view>

        <view class="date-picker-weekdays">
          <text v-for="day in weekdays" :key="day" class="weekday">{{ day }}</text>
        </view>

        <view class="date-picker-days">
          <button
            v-for="cell in calendarCells"
            :key="cell.key"
            type="button"
            class="web-button day-cell"
            :class="{
              'other-month': !cell.isCurrentMonth,
              'is-today': cell.isToday,
              'is-selected': cell.isSelected,
            }"
            @click="selectDate(cell.date)"
          >
            {{ cell.day }}
          </button>
        </view>

        <view class="date-picker-footer">
          <button type="button" class="web-button today-btn" @click="selectToday">今天</button>
          <button type="button" class="web-button clear-btn" @click="clear">清除</button>
        </view>
      </view>
    </ViewTransition>
  </view>
</template>

<script setup>
import { inject } from 'vue'
const appScope = inject('appScope', '')
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '选择日期',
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const pickerRef = ref(null)
const viewDate = ref(new Date())

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const selectedDate = computed(() => {
  return props.modelValue ? new Date(props.modelValue) : null
})

const displayText = computed(() => {
  if (!props.modelValue) return props.placeholder
  const d = new Date(props.modelValue)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
})

const currentYear = computed(() => viewDate.value.getFullYear())
const currentMonth = computed(() => viewDate.value.getMonth())

function normalizeDate(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

const calendarCells = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startWeekday = firstDayOfMonth.getDay()

  const today = normalizeDate(new Date())
  const selected = selectedDate.value ? normalizeDate(selectedDate.value) : null

  const cells = []

  // Previous month padding
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i
    const date = new Date(year, month - 1, day)
    cells.push({
      key: `prev-${day}`,
      date,
      day,
      isCurrentMonth: false,
      isToday: isSameDay(date, today),
      isSelected: selected ? isSameDay(date, selected) : false,
    })
  }

  // Current month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    cells.push({
      key: `curr-${day}`,
      date,
      day,
      isCurrentMonth: true,
      isToday: isSameDay(date, today),
      isSelected: selected ? isSameDay(date, selected) : false,
    })
  }

  // Next month padding
  const remaining = 42 - cells.length
  for (let day = 1; day <= remaining; day++) {
    const date = new Date(year, month + 1, day)
    cells.push({
      key: `next-${day}`,
      date,
      day,
      isCurrentMonth: false,
      isToday: isSameDay(date, today),
      isSelected: selected ? isSameDay(date, selected) : false,
    })
  }

  return cells
})

function toggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value && props.modelValue) {
    viewDate.value = new Date(props.modelValue)
  }
}

function open() {
  isOpen.value = true
  if (props.modelValue) {
    viewDate.value = new Date(props.modelValue)
  }
}

function close() {
  isOpen.value = false
}

function prevMonth() {
  viewDate.value = new Date(currentYear.value, currentMonth.value - 1, 1)
}

function nextMonth() {
  viewDate.value = new Date(currentYear.value, currentMonth.value + 1, 1)
}

function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function selectDate(date) {
  const value = formatDate(date)
  emit('update:modelValue', value)
  emit('change', value)
  close()
}

function selectToday() {
  const today = new Date()
  selectDate(today)
}

function clear() {
  emit('update:modelValue', '')
  emit('change', '')
  close()
}

function handleClickOutside() {
  close()
}

onMounted(() => {
  uni.$on(`page-tap:${appScope}`, handleClickOutside)
})

onUnmounted(() => {
  uni.$off(`page-tap:${appScope}`, handleClickOutside)
})

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    viewDate.value = new Date(newVal)
  }
})
</script>

<style scoped>
.date-picker {
  position: relative;
  margin-top: 0.5rem;
  padding: 0 0.4rem;
}

.date-picker-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.6rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.date-picker-trigger:hover {
  border-color: var(--border-hover);
}

.date-picker-trigger.active,
.date-picker-trigger:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-soft);
}

.date-picker-trigger.filled {
  color: var(--text-primary);
}

.date-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.date-text {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.date-picker-panel {
  position: absolute;
  top: calc(100% + 0.4rem);
  left: 0.4rem;
  right: 0.4rem;
  z-index: 100;
  padding: 0.75rem;
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

@media (max-width: 767px) {
  .date-picker-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    right: auto;
    width: 18rem;
    max-width: calc(100vw - 2rem);
    transform: translate(-50%, -50%);
  }

  .date-picker-panel::before {
    content: '';
    position: fixed;
    inset: -100vh -100vw;
    background: var(--overlay-backdrop, rgba(0, 0, 0, 0.45));
    z-index: -1;
    pointer-events: none;
  }
}

.date-picker-pop-enter-active,
.date-picker-pop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.date-picker-pop-enter-from,
.date-picker-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.date-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.6rem;
}

.current-month {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  padding: 0;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.nav-btn:hover {
  color: var(--text-primary);
  background: var(--bg-card-hover);
  border-color: var(--border-color);
}

.nav-btn .app-icon {
  width: 0.9rem;
  height: 0.9rem;
}

.date-picker-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.2rem;
  margin-bottom: 0.3rem;
}

.weekday {
  text-align: center;
  font-size: 0.7rem;
  color: var(--text-muted);
  padding: 0.25rem 0;
}

.date-picker-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.2rem;
}

.day-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  color: var(--text-primary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.day-cell:hover {
  background: var(--bg-card-hover);
}

.day-cell.other-month {
  color: var(--text-muted);
}

.day-cell.is-today {
  border-color: var(--accent-border);
  color: var(--accent-primary);
  font-weight: 600;
}

.day-cell.is-selected {
  background: var(--accent-primary);
  color: #fff;
  border-color: var(--accent-primary);
}

.day-cell.is-selected.is-today {
  color: #fff;
}

.date-picker-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 0.6rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--border-color);
}

.today-btn,
.clear-btn {
  padding: 0.3rem 0.6rem;
  font-size: 0.78rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.today-btn {
  color: var(--accent-primary);
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
}

.today-btn:hover {
  background: var(--accent-border);
}

.clear-btn {
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--border-color);
}

.clear-btn:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-hover);
}
</style>
