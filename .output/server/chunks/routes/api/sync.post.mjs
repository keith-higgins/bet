globalThis.__timing__.logStart('Load chunks/routes/api/sync.post');import { d as defineEventHandler, b as getQuery } from '../../nitro/nitro.mjs';
import { g as getFootballProvider } from '../../_/provider.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const sync_post = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const ids = String(query.ids || "").split(",").map((id) => id.trim()).filter(Boolean);
  const matches = await getFootballProvider().getLiveMatches(ids);
  return { ok: true, provider: "thesportsdb", matches, syncedAt: (/* @__PURE__ */ new Date()).toISOString() };
});

export { sync_post as default };;globalThis.__timing__.logEnd('Load chunks/routes/api/sync.post');
//# sourceMappingURL=sync.post.mjs.map
