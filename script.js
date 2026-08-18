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
    }

    function open() {
      if (!view) {
        build();
        renderList();
      }
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

  /* ===== 启动 ===== */
  document.addEventListener("DOMContentLoaded", function () {
    buildStars();
    typeWriter();
    updateClock();
    setInterval(updateClock, 1000);
    initLiquidGlass();
    initBookView();
  });
})();
