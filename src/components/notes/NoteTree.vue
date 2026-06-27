<template>
  <div class="note-tree">
    <div v-if="noteStore.tree.length === 0" class="tree-empty text-muted text-sm">
      暂无笔记
    </div>
    <TreeNode
      v-for="node in noteStore.tree"
      :key="node.id"
      :node="node"
      :depth="0"
    />
  </div>
</template>

<script setup>
import { useNoteStore } from '../../stores/note.js'
import TreeNode from './TreeNode.vue'
const noteStore = useNoteStore()
</script>

<style scoped>
.note-tree { }
.tree-empty { padding: 1rem 0.5rem; text-align: center; }
</style>