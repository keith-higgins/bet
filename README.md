# The Weekly Punt

The Weekly Punt is a mobile-first Premier League betting league for a group of friends. Each week has one assigned bettor, one accumulator bet, a deadline, and a shared record of results and profit/loss.

The app is built with Nuxt 3, Vue 3, JavaScript, Supabase, and TheSportsDB.

## How the app works

### 1. Sign in and join the shared league

When Supabase is configured, users sign in with email and password through `/login`. The global auth middleware protects the app pages and redirects signed-out users to the login page.

The account page lets a player update their display name, change their password, or log out. The Manage page can create another player account with a name, email address, and initial password.

The `/invite/:token` route is a lightweight invite landing page. Authentication is still handled by Supabase; the token is not currently stored or validated by the application.

### 2. Create and manage weeks

The dashboard shows the newest week. A week contains:

- a sequential week number and title;
- an assigned bettor;
- a stake amount and deadline;
- an `in_progress` or `settled` status; and
- the bets and match selections recorded for that week.

The dashboard can create the first week or start the next week. New weeks default to the next week number and normally rotate the assigned bettor to another user. `/admin` links to `/challenges`, where weeks can be created, edited, deleted, or opened for bet editing and settlement.

Deleting a week also deletes its bets and selections through the database cascade. The action is intentionally confirmed in the UI because it cannot be undone.

### 3. Enter an accumulator

The bet flow has four steps:

1. Choose a stake of at least €1.
2. Add one or more accumulator legs.
3. Review the selections, combined odds, and potential return.
4. Save the bet.

For each leg, the player searches for a fixture, chooses a market and pick, and enters fractional odds such as `1/2`. Fixture search is served by `/api/football/fixtures` and returns current-season events from the supported competitions.

Available markets are:

- Match result
- Double chance
- Both teams to score
- Total goals
- First team to score
- Draw no bet
- To win to nil
- Correct score

The UI converts fractional odds to decimal odds for storage. Combined odds are the product of each leg's decimal odds, and potential return is calculated as:

```text
stake × combined odds
```

There is one bet per bettor per week. Saving again updates that bettor's existing bet for the week and replaces its selections.

### 4. Follow scores and settle results

Saved provider-linked selections appear in the dashboard's Match Centre. The browser checks eligible, started matches every two minutes through `/api/football/event/:id`. A match that is already finished is not polled again by that browser session.

Settlement can be performed manually from the dashboard or week manager. Each selection is marked `pending`, `won`, or `lost`:

- any lost selection makes the accumulator `lost` and its return €0;
- all selections won makes the accumulator `won` and sets the return to `stake × combined odds`;
- unresolved selections keep the accumulator `pending`.

The scheduled sync endpoint can perform the same work centrally. Supported markets are evaluated from the final score. `First team to score` is intentionally not score-settled automatically because the stored match data does not include the scoring event; that selection must be resolved manually.

### 5. Review the league

The overview calculates total profit/loss, best settled week profit, the current bettor, and a leaderboard. `/history` lists all weeks, bets, selections, statuses, stakes, and returns.

## Local development

### Prerequisites

- Node.js and npm
- A Supabase project for shared, persistent data

Install dependencies and start the Nuxt development server:

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000` by default.

Useful commands:

```bash
npm run build         # Create a production build
npm run preview       # Preview the production build
npm run lint          # Prepare Nuxt and run ESLint
npm run lint:fix      # Fix ESLint issues where possible
npm run format:check  # Check Prettier formatting
npm run format        # Format the project
```

### Environment variables

There is no committed `.env.example` file. Create `.env.local` in the project root:

```dotenv
NUXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
FOOTBALL_PROVIDER_API_KEY=123
SYNC_SECRET=choose-a-long-random-secret
```

The variables are used as follows:

| Variable                        | Used by            | Purpose                                                               |
| ------------------------------- | ------------------ | --------------------------------------------------------------------- |
| `NUXT_PUBLIC_SUPABASE_URL`      | Browser and server | Supabase project URL                                                  |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server | Public Supabase client key                                            |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server only        | Lists users, creates player accounts, and runs privileged sync writes |
| `FOOTBALL_PROVIDER_API_KEY`     | Server only        | TheSportsDB API key; `123` is used when it is omitted                 |
| `SYNC_SECRET`                   | Server only        | Optional bearer token protecting `POST /api/sync`                     |

Do not expose `SUPABASE_SERVICE_ROLE_KEY` or `SYNC_SECRET` to the client. Nuxt exposes only the two `NUXT_PUBLIC_*` values through `runtimeConfig.public`.

Without the Supabase variables, the app opens in local preview mode. The dashboard uses in-memory state and bet changes are lost on refresh or between users/devices. Supabase is required for authentication, shared league data, player management, history, and persistent settlement.

## Supabase setup

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql).
3. Add the project URL and keys to `.env.local`.
4. In Supabase Auth → URL Configuration, add `http://localhost:3000` as a local site URL before testing sign-in.
5. Start the app and create the first account, or use Manage → Add a player.

