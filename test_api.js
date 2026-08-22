// 本地逻辑测试：用假 KV 跑 worker 的各接口
const worker = require("./api/src/index.js");

function makeEnv() {
  const store = new Map();
  return {
    ADMIN_PASSWORD: "test123",
    BOOK_KV: {
      async get(k) { return store.get(k) ?? null; },
      async put(k, v) { store.set(k, v); },
      async list(opts = {}) {
        const keys = [...store.keys()].filter(k => k.startsWith(opts.prefix || "")).map(name => ({ name }));
        return { keys };
      },
    },
  };
}

async function call(env, method, path, body, headers) {
  const req = new Request("https://x.test" + path, {
    method,
    headers: Object.assign({ "content-type": "application/json" }, headers || {}),
    body: body ? JSON.stringify(body) : undefined,
  });
  const res = await worker.default.fetch(req, env, {});
  return { status: res.status, data: await res.json() };
}

(async () => {
  const env = makeEnv();
  let pass = 0, fail = 0;
  function check(name, cond) {
    if (cond) { pass++; console.log("PASS", name); }
    else { fail++; console.log("FAIL", name); }
  }

  // guestbook empty
  let r = await call(env, "GET", "/api/guestbook");
  check("gb empty", r.data.ok && r.data.messages.length === 0);

  // post
  r = await call(env, "POST", "/api/guestbook", { name: "君辞", message: "墨漓加油" });
  check("gb post", r.data.ok);

  // flood control
  r = await call(env, "POST", "/api/guestbook", { name: "君辞", message: "墨漓加油" });
  check("gb flood blocked", r.status === 429);

  // list shows it
  r = await call(env, "GET", "/api/guestbook");
  check("gb list", r.data.messages.length === 1 && r.data.messages[0].name === "君辞");

  // progress put/get
  await call(env, "PUT", "/api/progress", { client: "c1", volumeId: "vol2" });
  r = await call(env, "GET", "/api/progress?client=c1");
  check("progress roundtrip", r.data.progress && r.data.progress.volumeId === "vol2");

  // admin login bad/good
  r = await call(env, "POST", "/api/admin/login", { password: "wrong" });
  check("admin bad login", r.status === 401);
  r = await call(env, "POST", "/api/admin/login", { password: "test123" });
  check("admin login", r.data.ok);
  const token = r.data.token;

  // admin unauthorized
  r = await call(env, "GET", "/api/admin/guestbook");
  check("admin no token", r.status === 401);

  // admin list + stats
  const id = (await call(env, "GET", "/api/admin/guestbook", null, { "x-admin-token": token })).data.messages[0].id;
  r = await call(env, "GET", "/api/admin/stats", null, { "x-admin-token": token });
  check("stats", r.data.stats.guestbookTotal === 1 && r.data.stats.readers.length === 1);

  // hide + verify public hides
  await call(env, "POST", `/api/admin/guestbook/${id}/hide`, {}, { "x-admin-token": token });
  r = await call(env, "GET", "/api/guestbook");
  check("hidden not public", r.data.messages.length === 0);

  // delete
  r = await call(env, "DELETE", `/api/admin/guestbook/${id}`, null, { "x-admin-token": token });
  check("delete", r.data.ok && r.data.removed === 1);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
