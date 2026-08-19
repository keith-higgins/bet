# Double Chance

Mobile-first football betting challenge tracker.

## Run locally

```bash
npm install
npm install
npm run dev
```

The dashboard starts with empty challenge and match states until Supabase and a football provider are configured.

The frontend uses Nuxt 3, Vue 3, and JavaScript.

## Connect Supabase

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](./supabase/schema.sql).
3. Copy `.env.example` to `.env.local` and add the project URL and anon key.
4. Set `FOOTBALL_PROVIDER` and `FOOTBALL_PROVIDER_API_KEY` when a provider is selected.

The provider boundary is in [`lib/football/provider.js`](./lib/football/provider.js); polling can be called by a scheduled job through `POST /api/sync`.

Once the Supabase variables are present, the dashboard loads the latest round and saves bet legs to the database. Without them it remains local to the current session.

The `/login` page uses Supabase email/password authentication. Add your local URL (`http://localhost:3000`) to Supabase Auth → URL Configuration before testing sign-in.
