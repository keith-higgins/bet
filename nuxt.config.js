export default defineNuxtConfig({
  devtools: { enabled: false },
  modules: ['@nuxt/eslint'],
  eslint: { checker: false },
  css: ['~/app/globals.css'],
  components: [{ path: '~/components', pathPrefix: false }],
  app: {
    head: {
      title: 'The Weekly Punt',
      meta: [
        {
          name: 'description',
          content: 'A friendly weekly Premier League betting league for your group.'
        },
        {
          property: 'og:title',
          content: 'The Weekly Punt'
        },
        {
          property: 'og:description',
          content: 'A friendly weekly Premier League betting league for your group.'
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover'
        },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }
      ],
      link: [{ rel: 'manifest', href: '/manifest.webmanifest' }]
    }
  },
  runtimeConfig: {
    footballProviderApiKey: process.env.FOOTBALL_PROVIDER_API_KEY || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    syncSecret: process.env.SYNC_SECRET || '',
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || ''
    }
  }
})
