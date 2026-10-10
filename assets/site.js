(function () {
  var doc = document.documentElement;
  var body = document.body;

  // ---------- Preview expiry (replaced at deploy time from the .expires file) ----------
  var expires = "2026-10-12";
  if (/^\d{4}-\d{2}-\d{2}$/.test(expires) && new Date() >= new Date(expires + "T23:59:59")) {
    location.replace("expired.html");
    return;
  }

  // ---------- Copy deterrents (casual only) ----------
  var isField = function (el) { return el && el.closest && el.closest("input, textarea, select"); };
  ["contextmenu", "copy", "cut", "dragstart", "selectstart"].forEach(function (type) {
    document.addEventListener(type, function (e) { if (!isField(e.target)) e.preventDefault(); });
  });
  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase();
    var mod = e.ctrlKey || e.metaKey;
    if (mod && (k === "s" || k === "u" || k === "p")) e.preventDefault();
    if (mod && (k === "c" || k === "a") && !isField(e.target)) e.preventDefault();
    if (mod && e.altKey && (k === "i" || k === "j" || k === "u")) e.preventDefault();
    if (k === "f12") e.preventDefault();
  });

  // ---------- Header state ----------
  var onScroll = function () { body.classList.toggle("is-scrolled", window.scrollY > 24); };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // ---------- Mobile menu ----------
  var menuBtn = document.querySelector(".menu-btn");
  if (menuBtn) {
    var setMenu = function (open) {
      body.classList.toggle("menu-open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.textContent = open ? "Close" : "Menu";
      doc.style.overflow = open ? "hidden" : "";
    };
    menuBtn.addEventListener("click", function () { setMenu(!body.classList.contains("menu-open")); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
    document.querySelectorAll(".nav a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  }

  // ---------- Mobile hero: spinning ring of service badges ----------
  var row = document.querySelector(".services-row");
  if (row) {
    var mq = matchMedia("(max-width: 720px)");
    var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var items = Array.prototype.slice.call(row.querySelectorAll(".service"));
    var names = items.map(function (el) { return el.textContent.trim(); });
    var label = document.createElement("p"); label.className = "ring-label"; label.setAttribute("aria-hidden", "true");
    var hint = document.createElement("p"); hint.className = "ring-hint"; hint.setAttribute("aria-hidden", "true");
    hint.textContent = "Swipe to spin · tap to jump";
    row.appendChild(label); row.appendChild(hint);
    var step = Math.PI * 2 / items.length;
    var angle = 0, vel = 0, auto = still ? 0 : 0.0045, raf = 0, on = false, visible = true;
    var drag = null, moved = 0, front = -1;

    var layout = function () {
      var R = Math.min(row.clientWidth * 0.36, 150);
      var best = -2, bi = 0;
      items.forEach(function (el, i) {
        var t = angle + i * step;
        var z = Math.cos(t);
        var k = (z + 1) / 2;
        el.style.transform = "translate3d(" + (Math.sin(t) * R).toFixed(1) + "px," + (-(1 - k) * 30).toFixed(1) + "px,0) scale(" + (0.5 + 0.5 * k).toFixed(3) + ")";
        el.style.opacity = (0.3 + 0.7 * k).toFixed(3);
        el.style.zIndex = String(Math.round(k * 100));
        if (z > best) { best = z; bi = i; }
      });
      if (bi !== front) { front = bi; label.textContent = names[bi]; }
    };
    var tick = function () {
      if (!drag) {
        if (Math.abs(vel) > 0.0008) { angle += vel; vel *= 0.955; }
        else { vel = 0; angle -= auto; }
      }
      layout();
      raf = on && visible ? requestAnimationFrame(tick) : 0;
    };
    var start = function () { if (!raf && on && visible) raf = requestAnimationFrame(tick); };
    var enable = function () {
      on = mq.matches;
      row.classList.toggle("is-ring", on);
      if (on) { layout(); start(); }
      else { items.forEach(function (el) { el.style.transform = el.style.opacity = el.style.zIndex = ""; }); }
    };
    row.addEventListener("pointerdown", function (e) {
      if (!on) return;
      drag = { x: e.clientX, t: performance.now() }; moved = 0; vel = 0;
    });
    window.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var R = Math.min(row.clientWidth * 0.36, 150);
      var dx = e.clientX - drag.x, now = performance.now();
      angle += dx / R; moved += Math.abs(dx);
      vel = (dx / R) * Math.min(1, 16 / Math.max(1, now - drag.t)) * 1.4;
      drag.x = e.clientX; drag.t = now;
    });
    var end = function () { drag = null; };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    // A drag spins; a tap follows the link to that chapter
    items.forEach(function (el) {
      el.addEventListener("click", function (e) { if (on && moved > 6) e.preventDefault(); });
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; start(); }).observe(row);
    }
    mq.addEventListener ? mq.addEventListener("change", enable) : mq.addListener(enable);
    enable();
  }

  // ---------- Chapter index (home) ----------
  var chapters = document.querySelectorAll(".chapter");
  var indexLinks = document.querySelectorAll(".chapter-index a");
  if (chapters.length && indexLinks.length && "IntersectionObserver" in window) {
    var first = chapters[0];
    var last = chapters[chapters.length - 1];
    var updateBand = function () {
      var top = first.getBoundingClientRect().top;
      var bottom = last.getBoundingClientRect().bottom;
      var mid = window.innerHeight / 2;
      body.classList.toggle("in-chapters", top < mid && bottom > mid);
    };
    updateBand();
    window.addEventListener("scroll", updateBand, { passive: true });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        indexLinks.forEach(function (a) {
          var on = a.getAttribute("href") === "#" + entry.target.id;
          a.classList.toggle("is-active", on);
          if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    chapters.forEach(function (c) { io.observe(c); });
  }

  // ---------- Chapter reveal (one orchestrated entrance per chapter) ----------
  if (chapters.length && "IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    body.classList.add("js-reveal");
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); reveal.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -20% 0px" });
    chapters.forEach(function (c) { reveal.observe(c); });
  }

  // ---------- Contact form (no backend yet: composes an email) ----------
  var form = document.querySelector("#enquiry");
  if (form) {
    var status = form.querySelector(".form-status");
    var params = new URLSearchParams(location.search);
    var pre = params.get("service");
    if (pre) {
      var chip = form.querySelector('input[name="service"][value="' + pre + '"]');
      if (chip) chip.checked = true;
    }
    var fail = function (name, on) {
      var f = form.querySelector('[data-field="' + name + '"]');
      if (f) {
        f.classList.toggle("has-error", on);
        f.querySelectorAll("input, textarea").forEach(function (el) {
          if (on) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid");
        });
      }
      return on;
    };
    form.addEventListener("input", function (e) {
      var f = e.target.closest("[data-field]");
      if (f) fail(f.getAttribute("data-field"), false);
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var name = (data.get("name") || "").trim();
      var email = (data.get("email") || "").trim();
      var service = data.get("service");
      var message = (data.get("message") || "").trim();
      var bad = false;
      bad = fail("name", !name) || bad;
      bad = fail("email", !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || bad;
      bad = fail("service", !service) || bad;
      bad = fail("message", message.length < 10) || bad;
      if (bad) {
        status.className = "form-status";
        status.textContent = "A few details are missing. Check the highlighted fields.";
        var firstBad = form.querySelector(".has-error input, .has-error textarea");
        if (firstBad) firstBad.focus();
        return;
      }
      var lines = [
        "Name: " + name,
        "Email: " + email,
        "Service: " + service,
        data.get("date") ? "Date: " + data.get("date") : "",
        "",
        message
      ].filter(function (l, i) { return l !== "" || i === 4; });
      var to = form.getAttribute("data-to");
      location.href = "mailto:" + to + "?subject=" + encodeURIComponent("Enquiry: " + service + " (" + name + ")") +
        "&body=" + encodeURIComponent(lines.join("\n"));
      status.className = "form-status ok";
      status.textContent = "Your email app should open with the enquiry ready to send. Didn't open? Email " + to + " directly.";
    });
  }
})();
