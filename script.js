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

  /* ===== 人生小书弹窗 ===== */
  function initBookModal() {
    var card = document.getElementById("book-card");
    if (!card || typeof window.BOOK_DATA === "undefined" || !window.BOOK_DATA.length) return;

    var data = window.BOOK_DATA;
    var overlay = null;
    var modal = null;
    var listEl = null;
    var bodyEl = null;
    var titleEl = null;
    var backBtn = null;

    function build() {
      overlay = document.createElement("div");
      overlay.className = "modal-overlay";

      modal = document.createElement("div");
      modal.className = "modal";

      var header = document.createElement("div");
      header.className = "modal-header";

      backBtn = document.createElement("button");
      backBtn.type = "button";
      backBtn.className = "modal-back";
      backBtn.textContent = "← 返回目录";
      backBtn.style.display = "none";
      header.appendChild(backBtn);

      titleEl = document.createElement("div");
      titleEl.className = "modal-title";
      titleEl.textContent = "人生小书";
      header.appendChild(titleEl);

      var closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "modal-close";
      closeBtn.setAttribute("aria-label", "关闭");
      closeBtn.textContent = "✕";
      header.appendChild(closeBtn);

      listEl = document.createElement("div");
      listEl.className = "modal-list";

      bodyEl = document.createElement("div");
      bodyEl.className = "modal-body";
      bodyEl.style.display = "none";

      modal.appendChild(header);
      modal.appendChild(listEl);
      modal.appendChild(bodyEl);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      closeBtn.addEventListener("click", close);
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) close();
      });
      backBtn.addEventListener("click", showList);
    }

    function renderList() {
      listEl.innerHTML = "";
      for (var i = 0; i < data.length; i++) {
        (function (vol) {
          var item = document.createElement("button");
          item.type = "button";
          item.className = "modal-item";

          var name = document.createElement("div");
          name.className = "modal-item-title";
          name.textContent = vol.title;

          var meta = document.createElement("div");
          meta.className = "modal-item-meta";
          meta.textContent = vol.date;

          var desc = document.createElement("div");
          desc.className = "modal-item-desc";
          desc.textContent = vol.desc;

          item.appendChild(name);
          item.appendChild(meta);
          item.appendChild(desc);
          item.addEventListener("click", function () { showVolume(vol); });
          listEl.appendChild(item);
        })(data[i]);
      }
    }

    function showList() {
      listEl.style.display = "";
      bodyEl.style.display = "none";
      backBtn.style.display = "none";
      titleEl.textContent = "人生小书";
      listEl.scrollTop = 0;
    }

    function showVolume(vol) {
      listEl.style.display = "none";
      bodyEl.style.display = "";
      backBtn.style.display = "";
      titleEl.textContent = vol.title;
      var html = vol.html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/, "");
      bodyEl.innerHTML = html;
      bodyEl.scrollTop = 0;
    }

    function open() {
      if (!overlay) {
        build();
        renderList();
      }
      overlay.style.display = "flex";
      document.body.style.overflow = "hidden";
      showList();
    }

    function close() {
      if (!overlay) return;
      overlay.style.display = "none";
      document.body.style.overflow = "";
    }

    function onKeydown(e) {
      if (e.key === "Escape" || e.key === "Esc") {
        close();
      }
    }

    card.addEventListener("click", open);
    document.addEventListener("keydown", onKeydown);
  }

  /* ===== 启动 ===== */
  document.addEventListener("DOMContentLoaded", function () {
    buildStars();
    typeWriter();
    updateClock();
    setInterval(updateClock, 1000);
    initLiquidGlass();
    initBookModal();
  });
})();
