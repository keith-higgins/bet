globalThis.__timing__.logStart('Load chunks/routes/api/admin/invite.post');import { d as defineEventHandler, r as readBody, c as createError, g as getHeader, u as useRuntimeConfig } from '../../../nitro/nitro.mjs';
import { createClient } from '@supabase/supabase-js';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const invite_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const email = String((body == null ? void 0 : body.email) || "").trim().toLowerCase();
  const password = String((body == null ? void 0 : body.password) || "");
  if (!email || !email.includes("@")) throw createError({ statusCode: 400, statusMessage: "Enter a valid email address." });
  if (password.length < 6) throw createError({ statusCode: 400, statusMessage: "The initial password must be at least 6 characters." });
  const config = useRuntimeConfig();
  if (!config.public.supabaseUrl || !config.public.supabaseAnonKey || !config.supabaseServiceRoleKey) throw createError({ statusCode: 503, statusMessage: "Supabase admin configuration is missing." });
  const authHeader = getHeader(event, "authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken) throw createError({ statusCode: 401, statusMessage: "You must be signed in." });
  const publicClient = createClient(config.public.supabaseUrl, config.public.supabaseAnonKey);
  const { data: userResult, error: userError } = await publicClient.auth.getUser(accessToken);
  if (userError || !userResult.user) throw createError({ statusCode: 401, statusMessage: "Your session has expired." });
  const adminClient = createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey);
  const { data: challenge, error: challengeError } = await adminClient.from("challenges").select("id, name").eq("owner_id", userResult.user.id).limit(1).maybeSingle();
  if (challengeError) throw createError({ statusCode: 500, statusMessage: challengeError.message });
  if (!challenge) throw createError({ statusCode: 404, statusMessage: "Create a challenge before inviting a player." });
  const { data: created, error: inviteError } = await adminClient.auth.admin.createUser({ email, password, email_confirm: true });
  if (inviteError) throw createError({ statusCode: 400, statusMessage: inviteError.message });
  const { error: memberError } = await adminClient.from("challenge_members").upsert({ challenge_id: challenge.id, user_id: created.user.id, display_name: email.split("@")[0], role: "player" });
  if (memberError) throw createError({ statusCode: 500, statusMessage: memberError.message });
  return { ok: true, email, challenge: challenge.name };
});

export { invite_post as default };;globalThis.__timing__.logEnd('Load chunks/routes/api/admin/invite.post');
//# sourceMappingURL=invite.post.mjs.map
