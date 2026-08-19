globalThis.__timing__.logStart('Load chunks/build/challenges-DW2v-Kfr');import { a as __nuxt_component_0$1 } from './server.mjs';
import { ref, withCtx, createTextVNode, createVNode, unref, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrInterpolate, ssrRenderList, ssrRenderAttr, ssrIncludeBooleanAttr } from 'vue/server-renderer';
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
  __name: "challenges",
  __ssrInlineRender: true,
  setup(__props) {
    const { loading } = useChallengeData();
    const rounds = ref([]);
    const form = ref({ title: "", stake: 20, deadline: "" });
    const editing = ref(null);
    const creating = ref(false);
    const notice = ref("");
    const money = (value) => `\u20AC ${Number(value || 0).toFixed(2)}`;
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0$1;
      _push(`<!--[--><div class="app-shell"><aside class="sidebar"><div class="brand"><div class="brand-mark"><span></span><span></span></div><div><strong>double<span>chance</span></strong><small>challenge tracker</small></div></div><div class="side-label">Workspace</div><nav class="main-nav">`);
      _push(ssrRenderComponent(_component_NuxtLink, {
        class: "nav-item",
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
      _push(ssrRenderComponent(_component_NuxtLink, {
        class: "nav-item active",
        to: "/challenges"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`\u2699 <span${_scopeId}>Manage challenges</span>`);
          } else {
            return [
              createTextVNode("\u2699 "),
              createVNode("span", null, "Manage challenges")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</nav></aside><main class="admin-page"><section class="admin-card">`);
      _push(ssrRenderComponent(_component_NuxtLink, {
        class: "back-link",
        to: "/"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`\u2190 Back to overview`);
          } else {
            return [
              createTextVNode("\u2190 Back to overview")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`<div class="admin-heading"><div><p class="overline">ADMINISTRATION</p><h1>Manage challenges</h1><p>Create, edit, and remove weekly rounds and bets.</p></div><button class="primary-button">\uFF0B New challenge</button></div>`);
      if (notice.value) {
        _push(`<p class="auth-success">${ssrInterpolate(notice.value)}</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<div class="challenge-list"><!--[-->`);
      ssrRenderList(rounds.value, (item) => {
        _push(`<article class="managed-challenge">`);
        if (editing.value !== item.id) {
          _push(`<!--[--><div><span class="week-kicker">WEEK ${ssrInterpolate(item.week)} \xB7 ${ssrInterpolate(item.status)}</span><h2>${ssrInterpolate(item.title)}</h2><small>${ssrInterpolate(item.dates)} \xB7 ${ssrInterpolate(money(item.stake))} stake</small>`);
          if (item.bets[0]) {
            _push(`<div class="managed-bet"><strong>${ssrInterpolate(item.bets[0].type)}</strong><span>${ssrInterpolate(item.bets[0].selections.length)} legs \xB7 ${ssrInterpolate(item.bets[0].status)}</span><small>${ssrInterpolate(money(item.bets[0].stake))} stake \xB7 ${ssrInterpolate(item.bets[0].actualReturn == null ? "No return yet" : money(item.bets[0].actualReturn))}</small></div>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div><div class="managed-actions">`);
          _push(ssrRenderComponent(_component_NuxtLink, {
            class: "outline-button",
            to: "/"
          }, {
            default: withCtx((_, _push2, _parent2, _scopeId) => {
              if (_push2) {
                _push2(`Open overview`);
              } else {
                return [
                  createTextVNode("Open overview")
                ];
              }
            }),
            _: 2
          }, _parent));
          _push(`<button class="outline-button">Edit challenge</button><button class="outline-button danger-button">Delete</button></div><!--]-->`);
        } else {
          _push(`<!--[--><label>Title<input${ssrRenderAttr("value", form.value.title)}></label><label>Stake (\u20AC)<input${ssrRenderAttr("value", form.value.stake)} type="number" min="1"></label><label>Deadline<input${ssrRenderAttr("value", form.value.deadline)} type="datetime-local"></label><div class="managed-actions"><button class="outline-button">Cancel</button><button class="primary-button">Save</button></div><!--]-->`);
        }
        _push(`</article>`);
      });
      _push(`<!--]-->`);
      if (!rounds.value.length) {
        _push(`<div class="empty-state"><strong>No challenges yet</strong><span>Create the first weekly challenge.</span></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></section></main></div>`);
      if (creating.value) {
        _push(`<div class="modal-backdrop"><section class="modal"><button class="modal-close">\xD7</button><p class="overline">NEW ROUND</p><h2>Create challenge</h2><label>Title<input${ssrRenderAttr("value", form.value.title)} placeholder="Weekend challenge"></label><label>Stake (\u20AC)<input${ssrRenderAttr("value", form.value.stake)} type="number" min="1"></label><label>Deadline<input${ssrRenderAttr("value", form.value.deadline)} type="datetime-local"></label><button class="primary-button full-width"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>Create challenge \u2192</button></section></div>`);
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/challenges.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };;globalThis.__timing__.logEnd('Load chunks/build/challenges-DW2v-Kfr');
//# sourceMappingURL=challenges-DW2v-Kfr.mjs.map
