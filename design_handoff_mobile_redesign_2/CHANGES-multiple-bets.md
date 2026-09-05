# Change order: multiple bets per week

Applies on top of `README.md` (mobile redesign). Everything not mentioned here is unchanged.
`Weekly Punt Mobile.dc.html` in this folder is the current prototype — tap through it.

## The model change

A week no longer owns one accumulator. It holds any number of bets, each owned by a player.

- **A week** keeps a nominated bettor (whose turn it is) and a stake-per-bet amount. The turn
  ritual is unchanged — the nominated player is the one who *must* post.
- **A bet** belongs to a **user** and to a week. Any player may add bets to the current week,
  not just the nominated bettor, and there is **no cap**.
- **Stake is per bet and set by the bettor** in the bet builder — each bet in a week can carry
  a different stake. The week (or league settings) supplies only a *default* stake for a new
  bet (€10). A week's staked total is the sum of its bets' stakes.
- **Scoring: a week is a win for a player when their bets that week net positive.** Individual
  bets still settle won/lost, but the league table, the form strip and the `4–3` record count
  *weeks*, not bets. Net = returns − stakes across that player's bets in the week.
- **No draft state.** A bet exists and counts from the moment it is created; a new bet starts
  with exactly one empty leg and shows `—` for odds/returns until its first selection is set.

Suggested shape (adapt to the existing Supabase schema):

    weeks    (id, number, bettor_id, default_stake, deadline, allow_others_to_bet)
    bets     (id, week_id, user_id, stake, created_at, settled_at)
    bet_legs (id, bet_id, fixture, market, pick, fractional_odds, status)

Backfill: each existing week becomes one bet owned by its bettor. Combined odds is still the
product of the legs' decimal odds; return is the bet's own `stake × combined odds`.

## Dashboard — replaces README §2 variant A, block 3 ("Your accumulator")

**This week's bets — horizontal carousel.** Section heading `This week's bets` with
`N BETS · €X STAKED` right-aligned (DM Mono 10px).

Scroller: `display: flex; gap: 12px; overflow-x: auto; max-width: 100%;
scroll-snap-type: x mandatory; scroll-padding-left: 20px; overscroll-behavior-x: contain;
margin: 0 -20px; padding: 2px 20px 6px`. The negative margin lets cards bleed to the screen
edge; `scroll-padding-left` keeps snapped cards on the 20px gutter. The parent grid **must**
carry `grid-template-columns: minmax(0, 1fr)` — otherwise the implicit `auto` track sizes to
the carousel's max-content and the whole screen scrolls sideways.

Each **bet card**: `scroll-snap-align: start`, `flex: none`, `width: 300px` (one at a time with
a clear peek of the next), `radius: 20px`, `padding: 16px`, `box-sizing: border-box`. The
signed-in user's own bets use `--surface-2` with a `--line-dash` border; other players' use
`--surface` on `--line`. Contents:

- Header row: 28px avatar (own `#2A2F3A`, others `--surface-4`, DM Mono initials), owner name
  (13px/500) over `BET N · M LEGS · €X` — that bet's own stake (DM Mono 9.5px; singular
  `LEG` at 1) — and a status pill —
  `WON` lime on `--lime-tint`, `BUST` coral on `#241315`, `LIVE` amber on `--amber-tint`.
- Figures row: ODDS (Archivo 700 / 20px) left; RETURNS — or RETURNED once won — right
  (Archivo 700 / 20px, lime, coral when bust). Both read `—` while the bet has no selection.
- Pip strip: one `flex: 1`, 6px-tall, `radius: 3px` bar per leg, coloured by leg status.
- Action button: `min-height: 42px`, `radius: 12px`. Own bets get a lime fill labelled
  `Edit bet` (`Add a selection` when empty); others' a `--line-3` outline in `--ink-2` labelled
  `View bet`. Opens the builder on that bet.

After the cards, a 124px-wide dashed `＋ New bet` button (lime 13px, `1px dashed
var(--line-dash)`) creates a bet for the signed-in user and opens the builder on it. Below the
carousel, a 12px `--muted` line: "Swipe for the rest — €X riding on this week" (summed return
of bets that are neither bust nor empty).

Turn hero: the stat label becomes `STAKE / BET`, the button `Place a bet →`.
Record card overline becomes `YOUR RECORD · 13 WEEKS`, key `WKS WON / WKS LOST`.

## Bet builder — amends README §3

