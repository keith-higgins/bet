export default defineNuxtConfig({
  devtools: { enabled: false },
  css: ['~/app/globals.css'],
  runtimeConfig: {
    footballProviderApiKey: process.env.FOOTBALL_PROVIDER_API_KEY || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || ''
    }
  }
})
