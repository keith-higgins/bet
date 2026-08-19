globalThis.__timing__.logStart('Load chunks/build/admin-Gle4jwDd');import { a as __nuxt_component_0$1 } from './server.mjs';
import { ref, mergeProps, withCtx, createTextVNode, createVNode, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderAttr, ssrIncludeBooleanAttr, ssrInterpolate } from 'vue/server-renderer';
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
  __name: "admin",
  __ssrInlineRender: true,
  setup(__props) {
    const email = ref("");
    const password = ref("");
    const loading = ref(false);
    const message = ref("");
    const error = ref("");
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0$1;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "app-shell" }, _attrs))}><aside class="sidebar"><div class="brand"><div class="brand-mark"><span></span><span></span></div><div><strong>double<span>chance</span></strong><small>challenge tracker</small></div></div><div class="side-label">Workspace</div><nav class="main-nav">`);
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
        class: "nav-item active",
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
        class: "nav-item",
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
      _push(ssrRenderComponent(_component_NuxtLink, {
        class: "nav-item",
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
      _push(`</nav></aside><main class="account-page"><section class="auth-card admin-card"><p class="overline">CHALLENGE ADMIN</p><h1>Manage players</h1><p>Create a login for your friend and add them to this private challenge.</p><form><label>Friend\u2019s email address<input${ssrRenderAttr("value", unref(email))} type="email" placeholder="friend@example.com" required></label><label>Initial password<input${ssrRenderAttr("value", unref(password))} type="password" minlength="6" placeholder="At least 6 characters" required></label><button class="primary-button full-width"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>${ssrInterpolate(unref(loading) ? "Creating player\u2026" : "Add player \u2192")}</button>`);
      if (unref(message)) {
        _push(`<p class="auth-success">${ssrInterpolate(unref(message))}</p>`);
      } else {
        _push(`<!---->`);
      }
      if (unref(error)) {
        _push(`<p class="auth-error">${ssrInterpolate(unref(error))}</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</form><div class="admin-note"><strong>How it works</strong><span>Give your friend these credentials. They can log in immediately.</span></div></section></main></div>`);
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/admin.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };;globalThis.__timing__.logEnd('Load chunks/build/admin-Gle4jwDd');
//# sourceMappingURL=admin-Gle4jwDd.mjs.map
