<script setup lang="ts">
import type { Pagination } from '../types/catalogue'
defineProps<{ pagination: Pagination; busy: boolean }>()
defineEmits<{ change: [page: number] }>()
</script>
<template>
  <nav class="pagination" aria-label="Catalogue pages">
    <button :disabled="busy || pagination.page <= 1" @click="$emit('change', pagination.page - 1)">← Previous</button>
    <span>Page {{ pagination.page }} of {{ pagination.totalPages || 1 }}</span>
    <button :disabled="busy || pagination.page >= pagination.totalPages" @click="$emit('change', pagination.page + 1)">Next →</button>
  </nav>
</template>
