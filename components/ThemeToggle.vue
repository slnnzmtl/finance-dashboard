<script setup lang="ts">
import Button from '@/components/ui/button.vue'
import type { ThemePreference } from '~/composables/useTheme'

const { preference, cycleTheme } = useTheme()

const labels: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

const nextHint: Record<ThemePreference, string> = {
  light: 'Switch to dark theme',
  dark: 'Switch to system theme',
  system: 'Switch to light theme',
}
</script>

<template>
  <Button
    type="button"
    variant="outline"
    size="sm"
    class="min-w-[5.5rem]"
    :aria-label="nextHint[preference]"
    :title="nextHint[preference]"
    @click="cycleTheme"
  >
    {{ labels[preference] }}
  </Button>
</template>
