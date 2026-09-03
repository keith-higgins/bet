# The Weekly Punt

The Weekly Punt is a mobile-first Premier League betting league for a group of friends. Each week has one assigned bettor, one accumulator bet, a deadline, and a shared record of results and profit/loss. The app uses a dark, native-app-style interface with a bottom tab bar (Home, Live, History, Table).

The app is built with Nuxt 3, Vue 3, JavaScript, Supabase, TheSportsDB, and cached Paddy Power odds.

## How the app works

### 1. Sign in and join the shared league

When Supabase is configured, users sign in with email and password through `/login`. The global auth middleware protects the app pages and redirects signed-out users to the login page.

The account page (behind the avatar in the top bar) lets a player update their display name, change their password, or log out. Admins see a "Manage league" link there through to `/admin`.

The `/invite/:token` route is a lightweight invite landing page. Authentication is still handled by Supabase; the token is not currently stored or validated by the application.

### 2. Navigation

The app shell is a sticky top bar plus a bottom tab bar (Home, Live, History, Table). The top bar always shows the current week's **title** — falling back to the previous week's title until a new week is created — with the week number and status (your turn, someone else's turn, or settled) underneath. A live-match pill appears in the top bar whenever a tracked match is in progress and links to Live.

Manage and the bet builder are pushed views reached from Account and Home respectively, with their own close (×) control, rather than tabs.

### 3. Create and manage weeks

A week contains:

- a sequential week number and title;
- an assigned bettor;
- a stake amount and deadline;
- an `in_progress` or `settled` status; and
- the bets and match selections recorded for that week.

Home's hero card reflects the current round: while a week is open it shows the assigned bettor and a countdown to the deadline; once the bet is settled the card recolors — lime for a win, coral/red for a loss — and shows the actual return in place of the deadline. Admins get a "Go to Manage" shortcut from the hero card once a week is settled, or when no week has been created yet.

`/admin` (Manage) can start the next week (title, stake, and bettor — title defaults to "Premier League week N" if left blank) and manage the player directory (add a player, edit a name/role/password). A "Advanced week tools" link opens `/challenges`, where any week — not just the latest — can be edited, deleted, or opened for bet editing and settlement.

Deleting a week also deletes its bets and selections through the database cascade. The action is intentionally confirmed in the UI because it cannot be undone.

### 4. Enter an accumulator

The bet builder (`/bet`) is a single scrolling screen, not a step-by-step wizard:

1. Set the stake with the stepper or a quick-pick chip (at least €1).
2. Add one or more accumulator legs. Each leg is a collapsible card; only one is open at a time.
3. The combined odds and potential return update live at the bottom, with a **Save bet** button.

For each leg, the player searches for a fixture. Fixture search defaults to cached Paddy Power odds (`/api/paddypower/search`) and can fall back to TheSportsDB fixtures (`/api/football/fixtures`) via a toggle. Once a fixture is chosen:

- **Own fixtures** (no live Paddy Power odds) offer eight fixed markets: Match result, Double chance, Both teams to score, Total goals, First team to score, Draw no bet, To win to nil, Correct score.
- **Paddy Power fixtures** can carry 60–100+ real markets. To keep that scannable, the picker groups them into category tabs — Match result, Goalscorer, Goals, Correct score, Handicap, Halves & segments, and Specials & other — computed by `lib/marketCategories.js` from the raw market name. Picking a category filters the market chips shown below it.

The UI converts fractional odds to decimal odds for storage. Combined odds are the product of each leg's decimal odds (shown to the player as a fraction, matching how each leg's own odds are shown), and potential return is calculated as:

```text
stake × combined odds
```

There is one bet per bettor per week. Saving again updates that bettor's existing bet for the week and replaces its selections. A bet can only be built or edited once a week actually exists — attempting to reach `/bet` without a current week (or without permission) redirects back to Home.

### 5. Follow scores and settle results

The Match centre (`/live`) shows every tracked match with its live score and the linked pick's status (on track, pending, upcoming, or lost); a compact preview of the top two also appears on Home. The browser checks eligible, started matches every two minutes through `/api/football/event/:id`. A match that is already finished is not polled again by that browser session.

Settlement is triggered from Home ("Settle this bet" / "Override settlement", shown once a bet has selections) or from the week manager at `/challenges`. Each selection is marked `pending`, `won`, or `lost`:

- any lost selection makes the accumulator `lost` and its return €0;
- all selections won makes the accumulator `won` and sets the return to `stake × combined odds`;
- unresolved selections keep the accumulator `pending`.

