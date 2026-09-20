import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  ssr: false,
  devtools: { enabled: true },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
      script: [
        {
          // Avoid light flash before Vue hydrates; keep key in sync with useTheme.
          innerHTML:
            '(function(){try{var t=localStorage.getItem(\'finance-theme\');var d;if(t===\'light\')d=false;else if(t===\'dark\'||!t)d=true;else d=window.matchMedia(\'(prefers-color-scheme: dark)\').matches;document.documentElement.classList.toggle(\'dark\',d);document.documentElement.style.colorScheme=d?\'dark\':\'light\';}catch(e){document.documentElement.classList.add(\'dark\');document.documentElement.style.colorScheme=\'dark\';}})();',
          type: 'text/javascript',
        },
      ],
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
