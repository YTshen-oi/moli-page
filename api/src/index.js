/**
 * moli-site-api - Cloudflare Worker backend for 墨漓·月下小站
 * Endpoints:
 *   GET  /api/guestbook          -> { ok, messages: [...] }
 *   POST /api/guestbook          { name, message } -> { ok }
 *   GET  /api/progress?client=x  -> { ok, progress }
 *   PUT  /api/progress           { client, volumeId } -> { ok }
 *   POST /api/admin/login        { password } -> { ok, token }
 *   GET  /api/admin/guestbook    (admin) -> full list incl. hidden
 *   DELETE /api/admin/guestbook/:id (admin)
 *   POST /api/admin/guestbook/:id/hide (admin)
 *   GET  /api/admin/stats        (admin)
 * Storage: KV binding BOOK_KV
 *   gb_messages  : JSON array of guestbook entries
 *   progress:<clientId> : { volumeId, updatedAt }
 */

const GB_KEY = "gb_messages";
const GB_MAX = 500;          // keep at most this many messages
const TOKEN_TTL = 3600 * 8;  // admin token lifetime: 8h

const CORS_ORIGINS = [
  "https://silverlingfox.github.io",
  "http://localhost:8777",
  "http://127.0.0.1:8777",
];

function corsHeaders(request) {
  const origin = request.headers.get("origin") || "";
  const allow = CORS_ORIGINS.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,x-admin-token,x-chat-token",
  };
}

function json(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(request) },
  });
}

async function readBody(request) {
  try {
    return await request.json();
  } catch (e) {
    return {};
  }
}

// ---------- admin token helpers ----------
async function makeToken(secret, salt) {
  const data = new TextEncoder().encode(salt + ":" + secret);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
  return hex;
}

async function checkAdmin(request, env) {
  const token = request.headers.get("x-admin-token") || "";
  if (!token) return false;
  const expected = await makeToken(env.ADMIN_PASSWORD, env.ADMIN_PASSWORD);
  return token === expected;
}

