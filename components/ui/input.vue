<script setup lang="ts">
const props = defineProps<{ modelValue?: string | number, type?: string, placeholder?: string, required?: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string | number | undefined): void }>()
</script>

<template>
  <input
    :type="props.type || 'text'"
    :value="props.modelValue"
    :placeholder="props.placeholder"
    :required="props.required"
    class="flex h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
