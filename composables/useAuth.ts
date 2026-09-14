import type { Session, SupabaseClient } from '@supabase/supabase-js'
import {
  LOGIN_PATH,
  isAllowedEmail,
  parseAllowedEmails,
} from '~/utils/auth'

const NOT_ALLOWED_MESSAGE = 'This account is not allowed.'

function allowedEmailsFromConfig(): string[] {
  const config = useRuntimeConfig()
  return parseAllowedEmails(String(config.public.allowedEmails ?? ''))
}

async function getSupabase(): Promise<SupabaseClient> {
  const { useSupabase } = await import('~/composables/useSupabase')
  return useSupabase()
}

export function useAuth() {
  const error = ref<string | null>(null)

  async function ensureSession(): Promise<Session | null> {
    const supabase = await getSupabase()
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      error.value = sessionError.message
      return null
    }

    const session = data.session
    if (!session) return null

    if (!isAllowedEmail(session.user.email, allowedEmailsFromConfig())) {
      await supabase.auth.signOut()
      error.value = NOT_ALLOWED_MESSAGE
      return null
    }

    error.value = null
    return session
  }

  async function signIn(email: string, password: string): Promise<boolean> {
    error.value = null
    const supabase = await getSupabase()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      error.value = signInError.message
      return false
    }

    const session = data.session
    if (!session) {
      error.value = 'Sign in failed.'
      return false
    }

    if (!isAllowedEmail(session.user.email, allowedEmailsFromConfig())) {
      await supabase.auth.signOut()
      error.value = NOT_ALLOWED_MESSAGE
      return false
    }

    return true
  }

  async function signOut(): Promise<void> {
    error.value = null
    const supabase = await getSupabase()
    await supabase.auth.signOut()
    await navigateTo(LOGIN_PATH)
  }

  return {
    error,
    ensureSession,
    signIn,
    signOut,
  }
}