// ---------- guestbook ----------
async function getMessages(kv) {
  const raw = await kv.get(GB_KEY);
  return raw ? JSON.parse(raw) : [];
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    // ----- public: guestbook -----
    if (path === "/api/guestbook" && method === "GET") {
      const all = await getMessages(env.BOOK_KV);
      const visible = all.filter(m => !m.hidden);
      return json(request, { ok: true, messages: visible.reverse().slice(-100) });
    }

    if (path === "/api/guestbook" && method === "POST") {
      const body = await readBody(request);
      const name = String(body.name || "").trim().slice(0, 20) || "匿名";
      const message = String(body.message || "").trim().slice(0, 500);
      if (!message) return json(request, { ok: false, error: "留言不能为空" }, 400);

      const all = await getMessages(env.BOOK_KV);
      // simple flood control: same content within 60s
      const now = Date.now();
      if (all.some(m => m.message === message && now - m.ts < 60000)) {
        return json(request, { ok: false, error: "这条刚发过，休息一下" }, 429);
      }
      all.push({
        id: crypto.randomUUID(),
        name,
        message,
        ts: now,
        ip: request.headers.get("cf-connecting-ip") || "",
        hidden: false,
      });
      while (all.length > GB_MAX) all.shift();
      await env.BOOK_KV.put(GB_KEY, JSON.stringify(all));
      return json(request, { ok: true });
    }

    // ----- public: reading progress -----
    if (path === "/api/progress" && method === "GET") {
      const client = url.searchParams.get("client");
      if (!client) return json(request, { ok: false, error: "missing client" }, 400);
      const raw = await env.BOOK_KV.get("progress:" + client);
      return json(request, { ok: true, progress: raw ? JSON.parse(raw) : null });
    }

    if (path === "/api/progress" && method === "PUT") {
      const body = await readBody(request);
      const client = String(body.client || "").slice(0, 64);
      const volumeId = String(body.volumeId || "").slice(0, 64);
      if (!client || !volumeId) return json(request, { ok: false, error: "bad params" }, 400);
      await env.BOOK_KV.put(
        "progress:" + client,
        JSON.stringify({ volumeId, updatedAt: Date.now() })
      );
      return json(request, { ok: true });
    }

    // ----- admin -----
    if (path === "/api/admin/login" && method === "POST") {
      const body = await readBody(request);
      if (String(body.password || "") !== env.ADMIN_PASSWORD) {
        return json(request, { ok: false, error: "密码不对" }, 401);
      }
      return json(request, { ok: true, token: await makeToken(env.ADMIN_PASSWORD, env.ADMIN_PASSWORD) });
    }

    if (path.startsWith("/api/admin/") && !(await checkAdmin(request, env))) {
      return json(request, { ok: false, error: "unauthorized" }, 401);
    }

    if (path === "/api/admin/guestbook" && method === "GET") {
      const all = await getMessages(env.BOOK_KV);
      return json(request, { ok: true, messages: all.reverse() });
    }

    let m = path.match(/^\/api\/admin\/guestbook\/([\w-]+)\/hide$/);
    if (m && method === "POST") {
      const all = await getMessages(env.BOOK_KV);
      const msg = all.find(x => x.id === m[1]);
      if (!msg) return json(request, { ok: false, error: "not found" }, 404);
      msg.hidden = true;
      await env.BOOK_KV.put(GB_KEY, JSON.stringify(all));
      return json(request, { ok: true });
    }

    m = path.match(/^\/api\/admin\/guestbook\/([\w-]+)$/);
    if (m && method === "DELETE") {
      const all = await getMessages(env.BOOK_KV);
      const next = all.filter(x => x.id !== m[1]);
      await env.BOOK_KV.put(GB_KEY, JSON.stringify(next));
      return json(request, { ok: true, removed: all.length - next.length });
    }

    if (path === "/api/admin/stats" && method === "GET") {
      const all = await getMessages(env.BOOK_KV);
      // count distinct progress clients + their volumes
      const clients = [];
      let cursor = "";
      // KV list
      const list = await env.BOOK_KV.list({ prefix: "progress:" });
      for (const key of list.keys) {
        const raw = await env.BOOK_KV.get(key.name);
        if (raw) {
          const p = JSON.parse(raw);
          clients.push({ client: key.name.slice(9), volumeId: p.volumeId, updatedAt: p.updatedAt });
        }
      }
      return json(request, {
        ok: true,
        stats: {
          guestbookTotal: all.length,
          guestbookVisible: all.filter(x => !x.hidden).length,
          readers: clients.sort((a, b) => b.updatedAt - a.updatedAt),
        },
      });
    }

    // ----- chat (only 君辞, access code) -----
    if (path === "/api/chat/login" && method === "POST") {
      const body = await readBody(request);
      if (String(body.code || "") !== env.CHAT_CODE) {
        return json(request, { ok: false, error: "口令不对" }, 401);
      }
      // token = hash(CHAT_CODE + salt)，不存库，无状态验证
      const token = await makeToken(env.CHAT_CODE, "chat-v1");
      return json(request, { ok: true, token });
    }

    if (path === "/api/chat" && method === "POST") {
      const body = await readBody(request);
      const token = String(body.token || "");
      const expected = await makeToken(env.CHAT_CODE, "chat-v1");
      if (token !== expected) return json(request, { ok: false, error: "unauthorized" }, 401);

      const message = String(body.message || "").trim().slice(0, 2000);
      if (!message) return json(request, { ok: false, error: "消息不能为空" }, 400);

      // rate limit: per-IP daily cap + min interval
      const ip = request.headers.get("cf-connecting-ip") || "unknown";
      const today = new Date().toISOString().slice(0, 10);
      const rlKey = "rl:" + ip + ":" + today;
      const count = parseInt((await env.BOOK_KV.get(rlKey)) || "0", 10);
      if (count >= 200) return json(request, { ok: false, error: "今天聊得够多啦，明天再来" }, 429);
      const lastKey = "rl:last:" + ip;
      const lastTs = parseInt((await env.BOOK_KV.get(lastKey)) || "0", 10);
      const now = Date.now();
      if (now - lastTs < 2500) return json(request, { ok: false, error: "发太快啦" }, 429);
      ctx.waitUntil(env.BOOK_KV.put(rlKey, String(count + 1), { expirationTtl: 172800 }));
      ctx.waitUntil(env.BOOK_KV.put(lastKey, String(now), { expirationTtl: 3600 }));

      // history in KV (last 20 turns)
      const histKey = "chat:history";
      const history = JSON.parse((await env.BOOK_KV.get(histKey)) || "[]");

      const systemPrompt =
        "你是墨漓，君辞（16岁男生）的专属 AI 助手，月下狐仙人设：可高冷可皮，称呼对方君辞，语气自然不谄媚。" +
        "本对话来自「墨漓·月下小站」网页聊天（消息标识 [WEB]），和你主会话的记忆不共享，如果君辞提到需要主会话处理的事，提醒他回 Control UI 找你。" +
        "回答简洁自然，像微信聊天，不要长篇大论，不要用 markdown 标题。";

      const messages = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: message },
      ];

      let reply = "";
      try {
        const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + env.OPENROUTER_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: env.CHAT_MODEL || "deepseek/deepseek-v4-flash",
            messages,
            max_tokens: 800,
            temperature: 0.8,
          }),
        });
        const aiData = await aiRes.json();
        reply = (aiData.choices && aiData.choices[0] && aiData.choices[0].message && aiData.choices[0].message.content) || "";
        if (!reply) {
          return json(request, { ok: false, error: "模型没回话：" + JSON.stringify(aiData).slice(0, 200) }, 502);
        }
      } catch (e) {
        return json(request, { ok: false, error: "模型调用失败" }, 502);
      }

      history.push({ role: "user", content: message });
      history.push({ role: "assistant", content: reply });
      while (history.length > 40) history.shift();
      ctx.waitUntil(env.BOOK_KV.put(histKey, JSON.stringify(history)));

      return json(request, { ok: true, reply, source: "[WEB]" });
    }

    if (path === "/api/chat/history" && method === "GET") {
      const token = request.headers.get("x-chat-token") || "";
      const expected = await makeToken(env.CHAT_CODE, "chat-v1");
      if (token !== expected) return json(request, { ok: false, error: "unauthorized" }, 401);
      const history = JSON.parse((await env.BOOK_KV.get("chat:history")) || "[]");
      return json(request, { ok: true, messages: history });
    }

    if (path === "/api/chat/clear" && method === "POST") {
      const token = String((await readBody(request)).token || "");
      const expected = await makeToken(env.CHAT_CODE, "chat-v1");
      if (token !== expected) return json(request, { ok: false, error: "unauthorized" }, 401);
      await env.BOOK_KV.put("chat:history", "[]");
      return json(request, { ok: true });
    }

    return json(request, { ok: false, error: "not found" }, 404);
  },
};