`supabase/reset.sql` is a destructive development reset. It drops the application tables and recreates them, but leaves Supabase Auth users intact. Run it only when the stored league data can be discarded.

### Data model

Supabase Auth is the source of truth for users. Application data is stored in these tables:

| Table             | Stores                                                                 |
| ----------------- | ---------------------------------------------------------------------- |
| `weeks`           | Weekly turn metadata, assigned bettor, stake, deadline, and status     |
| `bets`            | One bettor's accumulator for a week, combined odds, status, and return |
| `matches`         | Provider fixture identity, teams, scores, status, and kickoff data     |
| `bet_selections`  | Each bet leg, market, pick, odds, and result status                    |
| `match_sync_runs` | The status and error history of server-side score syncs                |

Row-level security is enabled on all application tables. The current policies allow any authenticated user to manage all application rows; `/admin` is a shared management screen, not a role-protected administrator area.

## Football data and score sync

The provider boundary is [`lib/football/provider.js`](./lib/football/provider.js). The current implementation uses TheSportsDB and supports English Premier League, La Liga, Bundesliga, Serie A, Ligue 1, and UEFA Champions League fixture searches.

The server endpoints are:

| Method and path                    | Purpose                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `GET /api/football/fixtures?q=...` | Search cached current-season fixtures, with provider fallback searches  |
| `GET /api/football/event/:id`      | Load one provider event and normalize it for the app                    |
| `POST /api/sync`                   | Fetch tracked matches, persist scores, and settle resolvable selections |
| `GET /api/admin/users`             | Return the Supabase user directory for signed-in users                  |
| `POST /api/admin/invite`           | Create a confirmed Supabase user with an initial password               |

For a scheduled sync, call the endpoint from a cron job or deployment scheduler:

```bash
curl -X POST \
  -H "Authorization: Bearer $SYNC_SECRET" \
  https://your-app.example.com/api/sync
```

To sync only particular TheSportsDB event IDs, pass them as a comma-separated query parameter:

```bash
curl -X POST \
  -H "Authorization: Bearer $SYNC_SECRET" \
  "https://your-app.example.com/api/sync?ids=12345,67890"
```

When `SYNC_SECRET` is empty, the endpoint does not require authorization. When it is set, the request must contain the matching bearer token. When no `ids` are supplied, the sync reads all TheSportsDB match IDs currently stored in `matches`.

## Project structure

```text
app.vue                    Global shell selection for authenticated/public routes
pages/                     Nuxt routes: overview, login, history, account, manage, invite
components/                Shared layout, dashboard, bet, history, and management UI
composables/                Dashboard, database, player, and live-score state/actions
lib/betting.js             Market definitions and pick options
lib/odds.js                Fractional/decimal odds conversion and validation
lib/settlement.js          Score-based selection evaluation
lib/football/provider.js   TheSportsDB client and normalized fixture model
lib/supabase.js            Shared Supabase client creation
server/api/                Server-only football, admin, and sync endpoints
supabase/schema.sql        Application schema and RLS policies
supabase/reset.sql         Destructive development schema reset
public/                    PWA manifest, icon, and service worker
```

The app registers a small service worker on the client and includes a standalone PWA manifest, so it can be installed on supported mobile browsers. The service worker caches the root shell as a basic offline fallback; live data still requires network access.

## Notes for contributors

- Keep Supabase service-role operations in `server/api`; never import the service-role key into browser code.
- Keep provider-specific response handling inside `lib/football/provider.js` so the UI uses the normalized fixture shape.
- Keep market names in `lib/betting.js` and database values in sync with the check constraint in `supabase/schema.sql`.
- If a new market cannot be evaluated from the normalized match score, leave it for manual settlement until the provider data model supports it.
