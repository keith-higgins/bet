# Handoff: The Weekly Punt — mobile redesign

## Overview

A bold visual and structural redesign of The Weekly Punt (Nuxt 3 / Vue 3 / Supabase Premier
League betting league) for mobile web. Covers all eight existing views: login, dashboard,
bet entry, match centre, history, league table, account, and manage.

The redesign changes three things beyond styling:

1. **Navigation** — from a 3-item bottom nav (Home / Manage / Account) to a 4-tab nav
   (Home / Live / History / Table). Account moves to the top-bar avatar; Manage moves
   behind Account (admins only).
2. **Bet entry** — from a 4-step modal wizard (`BetEntryFlow.vue`) to a single scrolling
   screen with an inline, expand-in-place leg builder and a pinned odds/return footer.
3. **Dashboard hierarchy** — two options are included (see "Dashboard variants" below).
   Pick one before implementing.

## About the design files

The files in this bundle are **design references created in HTML** — a prototype showing
intended look and behaviour, not production code to copy. The task is to **recreate these
designs inside the existing Nuxt 3 / Vue 3 codebase**, using its established patterns:
`app/globals.css` for shared styles, `components/**` for UI, `composables/**` for state,
`pages/**` for routes. Do not port the prototype's inline styles verbatim — translate them
into the project's CSS conventions (see "Design tokens" for the replacement `:root` block).

`Weekly Punt Mobile.dc.html` opens directly in a browser. `ios-frame.jsx` is only the phone
bezel used for presentation — it has no production equivalent and should not be recreated.

## Fidelity

**High-fidelity.** Colours, typography, spacing, radii and interaction states are final.
Recreate pixel-perfectly. All copy in the prototype is final copy.

Layout is authored for a 402 px-wide viewport. Everything is a single column; there is no
tablet or desktop layout in this handoff. Keep the existing desktop sidebar layout
(`AppSidebar.vue`) untouched, or treat desktop as a follow-up.

## Design tokens

Replace the current `:root` block in `app/globals.css` with:

```css
:root {
  /* surfaces */
  --bg:            #0C0E12;  /* page background */
  --surface:       #14171E;  /* cards */
  --surface-2:     #171B23;  /* raised / highlighted rows, footers */
  --surface-3:     #1A1E26;  /* inputs, stepper buttons */
  --surface-4:     #1F242E;  /* chips, avatars, progress track */
  --line:          #1F242E;  /* card borders */
  --line-2:        #262B36;  /* control borders */
  --line-3:        #2C323E;  /* focused/active control borders */
  --line-dash:     #2E3542;  /* dashed "add" buttons */
  --divider:       #1B1F27;  /* row dividers, chrome borders */

  /* ink */
  --ink:           #F4F6F8;
  --ink-2:         #A9B2C0;  /* secondary body */
  --muted:         #7B8493;  /* meta under a title */
  --muted-2:       #6F7887;  /* mono overlines, inactive nav */
  --placeholder:   #5C6472;

  /* accents */
  --lime:          #C6F24E;  /* primary action, wins, profit */
  --lime-ink:      #10140C;  /* ink on lime */
  --lime-tint:     #1B2413;  /* won pill bg */
  --coral:         #FF7A5C;  /* losses, destructive */
  --coral-ink:     #FF9179;  /* coral text on dark */
  --coral-tint:    #1E1618;  /* lost/destructive bg */
  --coral-line:    #3A2A2C;
  --amber:         #F2C14E;  /* pending */
  --amber-tint:    #241E10;
}
```

Radii: `999px` pills · `22px` hero cards · `20px` section cards · `18px` list cards ·
`16px` stat tiles / small rows · `14px` buttons and inputs · `12px` nested inputs ·
`11px`/`9px` small square badges · `50%` avatars.

Spacing: screen padding `20px`; card padding `22px` (hero) / `18px` (section) / `14–16px`
(rows); gap between sections `26px`; gap between cards in a list `8–10px`; grid gaps `8px`.

Type scale (all three families load from Google Fonts):

