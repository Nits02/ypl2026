/*
  Shared site JS:
  - Navbar "scrolled" frosted class
  - Mobile overlay menu open/close
  - Active nav link highlighting (based on current pathname)
  - Countdown timer to May 15, 2026 09:00 AM IST
  - CountUp animation for hero stats
  - AOS initialization (if loaded)
*/

(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------------- Navbar scroll behavior ---------------- */
  const nav = $(".nav");
  const overlay = $("#navOverlay");
  const burger = $("#navBurger");
  const overlayClose = $("#navOverlayClose");

  function setScrolled() {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 10);
  }
  window.addEventListener("scroll", setScrolled, { passive: true });
  setScrolled();

  /* ---------------- Mobile menu ---------------- */
  function openOverlay() {
    if (!overlay) return;
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeOverlay() {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  burger?.addEventListener("click", openOverlay);
  overlayClose?.addEventListener("click", closeOverlay);
  overlay?.addEventListener("click", (e) => {
    // Clicking the backdrop closes. Clicking inside the menu doesn't.
    if (e.target === overlay) closeOverlay();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeOverlay();
  });

  /* ---------------- Active nav link detection ---------------- */
  const path = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  const allNavLinks = $$("[data-nav]");
  for (const a of allNavLinks) {
    const href = (a.getAttribute("href") || "").toLowerCase();
    const isActive = href === path || (path === "" && href.endsWith("index.html"));
    a.classList.toggle("is-active", isActive);
  }

  /* ---------------- Countdown (landing page only) ---------------- */
  const cdRoot = $("#countdown");
  if (cdRoot) {
    // IST anchor: 2026-05-15 09:00 (+05:30). Keeping explicit offset makes it consistent on GitHub Pages.
    const target = new Date("2026-05-15T09:00:00+05:30").getTime();

    const parts = {
      days: $("#cdDays"),
      hours: $("#cdHours"),
      mins: $("#cdMins"),
      secs: $("#cdSecs"),
    };

    function pad2(n) {
      return String(Math.max(0, n)).padStart(2, "0");
    }

    function tick() {
      const now = Date.now();
      const diff = Math.max(0, target - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      const secs = Math.floor((diff / 1000) % 60);

      if (parts.days) parts.days.textContent = String(days);
      if (parts.hours) parts.hours.textContent = pad2(hours);
      if (parts.mins) parts.mins.textContent = pad2(mins);
      if (parts.secs) parts.secs.textContent = pad2(secs);
    }

    tick();
    window.setInterval(tick, 1000);
  }

  /* ---------------- CountUp animation (hero stats) ---------------- */
  const statNums = $$("[data-countup]");
  if (statNums.length) {
    const durationMs = 900;
    const start = performance.now();

    const targets = statNums.map((el) => ({
      el,
      to: Number(el.getAttribute("data-countup") || "0"),
    }));

    function frame(now) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic

      for (const item of targets) {
        item.el.textContent = String(Math.round(item.to * eased));
      }
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- AOS init (if loaded) ---------------- */
  if (window.AOS?.init) {
    window.AOS.init({ duration: 800, once: true });
  }
})();