The scheduled sync endpoint can perform the same work centrally. Supported markets are evaluated from the final score. `First team to score` is intentionally not score-settled automatically because the stored match data does not include the scoring event; that selection must be resolved manually.

### 6. Review the league

`/league` shows the current leader in a hero card, followed by every player's record, profit, and a relative form bar. Home shows a top-three preview of the same list. `/history` lists every settled and pending week with total staked/returned/net figures, a result filter (all/won/lost/pending), and each week's individual legs on expand.

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

| Variable                        | Used by            | Purpose                                                                         |
| ------------------------------- | ------------------ | ------------------------------------------------------------------------------- |
| `NUXT_PUBLIC_SUPABASE_URL`      | Browser and server | Supabase project URL                                                            |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server | Public Supabase client key                                                      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server only        | Lists users, creates player accounts, and runs privileged sync/scrape writes    |
| `FOOTBALL_PROVIDER_API_KEY`     | Server only        | TheSportsDB API key; `123` is used when it is omitted                           |
| `SYNC_SECRET`                   | Server only        | Optional bearer token protecting `POST /api/sync`                               |
| `PADDY_POWER_PAGE_URL`          | Server only        | Optional override for a single Paddy Power page URL used by `lib/paddyPower.js` |

Do not expose `SUPABASE_SERVICE_ROLE_KEY` or `SYNC_SECRET` to the client. Nuxt exposes only the two `NUXT_PUBLIC_*` values through `runtimeConfig.public`.

Without the Supabase variables, the app opens in local preview mode. The dashboard uses in-memory state and bet changes are lost on refresh or between users/devices. Supabase is required for authentication, shared league data, player management, history, and persistent settlement.

## Supabase setup