| Role | Font | Size / weight | Tracking |
| --- | --- | --- | --- |
| Hero headline (login) | Archivo 800 | 42px / 0.98 | -1.6px |
| Hero card headline | Archivo 800 | 30px / 1.02 | -1.2px |
| Screen title | Archivo 800 | 26px | -1.0px |
| Big money figure | Archivo 800 | 52px / 0.9 | -2.4px |
| Section heading | Archivo 700 | 17px | -0.5px |
| Card figure | Archivo 700 | 17–22px | -0.5 to -0.8px |
| Body / row title | Instrument Sans 500 | 13.5–14.5px | — |
| Body secondary | Instrument Sans 400 | 11–12.5px | — |
| Overline / meta / odds | DM Mono 400 | 9–11px, uppercase | 0.6–1.6px |

Font link:

```html
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Instrument+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

Archivo replaces Space Grotesk, Instrument Sans replaces DM Sans, DM Mono is retained.
Odds, scores, money and all overlines use DM Mono for tabular figures.

## App chrome

**Top bar** — `position: sticky; top: 0; z-index: 30`, `padding: 58px 20px 12px`
(the 58px clears the mobile status bar; use `env(safe-area-inset-top)` in production),
`background: rgba(12,14,18,0.82)`, `backdrop-filter: blur(18px)`,
`border-bottom: 1px solid var(--divider)`. Contents, left to right:

- 20px lime circle (brand mark).
- Title block: page title (Archivo 700 / 15px / -0.4px) over a DM Mono 9.5px meta line
  (`white-space: nowrap; text-overflow: ellipsis` — it must never wrap). Title/meta per
  route: Week 14 / `YOUR TURN · WEEK 14`; Match centre / `2 LIVE · 2 UPCOMING`;
  History / `14 WEEKS RECORDED`; League table / `5 PLAYERS`; Account / `DARA MULLEN`;
  Manage / `ADMIN TOOLS`. Derive these from real data.
- Live pill — `32px` tall, `999px` radius, `#1E1618` on `#3A2A2C` border, coral text,
  6px coral dot with `box-shadow: 0 0 0 3px rgba(255,122,92,0.18)`. Label `N LIVE`.
  Hidden when no match is in progress. Navigates to the match centre.
- Avatar — 32px circle, `#2A2F3A`, DM Mono initials. Navigates to `/account`.

**Bottom nav** — `position: sticky; bottom: 0`, `padding: 10px 16px 40px` (bottom padding
is the home-indicator safe area), same blurred background, `border-top: 1px solid var(--divider)`,
`display: grid; grid-template-columns: repeat(4, 1fr)`. Each tab is a 52px-min-height
button: an 18px geometric glyph drawn with `border: 2px solid currentColor` over a DM Mono
9.5px uppercase label. Active tab is `--lime`, inactive `--muted-2`. Tabs: HOME, LIVE,
HISTORY, TABLE. The nav is hidden on the login screen.

The `bet` and `manage` screens are pushed views (× close button top-right) rather than tabs.

## Screens

### 1. Login — replaces `pages/login.vue`

Purpose: email/password sign-in via Supabase (unchanged behaviour).

Layout: single column, `padding: 96px 26px 48px`, `flex-direction: column`.

- Brand lockup: 26px lime circle + `the weekly punt` (Archivo 800 / 17px / -0.5px, lowercase).
  `margin-bottom: 64px`.
- Overline `PRIVATE LEAGUE · 5 PLAYERS` (DM Mono 10px, `letter-spacing: 2px`, `--muted-2`).
- Headline `One bettor. / One bet. / Every week.` — Archivo 800 / 42px / line-height 0.98 /
  -1.6px, hard line breaks after each sentence.
- Sub-copy: "Sign in to see whose turn it is and how badly it's going." 15px, `--muted-2`,
  line-height 1.5, `text-wrap: pretty`. `margin-bottom: 40px`.
