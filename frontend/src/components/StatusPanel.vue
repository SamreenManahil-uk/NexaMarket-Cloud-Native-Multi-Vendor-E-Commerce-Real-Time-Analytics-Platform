<script setup lang="ts">
defineProps<{
  title: string;
  message?: string;
  error?: boolean;
  retry?: boolean;
}>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <div class="status-panel" :role="error ? 'alert' : 'status'">
    <span class="status-icon" aria-hidden="true">{{ error ? "!" : "✦" }}</span>
    <h2>{{ title }}</h2>
    <p v-if="message">{{ message }}</p>
    <div class="status-actions">
      <button v-if="retry" class="button-primary" @click="$emit('retry')">
        Try again <span aria-hidden="true">↻</span></button
      ><slot />
    </div>
  </div>
</template>
