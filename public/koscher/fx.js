/** Shared effects for "Ist das koscher?" and "Ist das halal?": sound, vibration, particles, counters. */
window.KTFX = (function () {
  "use strict";
  const reduced = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  /** Sound is switched off for good (it cost frames); the calls stay as no-ops. */
  const noop = () => {};
  const sound = { on: false, toggle: () => false, coin: noop, swipe: noop, wrong: noop, win: noop, engine: noop, stall: noop, honk: noop };
  const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

  /** Counts a number up inside an element. */
  function count(el, from, to, ms, suffix) {
    if (!el) return;
    const put = (v) => (el.textContent = String(v) + (suffix || ""));
    if (reduced() || from === to) return put(to);
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      if (!el.isConnected) return;
      put(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /** Particle burst from a point (viewport coordinates). kind: "spark" | "paper" | "coin". */
  function burst(x, y, n, kind, opt) {
    if (reduced()) return;
    opt = opt || {};
    const colors = opt.colors || ["#ffd75e", "#fff3b0", "#f6a821", "#ffffff"];
    const frag = document.createDocumentFragment(), anims = [];
    for (let k = 0; k < n; k++) {
      const p = document.createElement("i");
      p.className = "kfx-p kfx-" + kind;
      const ang = (opt.up ? -Math.PI / 2 + (Math.random() - 0.5) * 2.2 : Math.random() * Math.PI * 2);
      const v = (opt.power || 90) * (0.45 + Math.random() * 0.75);
      const dx = Math.cos(ang) * v, dy = Math.sin(ang) * v;
      const size = (opt.size || 8) * (0.6 + Math.random() * 0.9);
      p.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${kind === "paper" ? size * 0.55 : size}px;background-color:${kind === "coin" ? "transparent" : colors[k % colors.length]}`;
      frag.appendChild(p);
      const dur = (opt.dur || 800) * (0.7 + Math.random() * 0.6);
      anims.push(() => p.animate(
        [
          { transform: "translate(-50%,-50%) translate(0,0) rotate(0deg) scale(1)", opacity: 1 },
          { transform: `translate(-50%,-50%) translate(${dx}px,${dy}px) rotate(${Math.random() * 360}deg) scale(1)`, opacity: 1, offset: 0.55 },
          { transform: `translate(-50%,-50%) translate(${dx * 1.25}px,${dy + (opt.gravity == null ? 70 : opt.gravity)}px) rotate(${Math.random() * 720}deg) scale(.3)`, opacity: 0 },
        ],
        { duration: dur, easing: "cubic-bezier(.15,.7,.4,1)", fill: "forwards" }
      ).onfinish = () => p.remove());
    }
    document.body.appendChild(frag);
    anims.forEach((f) => f());
  }

  /** Things raining from the top of the screen. kind: "paper" | "coin". */
  function rain(n, kind, colors) {
    if (reduced()) return;
    colors = colors || ["#34d399", "#ffe27a", "#ffffff", "#f6a821", "#60a5fa", "#f472b6"];
    const w = window.innerWidth, h = window.innerHeight;
    const frag = document.createDocumentFragment(), anims = [];
    for (let k = 0; k < n; k++) {
      const p = document.createElement("i");
      p.className = "kfx-p kfx-" + kind;
      const size = kind === "coin" ? 18 + Math.random() * 16 : 7 + Math.random() * 7;
      p.style.cssText = `left:${Math.random() * w}px;top:-30px;width:${size}px;height:${kind === "paper" ? size * 0.55 : size}px;background-color:${kind === "coin" ? "transparent" : colors[k % colors.length]}`;
      frag.appendChild(p);
      const drift = (Math.random() - 0.5) * 160;
      anims.push(() => p.animate(
        [
          { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
          { transform: `translate(${drift}px,${h + 60}px) rotate(${(Math.random() - 0.5) * 1400}deg)`, opacity: 1 },
        ],
        { duration: 1500 + Math.random() * 1600, delay: Math.random() * 900, easing: "cubic-bezier(.3,.1,.7,1)", fill: "forwards" }
      ).onfinish = () => p.remove());
    }
    document.body.appendChild(frag);
    anims.forEach((f) => f());
  }

  /** "+30" label that floats up from a point (viewport coordinates). */
  function floatText(x, y, text, cls) {
    const el = document.createElement("b");
    el.className = "kfx-float " + (cls || "");
    el.textContent = text;
    el.style.left = x + "px";
    el.style.top = y + "px";
    document.body.appendChild(el);
    if (reduced()) return setTimeout(() => el.remove(), 900);
    el.animate(
      [
        { transform: "translate(-50%,-50%) scale(.4)", opacity: 0 },
        { transform: "translate(-50%,-90%) scale(1.25)", opacity: 1, offset: 0.25 },
        { transform: "translate(-50%,-190%) scale(1)", opacity: 1, offset: 0.75 },
        { transform: "translate(-50%,-240%) scale(.9)", opacity: 0 },
      ],
      { duration: 1300, easing: "ease-out", fill: "forwards" }
    ).onfinish = () => el.remove();
  }

  const soundBtn = () => "";
  const bindSound = () => () => {};
  /** Same slug as lib/slug.ts – links each quiz question to its own page. */
  const slug = (s) =>
    String(s).toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");
  /** Shows the page of the current question in the address bar without reloading (counts as a page view). */
  // Changing the URL makes Next.js re-render the page, which would stutter a running animation –
  // so the address bar is only updated once things have been quiet for a moment.
  let pathTimer = 0;
  function setPath(p) {
    const want = (window.KT_LANG === "en" ? "/en" : "") + p;
    clearTimeout(pathTimer);
    if (location.pathname === want) return;
    pathTimer = setTimeout(() => {
      const run = () => {
        if (location.pathname === want) return;
        try { history.replaceState(null, "", want + location.hash); } catch (e) {}
      };
      if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 1500 });
      else run();
    }, 1800);
  }
  return { reduced, sound, vibrate, count, burst, rain, floatText, soundBtn, bindSound, slug, setPath };
})();