- Two fields, `gap: 12px`. Label above input in DM Mono 10px uppercase `--muted-2`
  (`EMAIL`, `PASSWORD`). Input: full width, `min-height: 54px`, `padding: 0 16px`,
  `border: 1px solid var(--line-2)`, `radius: 14px`, `background: var(--surface)`,
  `font-size: 16px` (prevents iOS zoom), `outline: none`; on focus `border-color: var(--lime)`.
  Placeholders: `you@example.com`, `At least 6 characters`.
- Primary button: full width, `min-height: 56px`, `radius: 14px`, `background: var(--lime)`,
  `color: var(--lime-ink)`, Archivo 700 / 16px. Label `Log in`. `:active { transform: scale(0.985) }`.
- Text button `Need an account? Create one` — 13px, `--muted-2`, 8px padding.
- Footer, pushed down by a `flex: 1` spacer: 6px lime dot +
  `SHARED LEAGUE · PREMIER LEAGUE 25/26` in DM Mono 10px `#5C6472`.
- Error and success messages keep the existing `.auth-error` / `.auth-success` roles;
  render them above the button in coral / lime at 12px.

### 2. Dashboard — replaces `pages/index.vue` + `components/dashboard/*`

Two variants are built. **Variant A ("Turn first") is the chosen direction — build that one.**
Variant B is documented only as a record of the alternative. Both use `padding: 20px 20px 26px`
and `display: grid; gap: 26px`.

#### Variant A — "Turn first" (BUILD THIS)

Blocks in order:

1. **Turn hero** — `radius: 22px`, `padding: 22px`,
   `background: linear-gradient(165deg, #C6F24E 0%, #A9DC33 100%)`, ink `#10140C`.
   Top row: overline `WEEK 14 · YOUR TURN` (DM Mono 10px, `opacity: .62`) and a countdown
   pill `2d 04h LEFT` (DM Mono 10px, `background: rgba(16,20,12,0.14)`, `radius: 999px`,
   `padding: 5px 9px`). Headline `You're on the hook` (Archivo 800 / 30px / -1.2px).
   Optional banter line below (see "Copy tone"). Then a stat row separated by
   `border-top: 1px solid rgba(16,20,12,0.16)`: STAKE / `€20.00` and DEADLINE / `Sat 12:30`,
   split by a 1px × 34px divider. Then a full-width dark button
   (`background: #10140C`, `color: var(--lime)`, `min-height: 52px`, `radius: 14px`,
   Archivo 700 / 15px) labelled `Edit the acca →` (or `Build the acca →` when no bet exists).
   When it is *not* the current user's turn, show the assigned bettor's name and drop the
   button — mirror `canManageCurrentBet` from `useDashboard.js`.
2. **Your record** — `radius: 22px` card on `--surface`, `padding: 20px`. This is the second
   thing on the screen; the player's own record is deliberately prominent.
   Overline `YOUR RECORD · 13 SETTLED`. Then a baseline-aligned row: the record at
   Archivo 800 / 46px / line-height 0.88 / -2px (`4–3`, en dash) with a two-line DM Mono
   9.5px `WON / LOST` key beside it, and on the right NET PROFIT over the signed figure at
   Archivo 800 / 26px in lime (coral when negative). Below that the form strip: eight
   `flex: 1`, 30px-tall, `radius: 5px` bars, `gap: 5px` — lime for a won week, `#3A2A2C` for
   lost, `--surface-4` for pending, oldest → newest. Footer row above a
   `border-top: 1px solid var(--line)`: BEST WEEK / STAKED / TABLE (`2nd of 5`), each a
   DM Mono 9.5px label over Archivo 700 / 17px. Maps to `personalRecord`,
   `personalProfitLoss`, `personalBestReturn` and the player's index in `leaders`.