- Header overline: `WEEK 14 · BET N OF M · <OWNER NAME>`; title `Build a bet`.
- **New: bet switcher** directly under the header — `display: flex; gap: 8px; overflow-x: auto;
  max-width: 100%; margin: 0 -20px 16px; padding: 0 20px 4px`. One 38px pill per bet in the
  week labelled `<INITIALS> · BET N` (DM Mono 11px); selected = lime fill on `--lime-ink`,
  others `--surface-3` on `--line-3`. Trailing dashed `＋ NEW BET` pill creates another bet.
  Switching swaps which bet the legs below belong to.
- **Stake card: the README §3 stepper stays, but scoped to the open bet.** Overline
  `STAKE ON THIS BET` with the week's running total right-aligned (`€45.00 ACROSS 3 BETS`,
  DM Mono 9.5px `--muted`), then the 48×48 `−` / Archivo 800 34px value / `＋` row and the
  `€10 / €20 / €50` quick chips. Step €5, floor €1. Writes `bets.stake` for that bet only —
  switching bets shows that bet's own stake. New bets start at the week's default stake.
- Legs: unchanged, except **a new bet starts with one leg**, not four.
- Footer: keep `Save bet`, and add beneath it a secondary `Save and start another bet`
  (`min-height: 48px`, `1px solid var(--line-dash)`, transparent, lime 13.5px) which saves and
  opens a fresh bet in the same week.

## Match centre — replaces the "Acca status card" in README §4

**Week status card** — `radius: 18px` on `--surface-2`, `display: grid; gap: 13px`. Top row:
overline `WEEK 14 · N BETS` over `X of N still standing` (Archivo 700 / 18px) left; `STILL
RIDING` over the summed potential of still-alive bets (Archivo 700 / 18px, lime) right. Then
one row per bet, each above a `border-top: 1px solid #232833`: 26px avatar, `Bet N · <owner>`
(12.5px) over `€X · M LEGS · <combined odds> · <status>` (DM Mono 9.5px `--muted`; `NO SELECTION
YET` when empty), and a strip of 8 × 24px `radius: 4px` pips, one per leg.

## History — amends README §5

- Summary tile 1 counts bets, with `13 weeks · 8 net wins` beneath — bets and weeks are now
  different counts.
- Week row: bettor summary (`Fintan Doyle + 1` when more than one player bet that week) over
  `date · N bets · €X staked`; the right block shows the week's signed **net** over a status of
  `NET WIN` / `NET LOSS` / `AWAITING RESULT`.
- **The expansion is now two levels.** Body on `#101319`, `padding: 7px 15px 15px`; inside, one
  `radius: 14px` sub-card per bet (`--surface` on `--line`, `padding: 12px 13px`,
  `margin-top: 8px`): 24px owner avatar, owner name (12.5px) over `BET N · <odds> · €<stake>`
  (DM Mono 9.5px), that bet's signed result right (Archivo 700 / 13.5px, lime/coral). Its legs
  follow as compact rows inside the sub-card: 6px status dot, `match` over
  `market · pick · score` (12px / 10.5px), leg status in DM Mono 9.5px.

## League table — amends README §6

Footer note becomes: "Profit is returns minus stakes. A week counts as a win when you finish it
net positive."

## Manage — amends README §8

`Stake (€)` becomes `Default stake (€)`, default `10` — it seeds new bets, it does not lock
them; bettors set their own stake per bet. Add a checkbox row below the two-up
fields (`radius: 12px` on `--surface-3`, `1px solid var(--line-3)`, 20px box with
`accent-color: var(--lime)`, 12.5px `--ink-2` label): "Other players can add their own bets" →
writes `weeks.allow_others_to_bet`, default on.

## State — amends README "State management"

| Prototype state | Production source |
| --- | --- |
| `stakes` (per-bet map) | `bets.stake`, written from the bet builder |
| `defaultStake` (prop) | `week.default_stake` — seeds a new bet only |
| `activeBet` | route param on the bet screen (`/bet/:betId`) |
| `added` (locally created bets) | rows inserted into `bets`; refetch the week |

`useDashboard` should return the current week's **bets** (each with owner, legs and computed
odds/return) instead of a single `currentBet`, and `canManageCurrentBet` becomes per-bet: a user
may edit bets they own, and may create bets when they are the nominated bettor or
`allow_others_to_bet` is set.

## Build order for this change

1. Schema: `bets` / `bet_legs`, week gains `stake_per_bet` + `allow_others_to_bet`, backfill.
2. `useDashboard` returning a week's bets; per-bet permissions.
3. Dashboard carousel (mind the `minmax(0, 1fr)` parent track).
4. Bet builder: switcher, per-bet stake stepper, one-leg default.
5. Match centre week card, History two-level expansion, League footnote, Manage fields.
