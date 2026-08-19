globalThis.__timing__.logStart('Load chunks/build/login-KUDhvU4v');import { a as __nuxt_component_0$1 } from './server.mjs';
import { ref, mergeProps, unref, withCtx, createTextVNode, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrInterpolate, ssrRenderAttr, ssrIncludeBooleanAttr, ssrRenderComponent } from 'vue/server-renderer';
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
  __name: "login",
  __ssrInlineRender: true,
  setup(__props) {
    const mode = ref("login");
    const email = ref("");
    const password = ref("");
    const loading = ref(false);
    const message = ref("");
    const error = ref("");
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0$1;
      _push(`<main${ssrRenderAttrs(mergeProps({ class: "auth-page" }, _attrs))}><div class="auth-card"><div class="brand auth-brand"><div class="brand-mark"><span></span><span></span></div><div><strong>double<span>chance</span></strong><small>challenge tracker</small></div></div><p class="overline">PRIVATE CHALLENGE</p><h1>${ssrInterpolate(unref(mode) === "login" ? "Welcome back" : "Create your account")}</h1><p>${ssrInterpolate(unref(mode) === "login" ? "Sign in to see your weekly football challenge." : "Create an account to join the challenge.")}</p><form><label>Email address<input${ssrRenderAttr("value", unref(email))} type="email" placeholder="you@example.com" required></label><label>Password<input${ssrRenderAttr("value", unref(password))} type="password" placeholder="At least 6 characters" minlength="6" required></label><button class="primary-button full-width"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>${ssrInterpolate(unref(loading) ? "Working\u2026" : unref(mode) === "login" ? "Log in \u2192" : "Create account \u2192")}</button>`);
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
      _push(`</form><button class="switch-auth">${ssrInterpolate(unref(mode) === "login" ? "Need an account? Create one" : "Already have an account? Log in")}</button>`);
      _push(ssrRenderComponent(_component_NuxtLink, { to: "/" }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`Continue to dashboard`);
          } else {
            return [
              createTextVNode("Continue to dashboard")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</div></main>`);
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/login.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };;globalThis.__timing__.logEnd('Load chunks/build/login-KUDhvU4v');
//# sourceMappingURL=login-KUDhvU4v.mjs.map
