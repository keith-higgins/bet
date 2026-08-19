globalThis.__timing__.logStart('Load chunks/build/index-CQqsAmab');import { a as __nuxt_component_0$1 } from './server.mjs';
import { ref, computed, withCtx, createTextVNode, createVNode, unref, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrInterpolate, ssrRenderList, ssrRenderClass, ssrRenderAttr, ssrIncludeBooleanAttr, ssrLooseContain, ssrLooseEqual } from 'vue/server-renderer';
import { u as useChallengeData } from './useChallengeData-DZctN6nO.mjs';
import '../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';
import 'unhead/plugins';
import 'vue-router';
import '@supabase/supabase-js';

const _sfc_main = {
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    const { databaseEnabled } = useChallengeData();
    const round = ref({ id: null, week: 1, title: "Your first challenge", dates: "No round created yet", bets: [] });
    const previousRounds = ref([]);
    const bet = ref({ id: null, bettorId: null, type: "Accumulator", stake: 20, status: "pending", selections: [] });
    const legs = ref([{ match: "", market: "Match result", pick: "", odds: 1.5, status: "pending" }]);
    const stake = ref(20);
    ref(1);
    const modal = ref(false);
    const settlementModal = ref(false);
    const newChallengeModal = ref(false);
    const settlementLegs = ref([]);
    const showSlip = ref(false);
    const loading = ref(false);
    const toast = ref("");
    const newChallenge = ref({ title: "", bettor: "me", stake: 20, deadline: "" });
    const combinedOdds = computed(() => legs.value.reduce((total, leg) => total * (Number(leg.odds) || 1), 1));
    computed(() => stake.value * combinedOdds.value);
    const totalStaked = computed(() => round.value.bets.reduce((sum, item) => sum + Number(item.stake || 0), 0));
    const settled = computed(() => ["won", "lost"].includes(bet.value.status));
    const profit = computed(() => settled.value ? Number(bet.value.actualReturn || 0) - Number(bet.value.stake || 0) : 0);
    const money = (value) => `\u20AC ${Number(value || 0).toFixed(2)}`;
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0$1;
      _push(`<!--[-->`);
      _push(ssrRenderComponent(_component_NuxtLink, {
        class: "account-avatar-link",
        to: "/account"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`ME`);
          } else {
            return [
              createTextVNode("ME")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(ssrRenderComponent(_component_NuxtLink, {
        class: "account-nav-link",
        to: "/account"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`\u2659 <span${_scopeId}>Account</span>`);
          } else {
            return [
              createTextVNode("\u2659 "),
              createVNode("span", null, "Account")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(ssrRenderComponent(_component_NuxtLink, {
        class: "challenge-admin-link",
        to: "/challenges"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`Manage challenges`);
          } else {
            return [
              createTextVNode("Manage challenges")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`<div class="quick-actions"><button class="outline-button">\uFF0B New challenge</button><button class="outline-button danger-button">Delete challenge</button>`);
      if (bet.value.selections.length) {
        _push(`<button class="primary-button">${ssrInterpolate(settled.value ? "Edit result" : "Settle bet")} \u2192</button>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
      if (previousRounds.value.length) {
        _push(`<section class="history-strip"><div class="history-strip-heading"><p class="overline">RECENT ACTIVITY</p><h2>Past weeks</h2></div><div class="history-strip-list"><!--[-->`);
        ssrRenderList(previousRounds.value, (item) => {
          var _a, _b, _c;
          _push(`<div class="past-row"><div class="week-number">${ssrInterpolate(item.week)}</div><div class="past-main"><strong>${ssrInterpolate(item.title)}</strong><small>${ssrInterpolate(item.dates)}</small></div><div class="past-result"><span class="${ssrRenderClass([((_a = item.bets[0]) == null ? void 0 : _a.status) || "waiting", "result-pill"])}">${ssrInterpolate(((_b = item.bets[0]) == null ? void 0 : _b.status) || "No bet")}</span><strong>${ssrInterpolate(((_c = item.bets[0]) == null ? void 0 : _c.actualReturn) == null ? "\u2014" : money(Number(item.bets[0].actualReturn) - Number(item.bets[0].stake)))}</strong></div></div>`);
        });
        _push(`<!--]--></div></section>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<div class="app-shell"><aside class="sidebar"><div class="brand"><div class="brand-mark"><span></span><span></span></div><div><strong>double<span>chance</span></strong><small>challenge tracker</small></div></div><div class="side-label">Workspace</div><nav class="main-nav">`);
      _push(ssrRenderComponent(_component_NuxtLink, {
        class: "nav-item active",
        to: "/"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`\u25A6 <span${_scopeId}>Overview</span>`);
          } else {
            return [
              createTextVNode("\u25A6 "),
              createVNode("span", null, "Overview")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(ssrRenderComponent(_component_NuxtLink, {
        class: "nav-item",
        to: "/admin"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`\u2659 <span${_scopeId}>Manage players</span>`);
          } else {
            return [
              createTextVNode("\u2659 "),
              createVNode("span", null, "Manage players")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</nav><div class="side-spacer"></div><div class="next-turn-card"><div class="eyebrow">\u2726 Next up</div><div class="turn-person"><div class="avatar yellow">FR</div><div><strong>Friend&#39;s turn</strong><small>Next round \xB7 \u20AC20 default stake</small></div></div></div></aside><main class="main-content"><header class="topbar"><div class="breadcrumbs"><span>My challenge</span><b>/</b><strong>Overview</strong></div><div class="top-actions"><span class="sync-status"><i class="live-dot"></i>${ssrInterpolate(unref(databaseEnabled) ? "Supabase connected" : "Database not connected")}</span>`);
      _push(ssrRenderComponent(_component_NuxtLink, {
        class: "avatar purple",
        to: "/admin"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`ME`);
          } else {
            return [
              createTextVNode("ME")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</div></header><div class="page-wrap"><section class="welcome-row"><div><p class="overline">YOUR FOOTBALL CHALLENGE</p><h1>Welcome back <span>\u2726</span></h1><p class="subheading">One bettor, one bet, every week.</p></div><button class="primary-button">\uFF0B ${ssrInterpolate(bet.value.selections.length ? "Edit bet" : "Add this week\u2019s bet")}</button></section><section class="stats-grid"><article class="stat-card dark-card"><div class="stat-top"><span>Total staked</span></div><strong class="big-number">${ssrInterpolate(money(totalStaked.value))}</strong><div class="stat-foot"><span>Current round</span></div></article><article class="stat-card"><div class="stat-top"><span>Record</span></div><strong class="big-number">${ssrInterpolate(settled.value && bet.value.status === "won" ? "1 / 0" : settled.value ? "0 / 1" : "0 / 0")}</strong><div class="stat-foot"><span>Settled bets</span></div></article><article class="stat-card"><div class="stat-top"><span>Best return</span></div><strong class="big-number">${ssrInterpolate(settled.value && bet.value.status === "won" ? money(bet.value.actualReturn) : money(0))}</strong><div class="stat-foot"><span>Settled returns</span></div></article><article class="stat-card"><div class="stat-top"><span>Next turn</span></div><strong class="big-number">Friend</strong><div class="stat-foot"><span>After this round</span></div></article></section><section class="content-grid"><div class="left-column"><div class="section-heading"><div><p class="overline">THE CURRENT ROUND</p><h2>Week ${ssrInterpolate(round.value.week)} <span class="badge">${ssrInterpolate(round.value.id ? "In progress" : "Not started")}</span></h2></div><button class="text-button">Edit bet \u2192</button></div><article class="challenge-card"><div class="challenge-head"><div><span class="week-kicker">${ssrInterpolate(round.value.dates)}</span><h3>${ssrInterpolate(round.value.title)}</h3></div><div class="stake-pill"><span>Stake</span><strong>${ssrInterpolate(money(stake.value))}</strong></div></div><div class="player-bets"><div class="player-bet"><div class="person-line"><div class="avatar purple">ME</div><div><strong>This week&#39;s bet</strong><small>${ssrInterpolate(bet.value.selections.length ? `${bet.value.type} \xB7 ${bet.value.selections.length} selections` : "Not placed yet")}</small></div><span class="${ssrRenderClass([bet.value.status, "bet-state"])}">${ssrInterpolate(bet.value.selections.length ? bet.value.status : "Waiting")}</span></div><button class="bet-link">${ssrInterpolate(showSlip.value ? "Hide slip \u2191" : "View slip \u2197")}</button></div></div>`);
      if (showSlip.value && bet.value.selections.length) {
        _push(`<div class="bet-slip"><div class="bet-slip-heading"><h3>${ssrInterpolate(bet.value.type)} <span>${ssrInterpolate(bet.value.selections.length)} legs</span></h3>`);
        if (!settled.value) {
          _push(`<button class="primary-button">Settle bet</button>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div><div class="slip-legs"><!--[-->`);
        ssrRenderList(legs.value, (leg, i) => {
          _push(`<div class="slip-leg"><div class="slip-leg-number">${ssrInterpolate(i + 1)}</div><div class="slip-leg-main"><strong>${ssrInterpolate(leg.match)}</strong><small>${ssrInterpolate(leg.market)} \xB7 ${ssrInterpolate(leg.pick)}</small></div><strong>${ssrInterpolate(Number(leg.odds).toFixed(2))}</strong><span class="${ssrRenderClass([leg.status, "slip-status"])}">${ssrInterpolate(leg.status)}</span></div>`);
        });
        _push(`<!--]--></div></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</article><div class="section-heading lower-heading"><div><p class="overline">RECENT ACTIVITY</p><h2>Past weeks</h2></div></div><div class="past-weeks">`);
      if (settled.value) {
        _push(`<div class="past-row"><div class="week-number">${ssrInterpolate(round.value.week)}</div><div class="past-main"><strong>${ssrInterpolate(round.value.title)}</strong><small>${ssrInterpolate(bet.value.status === "won" ? "Bet won" : "Bet lost")}</small></div><div class="past-result"><span class="${ssrRenderClass([bet.value.status, "result-pill"])}">${ssrInterpolate(bet.value.status)}</span><strong>${ssrInterpolate(money(profit.value))}</strong></div></div>`);
      } else {
        _push(`<div class="empty-state"><strong>No settled weeks yet</strong><span>Completed rounds will appear here.</span></div>`);
      }
      _push(`</div></div><div class="right-column"><div class="section-heading"><div><p class="overline">THE SCOREBOARD</p><h2>Challenge leaders</h2></div></div><article class="leaderboard"><div class="leader-row"><div class="leader-person"><span class="rank">1</span><div class="avatar purple">ME</div><strong>You</strong></div><strong>${ssrInterpolate(settled.value && bet.value.status === "won" ? "1 - 0" : settled.value ? "0 - 1" : "0 - 0")}</strong><span class="profit">${ssrInterpolate(money(profit.value))}</span></div></article></div></section></div></main>`);
      if (toast.value) {
        _push(`<div class="toast">\u2713 ${ssrInterpolate(toast.value)}</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
      if (modal.value) {
        _push(`<div class="modal-backdrop"><section class="modal"><button class="modal-close">\xD7</button><h2>${ssrInterpolate(bet.value.selections.length ? "Edit your bet" : "Add your bet")}</h2><form><label>Stake (\u20AC)<input${ssrRenderAttr("value", stake.value)} type="number" min="1"></label><div class="legs-editor"><div class="legs-heading"><strong>Accumulator legs</strong><button type="button" class="outline-button">\uFF0B Add leg</button></div><!--[-->`);
        ssrRenderList(legs.value, (leg, i) => {
          _push(`<div class="leg-row"><div class="leg-number">${ssrInterpolate(i + 1)}</div><div class="leg-fields"><input${ssrRenderAttr("value", leg.match)} placeholder="Match"><div class="leg-subfields"><select><option${ssrIncludeBooleanAttr(Array.isArray(leg.market) ? ssrLooseContain(leg.market, null) : ssrLooseEqual(leg.market, null)) ? " selected" : ""}>Match result</option><option${ssrIncludeBooleanAttr(Array.isArray(leg.market) ? ssrLooseContain(leg.market, null) : ssrLooseEqual(leg.market, null)) ? " selected" : ""}>Both teams to score</option><option${ssrIncludeBooleanAttr(Array.isArray(leg.market) ? ssrLooseContain(leg.market, null) : ssrLooseEqual(leg.market, null)) ? " selected" : ""}>Total goals</option></select><input${ssrRenderAttr("value", leg.pick)} placeholder="Pick"><input${ssrRenderAttr("value", leg.odds)} type="number" step=".01"></div></div></div>`);
        });
        _push(`<!--]--></div><button class="primary-button full-width">Save bet \u2192</button></form></section></div>`);
      } else {
        _push(`<!---->`);
      }
      if (settlementModal.value) {
        _push(`<div class="modal-backdrop"><section class="modal"><button class="modal-close">\xD7</button><p class="overline">SETTLE BET</p><h2>Confirm results</h2><div class="settlement-list"><!--[-->`);
        ssrRenderList(settlementLegs.value, (leg, i) => {
          _push(`<label>${ssrInterpolate(leg.match || `Leg ${i + 1}`)}<select><option value="pending"${ssrIncludeBooleanAttr(Array.isArray(leg.status) ? ssrLooseContain(leg.status, "pending") : ssrLooseEqual(leg.status, "pending")) ? " selected" : ""}>Pending</option><option value="won"${ssrIncludeBooleanAttr(Array.isArray(leg.status) ? ssrLooseContain(leg.status, "won") : ssrLooseEqual(leg.status, "won")) ? " selected" : ""}>Won</option><option value="lost"${ssrIncludeBooleanAttr(Array.isArray(leg.status) ? ssrLooseContain(leg.status, "lost") : ssrLooseEqual(leg.status, "lost")) ? " selected" : ""}>Lost</option></select></label>`);
        });
        _push(`<!--]--></div><button class="primary-button full-width">Save settlement \u2192</button></section></div>`);
      } else {
        _push(`<!---->`);
      }
      if (newChallengeModal.value) {
        _push(`<div class="modal-backdrop"><section class="modal"><button class="modal-close">\xD7</button><p class="overline">NEXT ROUND</p><h2>New challenge</h2><p class="modal-intro">Set up the next weekly turn.</p><label>Title<input${ssrRenderAttr("value", newChallenge.value.title)} placeholder="Weekend challenge"></label><label>Stake (\u20AC)<input${ssrRenderAttr("value", newChallenge.value.stake)} type="number" min="1"></label><label>Deadline<input${ssrRenderAttr("value", newChallenge.value.deadline)} type="datetime-local"></label><button class="primary-button full-width"${ssrIncludeBooleanAttr(loading.value) ? " disabled" : ""}>${ssrInterpolate(loading.value ? "Creating\u2026" : "Create challenge \u2192")}</button></section></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<!--]-->`);
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };;globalThis.__timing__.logEnd('Load chunks/build/index-CQqsAmab');
//# sourceMappingURL=index-CQqsAmab.mjs.map
