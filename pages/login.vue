<script setup lang="ts">
import Input from '@/components/ui/input.vue'
import Label from '@/components/ui/label.vue'
import Button from '@/components/ui/button.vue'
import { safeRedirect } from '~/utils/auth'

useHead({
  title: 'Sign in',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const route = useRoute()
const { error, signIn } = useAuth()

const email = ref('')
const password = ref('')
const submitting = ref(false)

async function onSubmit() {
  if (submitting.value) return

  submitting.value = true
  try {
    const ok = await signIn(email.value, password.value)
    if (ok) {
      await navigateTo(safeRedirect(route.query.redirect))
    }
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto py-10 px-4">
    <div class="max-w-sm space-y-6">
      <header class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">
            Sign in
          </h1>
          <p class="text-muted-foreground mt-2">
            Use your account to open restricted pages.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <form
        class="space-y-4"
        @submit.prevent="onSubmit"
      >
        <div class="space-y-2">
          <Label for-id="login-email">
            Email
          </Label>
          <Input
            id="login-email"
            v-model="email"
            type="email"
            placeholder="you@example.com"
            required
            autocomplete="email"
          />
        </div>

        <div class="space-y-2">
          <Label for-id="login-password">
            Password
          </Label>
          <Input
            id="login-password"
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
          />
        </div>

        <div
          v-if="error"
          class="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {{ error }}
        </div>

        <Button
          type="submit"
          :disabled="submitting"
        >
          {{ submitting ? 'Signing in…' : 'Sign in' }}
        </Button>
      </form>
    </div>
  </div>
</template>
