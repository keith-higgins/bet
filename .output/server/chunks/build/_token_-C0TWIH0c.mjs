globalThis.__timing__.logStart('Load chunks/build/_token_-C0TWIH0c');import { a as __nuxt_component_0$1 } from './server.mjs';
import { ref, mergeProps, unref, withCtx, createTextVNode, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrInterpolate, ssrRenderComponent } from 'vue/server-renderer';
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
  __name: "[token]",
  __ssrInlineRender: true,
  setup(__props) {
    const statusTitle = ref("Accepting invite");
    const statusMessage = ref("We\u2019re signing you in and joining the challenge\u2026");
    const signedIn = ref(false);
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0$1;
      _push(`<main${ssrRenderAttrs(mergeProps({ class: "auth-page" }, _attrs))}><div class="auth-card"><p class="overline">YOU\u2019RE INVITED</p><h1>${ssrInterpolate(unref(statusTitle))}</h1><p>${ssrInterpolate(unref(statusMessage))}</p>`);
      if (!unref(signedIn)) {
        _push(`<div class="invite-preview"><strong>Double Chance</strong><small>Weekly football challenge \xB7 private players only</small></div>`);
      } else {
        _push(`<!---->`);
      }
      if (unref(signedIn)) {
        _push(ssrRenderComponent(_component_NuxtLink, {
          class: "primary-button full-width",
          to: "/"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`Open dashboard \u2192`);
            } else {
              return [
                createTextVNode("Open dashboard \u2192")
              ];
            }
          }),
          _: 1
        }, _parent));
      } else {
        _push(ssrRenderComponent(_component_NuxtLink, {
          class: "primary-button full-width",
          to: "/login"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`Continue with email login \u2192`);
            } else {
              return [
                createTextVNode("Continue with email login \u2192")
              ];
            }
          }),
          _: 1
        }, _parent));
      }
      _push(`</div></main>`);
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/invite/[token].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };;globalThis.__timing__.logEnd('Load chunks/build/_token_-C0TWIH0c');
//# sourceMappingURL=_token_-C0TWIH0c.mjs.map
