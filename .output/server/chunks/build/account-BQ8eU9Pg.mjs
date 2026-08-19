globalThis.__timing__.logStart('Load chunks/build/account-BQ8eU9Pg');import { a as __nuxt_component_0$1, u as useRuntimeConfig } from './server.mjs';
import { ref, mergeProps, withCtx, createTextVNode, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderAttr, ssrInterpolate, ssrIncludeBooleanAttr } from 'vue/server-renderer';
import { createClient } from '@supabase/supabase-js';
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

const _sfc_main = {
  __name: "account",
  __ssrInlineRender: true,
  setup(__props) {
    const config = useRuntimeConfig();
    config.public.supabaseUrl && config.public.supabaseAnonKey ? createClient(config.public.supabaseUrl, config.public.supabaseAnonKey) : null;
    const name = ref("");
    const password = ref("");
    const confirmation = ref("");
    const message = ref("");
    const error = ref("");
    const loading = ref(false);
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0$1;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "app-shell" }, _attrs))}><main class="account-page"><section class="auth-card">`);
      _push(ssrRenderComponent(_component_NuxtLink, {
        class: "back-link",
        to: "/"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`\u2190 Back to dashboard`);
          } else {
            return [
              createTextVNode("\u2190 Back to dashboard")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`<p class="overline">ACCOUNT SETTINGS</p><h1>Your account</h1><p>Update your name or add a password for email login. Your challenge permissions stay unchanged.</p><form><label>Display name<input${ssrRenderAttr("value", name.value)} type="text" maxlength="60" placeholder="Your name" required></label><label>New password<input${ssrRenderAttr("value", password.value)} type="password" minlength="6" placeholder="Leave blank to keep current password"></label><label>Confirm password<input${ssrRenderAttr("value", confirmation.value)} type="password" minlength="6" placeholder="Repeat new password"></label>`);
      if (message.value) {
        _push(`<p class="auth-success">${ssrInterpolate(message.value)}</p>`);
      } else {
        _push(`<!---->`);
      }
      if (error.value) {
        _push(`<p class="auth-error">${ssrInterpolate(error.value)}</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<button class="primary-button full-width"${ssrIncludeBooleanAttr(loading.value) ? " disabled" : ""}>${ssrInterpolate(loading.value ? "Saving\u2026" : "Save account \u2192")}</button></form><button class="logout-button">Log out</button></section></main></div>`);
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/account.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };;globalThis.__timing__.logEnd('Load chunks/build/account-BQ8eU9Pg');
//# sourceMappingURL=account-BQ8eU9Pg.mjs.map
