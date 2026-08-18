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

  /* ===== 启动 ===== */
  document.addEventListener("DOMContentLoaded", function () {
    buildStars();
    typeWriter();
    updateClock();
    setInterval(updateClock, 1000);
  });
})();
