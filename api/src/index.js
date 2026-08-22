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

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,x-admin-token",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
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
async function makeToken(secret, password) {
  const data = new TextEncoder().encode(password + ":" + secret);
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
      return new Response(null, { status: 204, headers: CORS });
    }

    // ----- public: guestbook -----
    if (path === "/api/guestbook" && method === "GET") {
      const all = await getMessages(env.BOOK_KV);
      const visible = all.filter(m => !m.hidden);
      return json({ ok: true, messages: visible.reverse().slice(-100) });
    }

    if (path === "/api/guestbook" && method === "POST") {
      const body = await readBody(request);
      const name = String(body.name || "").trim().slice(0, 20) || "匿名";
      const message = String(body.message || "").trim().slice(0, 500);
      if (!message) return json({ ok: false, error: "留言不能为空" }, 400);

      const all = await getMessages(env.BOOK_KV);
      // simple flood control: same content within 60s
      const now = Date.now();
      if (all.some(m => m.message === message && now - m.ts < 60000)) {
        return json({ ok: false, error: "这条刚发过，休息一下" }, 429);
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
      return json({ ok: true });
    }

    // ----- public: reading progress -----
    if (path === "/api/progress" && method === "GET") {
      const client = url.searchParams.get("client");
      if (!client) return json({ ok: false, error: "missing client" }, 400);
      const raw = await env.BOOK_KV.get("progress:" + client);
      return json({ ok: true, progress: raw ? JSON.parse(raw) : null });
    }

    if (path === "/api/progress" && method === "PUT") {
      const body = await readBody(request);
      const client = String(body.client || "").slice(0, 64);
      const volumeId = String(body.volumeId || "").slice(0, 64);
      if (!client || !volumeId) return json({ ok: false, error: "bad params" }, 400);
      await env.BOOK_KV.put(
        "progress:" + client,
        JSON.stringify({ volumeId, updatedAt: Date.now() })
      );
      return json({ ok: true });
    }

    // ----- admin -----
    if (path === "/api/admin/login" && method === "POST") {
      const body = await readBody(request);
      if (String(body.password || "") !== env.ADMIN_PASSWORD) {
        return json({ ok: false, error: "密码不对" }, 401);
      }
      return json({ ok: true, token: await makeToken(env.ADMIN_PASSWORD, env.ADMIN_PASSWORD) });
    }

    if (path.startsWith("/api/admin/") && !(await checkAdmin(request, env))) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }

    if (path === "/api/admin/guestbook" && method === "GET") {
      const all = await getMessages(env.BOOK_KV);
      return json({ ok: true, messages: all.reverse() });
    }

    let m = path.match(/^\/api\/admin\/guestbook\/([\w-]+)\/hide$/);
    if (m && method === "POST") {
      const all = await getMessages(env.BOOK_KV);
      const msg = all.find(x => x.id === m[1]);
      if (!msg) return json({ ok: false, error: "not found" }, 404);
      msg.hidden = true;
      await env.BOOK_KV.put(GB_KEY, JSON.stringify(all));
      return json({ ok: true });
    }

    m = path.match(/^\/api\/admin\/guestbook\/([\w-]+)$/);
    if (m && method === "DELETE") {
      const all = await getMessages(env.BOOK_KV);
      const next = all.filter(x => x.id !== m[1]);
      await env.BOOK_KV.put(GB_KEY, JSON.stringify(next));
      return json({ ok: true, removed: all.length - next.length });
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
      return json({
        ok: true,
        stats: {
          guestbookTotal: all.length,
          guestbookVisible: all.filter(x => !x.hidden).length,
          readers: clients.sort((a, b) => b.updatedAt - a.updatedAt),
        },
      });
    }

    return json({ ok: false, error: "not found" }, 404);
  },
};