3. **Your accumulator** — section heading `Your accumulator` + `4 LEGS` right-aligned
   (DM Mono 10px). Card `radius: 20px`, `background: var(--surface)`,
   `border: 1px solid var(--line)`, `overflow: hidden`. One row per leg:
   8px status dot (lime won / coral lost / amber pending), match name (13.5px/500),
   `market · pick` meta (11.5px `--muted`), fractional odds right-aligned in DM Mono 12px
   lime. Rows divided by `1px solid var(--divider)`. Footer strip
   (`background: var(--surface-2)`, `padding: 16px`): COMBINED ODDS `7.80` on the left,
   POTENTIAL RETURN in lime on the right, both Archivo 700 / 19px.
4. **Match centre** — heading + `All matches →` text link (12px lime). Up to two rows:
   `border-left: 3px solid <status colour>`, `radius: 16px`, match name over a DM Mono 10px
   state line (`67' · SECOND HALF`, `STARTS 17:30 · TODAY`), score right-aligned in
   Archivo 700 / 20px (`2 – 1`, or `—` before kickoff). Hidden when there are no tracked
   matches, matching `LiveScoresCard.vue`.
5. **League preview** — heading + `Full table →`. Top three rows: rank (DM Mono 11px),
   30px avatar (leader is lime on `#10140C`, current user `#2A2F3A`, others `--surface-4`),
   name, record, profit right-aligned in Archivo 700 / 14px, lime when ≥ 0 else coral.

#### Variant B — "Money first"

1. **Season hero** — `radius: 22px` card on `--surface`. Overline
   `YOUR SEASON · 13 SETTLED`, then the net figure at Archivo 800 / 52px / -2.4px in lime
   (coral when negative) with a DM Mono `NET` label baseline-aligned beside it. Optional
   banter line. Then a form strip: eight `flex: 1`, 34px-tall, `radius: 5px` bars, `gap: 5px`
   — lime for a won week, `#3A2A2C` for lost, `--surface-4` for pending, oldest → newest.
   Footer row split by `border-top`: STAKED / RETURNED / BEST, Archivo 700 / 17px.
