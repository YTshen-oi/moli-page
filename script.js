(function () {
  "use strict";

  /* ===== 静态星星背景 ===== */
  function buildStars() {
    var container = document.getElementById("stars");
    if (!container) return;
    var count = window.innerWidth < 700 ? 60 : 110;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var s = document.createElement("span");
      s.className = "star";
      s.style.left = Math.random() * 100 + "%";
      s.style.top = Math.random() * 100 + "%";
      s.style.animationDelay = Math.random() * 3.4 + "s";
      s.style.animationDuration = 2.6 + Math.random() * 2.4 + "s";
      var size = Math.random() < 0.85 ? 2 : 3;
      s.style.width = size + "px";
      s.style.height = size + "px";
      frag.appendChild(s);
    }
    container.appendChild(frag);
  }

  /* ===== 打字机欢迎语 ===== */
  function typeWriter() {
    var el = document.getElementById("typeText");
    if (!el) return;
    var text = "欢迎来到我的小站，君辞";
    var i = 0;
    var speed = 110;
    function step() {
      if (i <= text.length) {
        el.textContent = text.slice(0, i);
        i++;
        setTimeout(step, speed);
      }
    }
    step();
  }

  /* ===== 实时北京时间 ===== */
  var WEEK = ["日", "一", "二", "三", "四", "五", "六"];

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function updateClock() {
    var now = new Date();
    // 使用 Asia/Shanghai 时区格式化（+8 无夏令时）
    var parts = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).formatToParts(now);

    var map = {};
    parts.forEach(function (p) {
      map[p.type] = p.value;
    });

    var year = map.year;
    var month = map.month;
    var day = map.day;
    var hour = map.hour === "24" ? "00" : map.hour;
    var minute = map.minute;
    var second = map.second;

    var dateEl = document.getElementById("clockDate");
    var timeEl = document.getElementById("clockTime");
    var weekEl = document.getElementById("clockWeek");

    if (dateEl) dateEl.textContent = year + "年" + parseInt(month, 10) + "月" + parseInt(day, 10) + "日";
    if (timeEl) timeEl.textContent = hour + ":" + minute + ":" + second;
    if (weekEl) weekEl.textContent = "星期" + map.weekday;
  }

  /* ===== 点击粒子彩蛋 ===== */
  function spawnSpark(x, y) {
    var wrap = document.createElement("span");
    wrap.className = "spark";
    wrap.style.left = x + "px";
    wrap.style.top = y + "px";

    var count = 10;
    for (var i = 0; i < count; i++) {
      var dot = document.createElement("span");
      dot.className = "spark-dot";
      var angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      var dist = 26 + Math.random() * 44;
      var dx = Math.cos(angle) * dist;
      var dy = Math.sin(angle) * dist;
      dot.style.setProperty("--dx", dx + "px");
      dot.style.setProperty("--dy", dy + "px");
      dot.style.animation = "sparkFly " + (0.55 + Math.random() * 0.5) + "s ease-out forwards";
      wrap.appendChild(dot);
    }

    document.body.appendChild(wrap);
    setTimeout(function () {
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }, 1200);
  }

  document.addEventListener("click", function (e) {
    spawnSpark(e.clientX, e.clientY);
  });

  /* ===== 液态玻璃卡片：鼠标跟随流动高光 ===== */
  function initLiquidGlass() {
    // 触屏设备不绑定 mousemove，保持静态高光，避免手机卡顿
    if (window.matchMedia && window.matchMedia("(hover: none)").matches) return;

    var cards = document.querySelectorAll(".card");
    if (!cards.length) return;

    for (var i = 0; i < cards.length; i++) {
      (function (card) {
        card.addEventListener("mousemove", function (e) {
          var rect = card.getBoundingClientRect();
          var x = e.clientX - rect.left;
          var y = e.clientY - rect.top;
          var px = ((x / rect.width) * 100).toFixed(1) + "%";
          var py = ((y / rect.height) * 100).toFixed(1) + "%";
          card.style.setProperty("--glow-pos", px + " " + py);
        });
        card.addEventListener("mouseleave", function () {
          card.style.setProperty("--glow-pos", "50% 50%");
        });
      })(cards[i]);
    }
  }

  /* ===== 人生小书全屏视图 ===== */
  function initBookView() {
    var card = document.getElementById("book-card");
    if (!card || typeof window.BOOK_DATA === "undefined" || !window.BOOK_DATA.length) return;

    var data = window.BOOK_DATA;
    var shell = document.querySelector(".shell");
    var view = null;
    var mainEl = null;
    var readerEl = null;
    var listEl = null;
    var bodyEl = null;
    var readerTitleEl = null;
    var backHomeBtn = null;
    var backListBtn = null;
    var isOpen = false;

    function build() {
      view = document.createElement("div");
      view.className = "book-view";

      mainEl = document.createElement("div");
      mainEl.className = "book-main";

      var mainTopbar = document.createElement("div");
      mainTopbar.className = "book-topbar";

      backHomeBtn = document.createElement("button");
      backHomeBtn.type = "button";
      backHomeBtn.className = "book-btn";
      backHomeBtn.textContent = "← 返回主页";
      mainTopbar.appendChild(backHomeBtn);

      var mainTitle = document.createElement("div");
      mainTitle.className = "book-title";
      mainTitle.textContent = "人生小书";
      mainTopbar.appendChild(mainTitle);

      listEl = document.createElement("div");
      listEl.className = "book-list";

      mainEl.appendChild(mainTopbar);
      mainEl.appendChild(listEl);

      readerEl = document.createElement("div");
      readerEl.className = "book-reader";

      var readerTopbar = document.createElement("div");
      readerTopbar.className = "book-topbar";

      backListBtn = document.createElement("button");
      backListBtn.type = "button";
      backListBtn.className = "book-btn";
      backListBtn.textContent = "← 返回目录";
      readerTopbar.appendChild(backListBtn);

      readerTitleEl = document.createElement("div");
      readerTitleEl.className = "book-title";
      readerTitleEl.textContent = "";
      readerTopbar.appendChild(readerTitleEl);

      bodyEl = document.createElement("div");
      bodyEl.className = "book-body";

      readerEl.appendChild(readerTopbar);
      readerEl.appendChild(bodyEl);

      view.appendChild(mainEl);
      view.appendChild(readerEl);
      document.body.appendChild(view);

      backHomeBtn.addEventListener("click", close);
      backListBtn.addEventListener("click", showList);
    }

    function renderList() {
      listEl.innerHTML = "";
      for (var i = 0; i < data.length; i++) {
        (function (vol) {
          var item = document.createElement("button");
          item.type = "button";
          item.className = "book-item";

          var name = document.createElement("div");
          name.className = "book-item-title";
          name.textContent = vol.title;

          var meta = document.createElement("div");
          meta.className = "book-item-meta";
          meta.textContent = vol.date;

          var desc = document.createElement("div");
          desc.className = "book-item-desc";
          desc.textContent = vol.desc;

          item.appendChild(name);
          item.appendChild(meta);
          item.appendChild(desc);
          item.addEventListener("click", function () { showVolume(vol); });
          listEl.appendChild(item);
        })(data[i]);
      }
    }

    function addContinueBtn() {
      var lastId = null;
      try { lastId = localStorage.getItem("moli_last_volume"); } catch (e) {}
      if (!lastId) return;
      var vol = data.find(function (v) { return v.id === lastId; });
      if (!vol) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "book-item book-continue";
      btn.innerHTML = '<div class="book-item-title">↻ 继续阅读：' + vol.title + "</div>";
      btn.addEventListener("click", function () { showVolume(vol); });
      listEl.insertBefore(btn, listEl.firstChild);
    }

    function showList() {
      readerEl.classList.remove("show");
      mainEl.classList.add("show");
      listEl.scrollTop = 0;
    }

    function showVolume(vol) {
      readerTitleEl.textContent = vol.title;
      var html = vol.html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/, "");
      bodyEl.innerHTML = html;
      bodyEl.scrollTop = 0;
      mainEl.classList.remove("show");
      readerEl.classList.add("show");
      saveProgress(vol.id);
    }

    function open() {
      if (!view) {
        build();
        renderList();
      }
      var old = view.querySelector(".book-continue");
      if (old) old.remove();
      addContinueBtn();
      isOpen = true;
      shell.classList.add("fade-out");
      setTimeout(function () {
        if (!isOpen) return;
        shell.style.display = "none";
        view.classList.remove("leaving");
        view.classList.add("show");
        mainEl.classList.add("show");
        readerEl.classList.remove("show");
        listEl.scrollTop = 0;
        document.body.style.overflow = "hidden";
      }, 400);
    }

    function close() {
      if (!view) return;
      isOpen = false;
      view.classList.remove("show");
      view.classList.add("leaving");
      document.body.style.overflow = "";
      shell.style.display = "";
      void shell.offsetWidth;
      shell.classList.remove("fade-out");
      setTimeout(function () {
        view.classList.remove("leaving");
      }, 400);
    }

    function onKeydown(e) {
      if (e.key !== "Escape" && e.key !== "Esc") return;
      if (!isOpen) return;
      if (readerEl.classList.contains("show")) {
        showList();
      } else {
        close();
      }
    }

    card.addEventListener("click", open);
    document.addEventListener("keydown", onKeydown);
  }

  /* ===== 后端 API（留言板 + 阅读进度云同步） ===== */
  var API_BASE = (window.SITE_CONFIG && window.SITE_CONFIG.API_BASE) || "";

  function api(path, opts) {
    if (!API_BASE) return Promise.reject(new Error("api not configured"));
    return fetch(API_BASE + path, opts).then(function (r) { return r.json(); });
  }

  function getClientId() {
    var cid = null;
    try { cid = localStorage.getItem("moli_client_id"); } catch (e) {}
    if (!cid) {
      cid = "c-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
      try { localStorage.setItem("moli_client_id", cid); } catch (e) {}
    }
    return cid;
  }

  function saveProgress(volumeId) {
    try { localStorage.setItem("moli_last_volume", volumeId); } catch (e) {}
    api("/api/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client: getClientId(), volumeId: volumeId })
    }).catch(function () {}); // 离线/未配置时静默降级
  }

  function restoreProgress(cb) {
    api("/api/progress?client=" + encodeURIComponent(getClientId()))
      .then(function (res) {
        if (res && res.ok && res.progress && res.progress.volumeId) cb(res.progress.volumeId);
      })
      .catch(function () {});
  }

  /* ===== 留言板全屏视图 ===== */
  function initGuestbookView() {
    var card = document.getElementById("guestbook-card");
    if (!card) return;

    var shell = document.querySelector(".shell");
    var view = null, listEl = null, inputEl = null, nameEl = null, sendBtn = null;
    var backBtn = null, isOpen = false, sending = false;

    function build() {
      view = document.createElement("div");
      view.className = "book-view";

      var main = document.createElement("div");
      main.className = "book-main show";

      var topbar = document.createElement("div");
      topbar.className = "book-topbar";

      backBtn = document.createElement("button");
      backBtn.type = "button";
      backBtn.className = "book-btn";
      backBtn.textContent = "← 返回主页";
      topbar.appendChild(backBtn);

      var title = document.createElement("div");
      title.className = "book-title";
      title.textContent = "留言板";
      topbar.appendChild(title);

      listEl = document.createElement("div");
      listEl.className = "book-list gb-list";

      var form = document.createElement("div");
      form.className = "gb-form";

      nameEl = document.createElement("input");
      nameEl.className = "gb-input gb-name";
      nameEl.maxLength = 20;
      nameEl.placeholder = "称呼（可留空）";
      form.appendChild(nameEl);

      inputEl = document.createElement("textarea");
      inputEl.className = "gb-input gb-msg";
      inputEl.maxLength = 500;
      inputEl.placeholder = "写点什么…";
      form.appendChild(inputEl);

      sendBtn = document.createElement("button");
      sendBtn.type = "button";
      sendBtn.className = "book-btn gb-send";
      sendBtn.textContent = "送出 ✦";
      form.appendChild(sendBtn);

      main.appendChild(topbar);
      main.appendChild(listEl);
      main.appendChild(form);
      view.appendChild(main);
      document.body.appendChild(view);

      backBtn.addEventListener("click", close);
      sendBtn.addEventListener("click", send);
    }

    function esc(s) {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function render(messages) {
      listEl.innerHTML = "";
      if (!messages.length) {
        var empty = document.createElement("div");
        empty.className = "gb-empty";
        empty.textContent = API_BASE ? "还没有人留言，来做第一个吧" : "留言板还没接上后端，先占个位 (´･ω･`)";
        listEl.appendChild(empty);
        return;
      }
      messages.forEach(function (msg) {
        var item = document.createElement("div");
        item.className = "gb-item";
        var head = document.createElement("div");
        head.className = "gb-item-head";
        var who = document.createElement("span");
        who.className = "gb-item-name";
        who.textContent = msg.name || "匿名";
        var when = document.createElement("span");
        when.className = "gb-item-time";
        when.textContent = new Date(msg.ts).toLocaleString("zh-CN", { hour12: false });
        head.appendChild(who);
        head.appendChild(when);
        var body = document.createElement("div");
        body.className = "gb-item-body";
        body.textContent = msg.message;
        item.appendChild(head);
        item.appendChild(body);
        listEl.appendChild(item);
      });
    }

    function load() {
      if (!API_BASE) { render([]); return; }
      api("/api/guestbook")
        .then(function (res) { if (res && res.ok) render(res.messages); })
        .catch(function () { render([]); });
    }

    function send() {
      if (sending) return;
      var message = inputEl.value.trim();
      if (!message) return;
      sending = true;
      sendBtn.textContent = "送出中…";
      api("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameEl.value.trim(), message: message })
      })
        .then(function (res) {
          if (res && res.ok) {
            inputEl.value = "";
            load();
          } else {
            alert((res && res.error) || "发送失败");
          }
        })
        .catch(function () { alert("后端还没配置或不可达"); })
        .finally(function () {
          sending = false;
          sendBtn.textContent = "送出 ✦";
        });
    }

    function open() {
      if (!view) build();
      isOpen = true;
      shell.classList.add("fade-out");
      setTimeout(function () {
        if (!isOpen) return;
        shell.style.display = "none";
        view.classList.remove("leaving");
        view.classList.add("show");
        load();
        document.body.style.overflow = "hidden";
      }, 400);
    }

    function close() {
      if (!view) return;
      isOpen = false;
      view.classList.remove("show");
      view.classList.add("leaving");
      document.body.style.overflow = "";
      shell.style.display = "";
      void shell.offsetWidth;
      shell.classList.remove("fade-out");
      setTimeout(function () { view.classList.remove("leaving"); }, 400);
    }

    card.addEventListener("click", open);
  }

  /* ===== 启动 ===== */
  document.addEventListener("DOMContentLoaded", function () {
    buildStars();
    typeWriter();
    updateClock();
    setInterval(updateClock, 1000);
    initLiquidGlass();
    initBookView();
    initGuestbookView();
  });
})();