1. Create a Supabase project.
2. For a new installation, run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor. For an existing installation, run the latest migration: [`supabase/migrations/20260902000000_add_admin_roles.sql`](./supabase/migrations/20260902000000_add_admin_roles.sql).
3. Add the project URL and keys to `.env.local`.
4. In Supabase Auth → URL Configuration, add `http://localhost:3000` as a local site URL before testing sign-in.
5. Create your first account, then promote it to admin in the Supabase SQL Editor:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'your-email@example.com');
   ```

6. Sign in again. Admins can then use Manage → Add a player and the user directory.

`supabase/reset.sql` is a destructive development reset. It drops the application tables and recreates them, but leaves Supabase Auth users intact. Run it only when the stored league data can be discarded.

### Data model

Supabase Auth is the source of truth for users. Application data is stored in these tables:

| Table              | Stores                                                                 |
| ------------------ | ---------------------------------------------------------------------- |
| `weeks`            | Weekly turn metadata, assigned bettor, stake, deadline, and status     |
| `bets`             | One bettor's accumulator for a week, combined odds, status, and return |
| `matches`          | Provider fixture identity, teams, scores, status, and kickoff data     |
| `bet_selections`   | Each bet leg, market, pick, odds, and result status                    |
| `match_sync_runs`  | The status and error history of server-side score syncs                |
| `paddy_power_odds` | One row per competition: the latest scraped fixtures and markets       |

Row-level security is enabled on all application tables. Authenticated users can view the shared league and manage their own bets. Only admins can create, edit, or delete weeks, edit another player's bet, view the full user directory, create accounts, or change roles. The assigned bettor can update a week's settlement status, but a database trigger prevents them from changing the week metadata.

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

## Paddy Power odds

Bet-builder fixture search is served primarily from cached Paddy Power odds rather than live requests, since Paddy Power's pages are scraped through a headless browser rather than a public API.

- [`scripts/scrapePaddyPower.mjs`](./scripts/scrapePaddyPower.mjs) launches a headless Chromium browser (via Playwright), fetches each supported competition page plus the full market list for every fixture, and upserts one row per competition into the `paddy_power_odds` table.
- [`.github/workflows/scrape-paddy-power.yml`](./.github/workflows/scrape-paddy-power.yml) runs that script hourly, routed through a VPN, since Paddy Power's odds pages are geo-restricted.
- [`lib/paddyPower.js`](./lib/paddyPower.js) holds the page URLs and the normalization from Paddy Power's raw event/market/runner payload into `{ id, name, home, away, startsAt, competition, markets }`.
- `GET /api/paddypower/search?q=...` (and the per-competition/per-event endpoints under `server/api/paddypower/`) read that cache — never Paddy Power directly — so fixture search in the bet builder stays fast and does not depend on Paddy Power being reachable at request time.
- [`lib/marketCategories.js`](./lib/marketCategories.js) buckets a fixture's raw Paddy Power markets (which can run to 60–100+ per match) into a handful of categories — Match result, Goalscorer, Goals, Correct score, Handicap, Halves & segments, Specials & other — by pattern-matching the market name. This only applies to Paddy Power fixtures; the app's own eight fixed markets are shown as a single flat list.
- Odds and picks selected from a Paddy Power market still go through the same fractional-odds storage and settlement path as manually entered legs. `lib/betting.js`'s `resolveMarketDatabaseValue` maps a handful of common Paddy Power market names (and goal-line/handicap patterns) onto the app's fixed settlement categories; anything else is stored as free text and settled manually.
- Paddy Power has no live scores of its own, so a leg built from a Paddy Power fixture is separately matched up against TheSportsDB — the provider that actually drives live tracking and score-based settlement. `resolveLiveTracking()` in [`components/bet/BetBuilderLeg.vue`](./components/bet/BetBuilderLeg.vue) runs right after a Paddy Power fixture is picked: it searches `/api/football/fixtures` by the home team, keeps only candidates within a 3-hour kickoff window, and confirms both team names with `teamNamesMatch()` in [`lib/teamAliases.js`](./lib/teamAliases.js) (which normalizes accents/casing and resolves common shorthand — "Man Utd", "Spurs", "PSG", etc. — through a small alias table before comparing). A match patches the leg's `matchId`/`provider` onto the TheSportsDB fixture; if nothing matches, the pick and odds are still saved, just without live tracking or auto-settlement for that leg.

To run the scrape locally:

```bash
NUXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/scrapePaddyPower.mjs
```

## Project structure

```text
app.vue                       Global shell selection for authenticated/public routes
app/globals.css                Design tokens (dark palette, type scale) and shared component styles
pages/                         Nuxt routes: home, bet builder, live, history, league, account, manage, invite
components/                    Shared layout, dashboard, bet, history, and management UI
composables/useDashboard.js    Shared (useState-backed) round/bet/leaderboard state and actions
composables/useChallengeData.js Supabase reads/writes for weeks, bets, and users
composables/useAppMeta.js      Shared top-bar title/week/status state, set by AppShell
composables/useLiveStatus.js   Shared live/upcoming match counts, set by LiveScoresCard
lib/betting.js                 Market definitions, pick options, and Paddy Power market-name mapping
lib/marketCategories.js        Groups Paddy Power markets into picker categories
lib/odds.js                    Fractional/decimal odds conversion and validation
lib/settlement.js              Score-based selection evaluation
lib/paddyPower.js              Paddy Power page URLs and payload normalization
lib/football/provider.js       TheSportsDB client and normalized fixture model
lib/supabase.js                Shared Supabase client creation
scripts/scrapePaddyPower.mjs   Scheduled Paddy Power scrape → `paddy_power_odds`
server/api/                    Server-only football, Paddy Power, admin, and sync endpoints
supabase/schema.sql            Application schema and RLS policies
supabase/migrations/           Incremental database migrations
supabase/reset.sql             Destructive development schema reset
public/                        PWA manifest, icon, and service worker
```

The app registers a small service worker on the client and includes a standalone PWA manifest, so it can be installed on supported mobile browsers. The service worker caches the root shell as a basic offline fallback; live data still requires network access.

## Notes for contributors

- `useDashboard()` (backed by `useState`) is the single shared source of truth for the current round, bet, and leaderboard data — Home, the top bar, Live, League, and Manage all read from the same instance. Anything that mutates week, bet, or player data through a different path (`/challenges`, `AdminUserList`, `PlayerInviteForm`) must also call `dashboard.loadDashboard()` afterwards, or those screens will keep showing stale data until a hard reload.
- Keep Supabase service-role operations in `server/api`; never import the service-role key into browser code.
- Keep provider-specific response handling inside `lib/football/provider.js` (TheSportsDB) and `lib/paddyPower.js` (Paddy Power) so the UI uses the normalized fixture shape either way.
- Keep market names in `lib/betting.js` and database values in sync with the check constraint in `supabase/schema.sql`.
- If a new market cannot be evaluated from the normalized match score, leave it for manual settlement until the provider data model supports it.
- New design tokens, type scale, and shared component classes live in `app/globals.css`; prefer extending that file's existing classes over hardcoding colors in a component's `<style>` block.
