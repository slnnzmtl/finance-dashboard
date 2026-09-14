import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  ssr: false,
  devtools: { enabled: true },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    },
  },
  css: ['@/assets/main.css'],
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseKey: process.env.SUPABASE_KEY || '',
      allowedEmails: process.env.ALLOWED_EMAILS || '',
    },
  },
})
