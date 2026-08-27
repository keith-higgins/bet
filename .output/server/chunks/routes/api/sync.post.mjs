globalThis.__timing__.logStart('Load chunks/routes/api/sync.post');import { d as defineEventHandler } from '../../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

class FootballProvider {
  async getFixtures() {
    return [];
  }
  async getLiveMatches() {
    return [];
  }
  async getMatchResult() {
    return null;
  }
}
function getFootballProvider() {
  return new FootballProvider();
}

const sync_post = defineEventHandler(async () => ({
  ok: true,
  provider: "not-configured",
  matches: await getFootballProvider().getLiveMatches(),
  syncedAt: (/* @__PURE__ */ new Date()).toISOString()
}));

export { sync_post as default };;globalThis.__timing__.logEnd('Load chunks/routes/api/sync.post');
//# sourceMappingURL=sync.post.mjs.map