2. **The table** — full five-row leaderboard, each row a `radius: 16px` card
   (current user's row uses `--surface-2`): rank, 32px avatar, name over
   `record · note` (DM Mono 10px), profit right-aligned, plus a 4px progress track
   (`--surface-4`) whose fill is `abs(profit) / max(abs(profit))` in the row's profit colour.
3. **Turn strip** — lime card, `radius: 20px`, `padding: 18px`, horizontal: overline
   `WEEK 14 · YOUR TURN`, `4 legs · €156.00 up` (Archivo 800 / 19px), `Deadline Sat 12:30`,
   and a compact dark `Edit` button on the right.
4. **Live now** — same two rows as variant A.

### 3. Bet builder — replaces `components/bet/BetEntryFlow.vue` + `BetLegEditor.vue`

Purpose: one scrolling screen, no wizard. `padding: 18px 20px 26px`.

- Header: overline `WEEK 14 · ONE ACCA PER ROUND`, title `Build your acca`
  (Archivo 800 / 26px), and a 36px circular × button (`border: 1px solid var(--line-2)`,
  `background: #15181F`) that returns to the dashboard.
- **Stake card** (`radius: 20px`, `padding: 18px`): overline `STAKE`; a row of
  `−` / value / `＋` where the buttons are 48×48, `radius: 14px`, `background: var(--surface-3)`,
  `border: 1px solid var(--line-2)`, and the value is Archivo 800 / 34px / -1.4px centred;
  below it three quick chips `€10 / €20 / €50`, `flex: 1`, `min-height: 40px`, `radius: 999px`.
  Step is €5; floor is €1 (the existing "at least €1" rule). Selected chip = lime fill with
  `--lime-ink`; unselected = `--surface-3` on `--line-3` with `--ink-2` text.
- **Legs** — heading `Legs` + `TAP TO EDIT`. Each leg is a `radius: 18px` card on
  `--surface`; border is `--line` collapsed, `--line-dash` expanded. Collapsed summary row
  (`padding: 14px 15px`): 26px `radius: 9px` index badge, match name over `market · pick`
  meta, fractional odds in lime. Tapping toggles expansion; only one leg is open at a time.
  Expanded body (`border-top: 1px solid var(--line)`, `padding: 4px 15px 16px`) in order:
  - `FIXTURE` — text input, `min-height: 48px`, `radius: 12px`, `background: var(--surface-3)`,
    placeholder `Match, e.g. Arsenal v Chelsea`. Wire to the existing debounced
    `/api/football/fixtures` and `/api/paddypower/search` calls with the same 250 ms debounce
    and 2-character minimum.
  - Suggestion rows (`gap: 6px`): `radius: 12px` on `--surface-2`, label left (12.5px),
    `COMPETITION · DD MMM HH:MM` right in DM Mono 10px `--muted`. Keep the existing
    "Can't find it? Search all fixtures instead" source toggle as a 12px underlined
    `--muted` text button beneath the list.
  - `MARKET` — wrapping row of chip **buttons**, `gap: 7px`, `min-height: 36px`,
    `radius: 999px`, `padding: 0 13px`, 12.5px. One chip per entry in `BET_MARKETS` (all
    eight labels), or the Paddy Power market names when a PP fixture is selected. Chips
    replace the old `<select>`. Selecting a market resets the pick to the first option for
    that market (matching `updateMarket`, which clears `pick`, and clears `odds` for PP legs).
  - `PICK` — same chip-button treatment, options from `getMarketPickOptions(leg)`.
  - Odds row: `FRACTIONAL ODDS` input (DM Mono 16px, placeholder `1/2`), a read-only
    decimal readout chip (`background: var(--surface-4)`, lime DM Mono 13px) fed by
    `fractionalToDecimal`, and a `Remove` button (coral on `--coral-tint`, `--coral-line`
    border). Hide Remove when only one leg remains.
  - Validation reuses `isValidFractionalOdds`; show the existing error copy inline in coral
    under the offending field rather than at the footer.
- `＋ Add another leg` — full width, `min-height: 52px`, `1px dashed var(--line-dash)`,
  `radius: 16px`, lime 13.5px label. Adds a leg and opens it.
- **Summary footer** — `radius: 20px` card on `--surface-2`, `border: 1px solid #232833`.
  COMBINED ODDS (Archivo 700 / 22px) left, POTENTIAL RETURN (Archivo 800 / 26px, lime)
  right, then a full-width lime `Save bet` button (`min-height: 54px`). Combined odds is
  the product of each leg's decimal odds; return is `stake × combined odds` — unchanged.

### 4. Match centre — replaces `components/dashboard/LiveScoresCard.vue`, promoted to its own route

`padding: 20px 20px 26px`. Overline `MATCH CENTRE · REFRESHES EVERY 2 MINS`, title
`Live scores`.

- **Acca status card** — `radius: 18px` on `--surface-2`: overline `ACCA STATUS`,
  `2 landed · 2 to go` (Archivo 700 / 18px), and one 10 × 34px `radius: 5px` pip per leg on
  the right, coloured by leg status.
- **Match cards** — `radius: 18px`, `border-left: 3px solid <status colour>`, `padding: 16px`.
  Match name (14.5px/500) over a DM Mono 10px state line; score right-aligned in
  Archivo 800 / 26px. Divider, then the user's pick (12.5px `--ink-2`) and a status pill:
  `ON TRACK` lime on `--lime-tint`, `PENDING` amber on `--amber-tint`, `UPCOMING`
  `--muted-2` on `--surface-3`, plus `LOST` coral on `--coral-tint`. State strings come
  from the existing `fixtureStatus` / `kickoff` helpers; keep the 2-minute polling and the
  "don't re-poll finished matches" rule.

### 5. History — replaces `pages/history.vue` + `components/history/HistoryList.vue`

`padding: 20px 20px 26px`. Overline `14 WEEKS · EVERY SELECTION`, title `History`.

- **Summary tiles** — 2×2 grid, `gap: 8px`, `radius: 16px`, `padding: 15px`. SETTLED BETS
  (figure + `6 won · 7 lost`), TOTAL STAKED, RETURNED, NET RESULT. The net tile is
  emphasised: `background: #171D12`, `border: 1px solid #2E3A22`, lime figure, `#91A76B`
  labels — flip to the coral equivalents (`#1E1618` / `#3A2A2C` / `--coral`) when negative.
  Figures are Archivo 700 / 22px / -0.8px.
- **Filter chips** — one row of four `flex: 1` pills: All / Won / Lost / Pending. Same chip
  styling as the bet builder. These replace the three `<select>` controls; keep the player
  filter and sort as a secondary control if needed, but it is out of scope here.
- **Week cards** — `radius: 18px` on `--surface`, collapsed by default (newest week open).
  Row: 34px `radius: 11px` week badge (`W13`), bettor name over
  `date · €20.00 stake · N legs`, and a right block with the signed net result
  (Archivo 700 / 15px, lime/coral) over a DM Mono 9.5px status (`WON` / `LOST` /
  `AWAITING RESULT`). Expanded body sits on `#101319` with a top border: one row per
  selection — 22px circular index, `match` over `market · pick · score`, and the leg status
  in DM Mono 10px, coloured by status.

### 6. League table — new route, replaces `components/dashboard/LeaderboardCard.vue`

`padding: 20px 20px 26px`. Overline `THE SCOREBOARD · SINCE AUGUST`, title `League table`.

- **Leader card** — `radius: 22px`, `background: linear-gradient(165deg, #1D232E 0%, #14171E 100%)`,
  `border: 1px solid #262D3A`. Overline `CURRENT LEADER`, then a 52px lime avatar, name
  (Archivo 700 / 20px), `5 – 2 · 3 WEEKS ON TOP` (DM Mono 11px), and profit at
  Archivo 800 / 24px in lime. Optional banter line beneath.
- **Rows** — the five-row list described in dashboard variant B, at 32px avatars and
  14px names. Footer note: "Profit is returns minus stakes on settled bets." (12px,
  `--muted-2`, centred). Ordering and the record string come straight from the existing
  `leaders` computed in `useDashboard.js`.

### 7. Account — replaces `pages/account.vue` + `components/account/AccountForm.vue`

`padding: 20px 20px 26px`.

- Profile header: 56px avatar (`#2A2F3A`, Archivo 700 / 16px initials), name
  (Archivo 700 / 21px / -0.7px), `email · ROLE` in DM Mono 10.5px `--muted`.
- Settings card (`radius: 20px`, `padding: 18px`, `gap: 14px`): overline
  `ACCOUNT SETTINGS`, then Display name / New password / Confirm password. Labels are
  12px `--ink-2` above 50px-tall inputs (`radius: 12px`, `--surface-3`, focus border lime).
  Placeholders `Leave blank to keep current`, `Repeat new password`. Full-width lime
  `Save account` button. Existing validation (names required, ≥ 6 characters, passwords
  must match) and the `PATCH /api/account` call are unchanged.
- Admin link card — only for `isAdmin`. Full-width `radius: 20px` button on `--surface`:
  overline `ADMIN`, `Manage league` (Archivo 700 / 16px), "Players, roles and weekly turns"
  (12px `--muted`), lime `→` on the right.
- `Log out` — full width, `min-height: 52px`, coral text on `--coral-tint`, `--coral-line`
  border.

### 8. Manage — replaces `pages/admin.vue` + `components/admin/*`

`padding: 20px 20px 26px`. Header `LEAGUE MANAGEMENT` / `Manage` with a 36px × button back
to Account.

- **Start next week card** — overline `START NEXT WEEK`, a two-up row of `Stake (€)`
  (DM Mono input) and `Bettor` (`<select>`, 50px tall, `--surface-3`, `radius: 12px`),
  then a full-width lime `Create week 15` button. Defaults follow the existing
  `nextBettorId` rotation and the `week + 1` / €20 / +7 days defaults in `addNewWeek`.
- **Players** — heading `Players` + `5 ACCOUNTS`. One `radius: 16px` row per user: 32px
  avatar (lime for admins), name over email, and a role pill (`ADMIN` lime on `--lime-tint`,
  `PLAYER` `--muted-2` on `--surface-3`). Tapping a row should open the existing per-user
  edit fields (display name / role / new password) — the prototype shows the collapsed
  state only; reuse `AdminUserList.vue`'s `PATCH /api/admin/users/:id` behaviour in an
  expanded body styled like the History week card.
- `＋ Add a player` — dashed full-width button, opens the existing `PlayerInviteForm`
  fields (name / email / initial password).
- `AdminPaddyPowerTester` is not restyled in this pass; keep it below, or move it behind a
  collapsed "Diagnostics" row.

## Interactions & behaviour

- Navigation is instant, no transitions. Tabs swap the content region; `bet` and `manage`
  are pushed views with a × that returns to the previous screen.
- Every button gets `:active { transform: scale(0.985) }`; primary buttons only.
  No hover states are designed (touch-first) — keep hovers subtle on desktop.
- Accordions (bet legs, history weeks) are single-open. Opening one closes the others.
- Inputs are `font-size: 16px` minimum to prevent iOS zoom; every tappable target is
  ≥ 44px tall.
- Sticky chrome uses `backdrop-filter: blur(18px)`; provide a solid `#0C0E12` fallback.
- Scroll containers should hide their scrollbars (`scrollbar-width: none` +
  `::-webkit-scrollbar { width: 0 }`).
- Loading: keep `LoadingSpinner`, restyled — lime 2px ring on `--surface-4`, mono label in
  `--muted-2`.
- Toast (`ToastMessage.vue`): `--surface-2` background, 1px `--line-3` border, `radius: 14px`,
  13px ink, positioned above the bottom nav (`bottom: 96px`), auto-dismiss after 3.5 s
  as today.
- Empty states: mono overline + Archivo 700 headline + `--muted` line + one lime action.
  Existing copy is fine ("No history yet", "No players yet", etc.).

## State management

No new state. The prototype's local state maps to existing composables:

| Prototype state | Production source |
| --- | --- |
| `screen` | Nuxt route (`/`, `/bet`, `/live`, `/history`, `/league`, `/account`, `/admin`) |
| `stake` | `useDashboard().stake` |
| `openLeg` | local `ref` in the bet screen |
| `openWeek` | local `ref` in `HistoryList` |
| `filter` | `statusFilter` in `HistoryList` |
| `market` / `pick` | per-leg fields in `draftLegs` |

Two routes are new: the match centre and the league table. Both read data that
`useDashboard`/`useChallengeData` already return (`trackedMatches`, `leaders`) — no new
endpoints, and `useLiveScores` moves with the match centre.

## Copy tone

Light banter, one line per screen, always secondary to the data. **The banter lines are
currently switched OFF** — build without them, and treat the copy below as an optional
follow-up (per-user preference) rather than part of this pass:

- Dashboard turn hero: "Fintan's four ahead. Do something about it."
- Dashboard money hero: "Second place. Which is first place among the honest."
- League leader card: "Still hasn't stood a round. Noted."

Everything else is plain and functional. Sample names, figures and fixtures in the
prototype are placeholders — Dara Mullen (the signed-in user), Fintan Doyle, Oisín Byrne,
Marty Kane, Sean Cullen; week 14; €20 stakes.

## Assets

None. There are no images or icon fonts. The brand mark is a plain lime circle; the four
bottom-nav glyphs are `<span>`s shaped with `border`, `border-radius` and `box-shadow` in
`currentColor`. The existing `public/icon.svg` and PWA manifest still apply — update the
manifest `theme_color` / `background_color` to `#0C0E12`.

## Files

- `Weekly Punt Mobile.dc.html` — the full eight-screen prototype. Open it in a browser and
  tap through. The dashboard variant and banter toggle are props on the root component
  (`homeVariant`, `showBanter`) declared in the `data-props` JSON near the bottom of the file;
  edit their `default` values to switch what renders.
- `ios-frame.jsx` — presentation-only phone bezel. Not part of the design.
