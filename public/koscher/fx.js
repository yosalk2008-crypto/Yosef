/** Shared effects for "Ist das koscher?" and "Ist das halal?": sound, vibration, particles, counters. */
window.KTFX = (function () {
  "use strict";
  const reduced = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const SKEY = "kt-sound";
  let soundOn = true;
  try { soundOn = localStorage.getItem(SKEY) !== "0"; } catch (e) {}
  let ctx = null;
  const ac = () => {
    if (!soundOn) return null;
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    } catch (e) { return null; }
  };
  /** One enveloped oscillator note. */
  function tone(freq, t0, dur, type, vol, slideTo) {
    const c = ac();
    if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine";
    const t = c.currentTime + (t0 || 0);
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.03);
  }
  const sound = {
    get on() { return soundOn; },
    toggle() {
      soundOn = !soundOn;
      try { localStorage.setItem(SKEY, soundOn ? "1" : "0"); } catch (e) {}
      if (soundOn) tone(880, 0, 0.12, "triangle", 0.1);
      return soundOn;
    },
    coin(i) { tone(1175 * Math.pow(1.06, i || 0), 0, 0.09, "square", 0.05); tone(1568 * Math.pow(1.06, i || 0), 0.06, 0.22, "square", 0.05); },
    swipe() { tone(420, 0, 0.12, "sine", 0.06, 760); },
    wrong() { tone(196, 0, 0.18, "sawtooth", 0.08, 120); tone(147, 0.14, 0.3, "sawtooth", 0.08, 82); },
    win() { [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, k * 0.11, 0.3, "triangle", 0.11)); },
    engine(dur, lv) {
      const c = ac();
      if (!c) return;
      const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
      const t = c.currentTime, top = 150 + 60 * (lv || 1);
      o.type = "sawtooth"; o2.type = "square";
      for (const [osc, m] of [[o, 1], [o2, 0.5]]) {
        osc.frequency.setValueAtTime(58 * m, t);
        osc.frequency.exponentialRampToValueAtTime(top * m, t + dur * 0.45);
        osc.frequency.exponentialRampToValueAtTime(70 * m, t + dur);
      }
      f.type = "lowpass"; f.frequency.value = 700;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.07, t + 0.15);
      g.gain.setValueAtTime(0.07, t + dur * 0.75);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f); o2.connect(f); f.connect(g).connect(c.destination);
      o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
    },
    stall() { [0, 0.13, 0.26, 0.42].forEach((d, k) => tone(120 - k * 18, d, 0.1, "sawtooth", 0.09, 60)); },
    honk() { tone(440, 0, 0.14, "square", 0.06); tone(554, 0, 0.14, "square", 0.05); tone(440, 0.2, 0.26, "square", 0.06); tone(554, 0.2, 0.26, "square", 0.05); },
  };
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
    for (let k = 0; k < n; k++) {
      const p = document.createElement("i");
      p.className = "kfx-p kfx-" + kind;
      const ang = (opt.up ? -Math.PI / 2 + (Math.random() - 0.5) * 2.2 : Math.random() * Math.PI * 2);
      const v = (opt.power || 90) * (0.45 + Math.random() * 0.75);
      const dx = Math.cos(ang) * v, dy = Math.sin(ang) * v;
      const size = (opt.size || 8) * (0.6 + Math.random() * 0.9);
      p.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${kind === "paper" ? size * 0.55 : size}px;background-color:${kind === "coin" ? "transparent" : colors[k % colors.length]}`;
      document.body.appendChild(p);
      const dur = (opt.dur || 800) * (0.7 + Math.random() * 0.6);
      p.animate(
        [
          { transform: "translate(-50%,-50%) translate(0,0) rotate(0deg) scale(1)", opacity: 1 },
          { transform: `translate(-50%,-50%) translate(${dx}px,${dy}px) rotate(${Math.random() * 360}deg) scale(1)`, opacity: 1, offset: 0.55 },
          { transform: `translate(-50%,-50%) translate(${dx * 1.25}px,${dy + (opt.gravity == null ? 70 : opt.gravity)}px) rotate(${Math.random() * 720}deg) scale(.3)`, opacity: 0 },
        ],
        { duration: dur, easing: "cubic-bezier(.15,.7,.4,1)", fill: "forwards" }
      ).onfinish = () => p.remove();
    }
  }

  /** Things raining from the top of the screen. kind: "paper" | "coin". */
  function rain(n, kind, colors) {
    if (reduced()) return;
    colors = colors || ["#34d399", "#ffe27a", "#ffffff", "#f6a821", "#60a5fa", "#f472b6"];
    const w = window.innerWidth, h = window.innerHeight;
    for (let k = 0; k < n; k++) {
      const p = document.createElement("i");
      p.className = "kfx-p kfx-" + kind;
      const size = kind === "coin" ? 18 + Math.random() * 16 : 7 + Math.random() * 7;
      p.style.cssText = `left:${Math.random() * w}px;top:-30px;width:${size}px;height:${kind === "paper" ? size * 0.55 : size}px;background-color:${kind === "coin" ? "transparent" : colors[k % colors.length]}`;
      document.body.appendChild(p);
      const drift = (Math.random() - 0.5) * 160;
      p.animate(
        [
          { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
          { transform: `translate(${drift}px,${h + 60}px) rotate(${(Math.random() - 0.5) * 1400}deg)`, opacity: 1 },
        ],
        { duration: 1500 + Math.random() * 1600, delay: Math.random() * 900, easing: "cubic-bezier(.3,.1,.7,1)", fill: "forwards" }
      ).onfinish = () => p.remove();
    }
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

  const ICON_ON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
  const ICON_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
  const soundBtn = (labelOn, labelOff) =>
    `<button type="button" class="ksnd" data-snd aria-pressed="${soundOn}" aria-label="${soundOn ? labelOn : labelOff}" title="${soundOn ? labelOn : labelOff}">${soundOn ? ICON_ON : ICON_OFF}</button>`;
  /** Wires the sound button (delegated; call once per mount). */
  function bindSound(root, labelOn, labelOff) {
    const h = (e) => {
      const b = e.target.closest && e.target.closest("[data-snd]");
      if (!b) return;
      const on = sound.toggle();
      b.setAttribute("aria-pressed", String(on));
      b.setAttribute("aria-label", on ? labelOn : labelOff);
      b.title = on ? labelOn : labelOff;
      b.innerHTML = on ? ICON_ON : ICON_OFF;
    };
    root.addEventListener("click", h);
    return () => root.removeEventListener("click", h);
  }
  /** Same slug as lib/slug.ts – links each quiz question to its own page. */
  const slug = (s) =>
    String(s).toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");
  /** Shows the page of the current question in the address bar without reloading (counts as a page view). */
  function setPath(p) {
    const want = (window.KT_LANG === "en" ? "/en" : "") + p;
    if (location.pathname === want) return;
    try { history.replaceState(null, "", want + location.hash); } catch (e) {}
  }
  return { reduced, sound, vibrate, count, burst, rain, floatText, soundBtn, bindSound, slug, setPath };
})();
