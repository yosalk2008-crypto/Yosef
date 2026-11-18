/**
 * Winner / loser animation for koshertrivia (Ist das koscher?, Ist das halal?, multiplayer).
 *   window.ktOutcome({ win: true, title: "Gewonnen!", sub: "8 von 10 richtig", place: 1, close: "Tippen zum Schließen" })
 * Full-screen overlay, closes on tap, Esc or after a few seconds. Only transforms and opacity are animated (GPU),
 * prefers-reduced-motion shows it without movement.
 */
(function () {
  "use strict";
  if (window.ktOutcome) return;

  const CSS = `
.kto{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;overflow:hidden;cursor:pointer;
  font-family:var(--font-display,ui-rounded,system-ui,sans-serif);text-align:center;color:#fff;-webkit-tap-highlight-color:transparent}
.kto *{box-sizing:border-box}
.kto-bg{position:absolute;inset:0;opacity:0;animation:kto-fade .35s ease-out forwards}
.kto-win .kto-bg{background:radial-gradient(circle at 50% 42%,#ffd65c,#f68c21 45%,#8c3408 100%)}
.kto-lose .kto-bg{background:radial-gradient(circle at 50% 38%,#5c6c87,#2a3448 60%,#121622 100%)}
.kto.out{animation:kto-out .32s ease-in forwards}
.kto-box{position:relative;display:flex;flex-direction:column;align-items:center;padding:24px;max-width:min(560px,92vw)}
.kto-rays{position:absolute;left:50%;top:42%;width:170vmax;height:170vmax;margin:-85vmax 0 0 -85vmax;opacity:0;
  background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.22) 0 9deg,rgba(255,255,255,0) 9deg 22.5deg);
  animation:kto-fade .6s .15s ease-out forwards,kto-spin 14s linear infinite;will-change:transform}
.kto-hero{width:min(220px,46vw);height:min(220px,46vw);position:relative;z-index:1;will-change:transform}
.kto-win .kto-hero{animation:kto-pop .8s .1s cubic-bezier(.2,1.6,.4,1) both}
.kto-win .kto-hero svg{animation:kto-bob 2.4s 1s ease-in-out infinite}
.kto-lose .kto-hero{animation:kto-drop .9s .25s cubic-bezier(.35,0,.25,1) both}
.kto-hero svg{width:100%;height:100%;display:block;filter:drop-shadow(0 10px 0 rgba(0,0,0,.18))}
.kto-place{position:absolute;left:50%;top:31%;transform:translate(-50%,-50%);font-size:min(54px,11vw);font-weight:800;color:#8a4b00}
.kto-lose .kto-place{color:#3b4456}
.kto-title{margin:14px 0 0;font-size:min(64px,13vw);line-height:1;font-weight:800;letter-spacing:-.01em;
  text-shadow:0 5px 0 rgba(0,0,0,.2);animation:kto-title .7s .45s cubic-bezier(.2,1.5,.4,1) both}
.kto-lose .kto-title{animation:kto-sad .9s .7s ease-out both}
.kto-sub{margin:10px 0 0;font-size:min(22px,5.2vw);font-weight:700;opacity:0;animation:kto-up .5s .8s ease-out forwards}
.kto-tap{margin:22px 0 0;font-size:15px;font-weight:600;opacity:0;animation:kto-tapin .5s 1.6s ease-out forwards}
.kto-conf{position:absolute;top:-6vh;width:11px;height:7px;border-radius:2px;opacity:0;will-change:transform;
  animation:kto-fall var(--d) var(--w) cubic-bezier(.3,.1,.7,1) forwards}
.kto-conf.c{width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff6c4,#ffcf3d 40%,#d98a00 100%)!important;box-shadow:inset 0 0 0 2px #b36b00}
.kto-star{position:absolute;width:16px;height:16px;opacity:0;animation:kto-twinkle 1.6s var(--w) ease-in-out infinite}
.kto-star::before{content:"";position:absolute;inset:0;background:#fff;clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%)}
.kto-cloud{position:relative;margin:0 0 -18px;width:min(240px,52vw);
  animation:kto-cloud 1s ease-out both}
.kto-cloud svg{width:100%;display:block}
.kto-drop{position:absolute;top:70%;width:3px;height:16px;border-radius:3px;background:#9fc3ff;opacity:0;
  animation:kto-rain .8s var(--w) linear infinite}
@keyframes kto-fade{to{opacity:1}}
@keyframes kto-out{to{opacity:0;transform:scale(1.04)}}
@keyframes kto-spin{to{transform:rotate(360deg)}}
@keyframes kto-pop{0%{transform:scale(0) rotate(-25deg)}100%{transform:scale(1) rotate(0)}}
@keyframes kto-bob{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-10px) rotate(2deg)}}
@keyframes kto-drop{0%{transform:translateY(-60vh) rotate(0)}55%{transform:translateY(0) rotate(0)}70%{transform:translateY(-14px) rotate(-6deg)}
  85%{transform:translateY(0) rotate(14deg)}100%{transform:translateY(6px) rotate(18deg)}}
@keyframes kto-title{0%{transform:scale(.3);opacity:0}100%{transform:scale(1);opacity:1}}
@keyframes kto-sad{0%{transform:translateY(-30px);opacity:0}40%{transform:translateY(0);opacity:1}55%{transform:translateX(-10px)}
  70%{transform:translateX(9px)}85%{transform:translateX(-5px)}100%{transform:translateX(0);opacity:1}}
@keyframes kto-up{0%{transform:translateY(12px);opacity:0}100%{transform:translateY(0);opacity:.95}}
@keyframes kto-tapin{to{opacity:.7}}
@keyframes kto-fall{0%{transform:translate3d(0,0,0) rotate(0);opacity:1}100%{transform:translate3d(var(--x),112vh,0) rotate(var(--r));opacity:1}}
@keyframes kto-twinkle{0%,100%{transform:scale(.2) rotate(0);opacity:0}50%{transform:scale(1) rotate(45deg);opacity:1}}
@keyframes kto-cloud{0%{transform:translateY(-40px);opacity:0}100%{transform:translateY(0);opacity:1}}
@keyframes kto-rain{0%{transform:translateY(0);opacity:0}15%{opacity:.9}100%{transform:translateY(28vh);opacity:0}}
@media (prefers-reduced-motion:reduce){.kto *,.kto{animation-duration:1ms!important;animation-iteration-count:1!important;animation-delay:0s!important}
  .kto-conf,.kto-drop,.kto-star,.kto-rays{display:none}}
`;

  const TROPHY = (gold, place) => {
    const a = gold ? "#ffe27a" : "#c3cad6", b = gold ? "#f6b21a" : "#8d97a8", c = gold ? "#c77a00" : "#5d6678", d = gold ? "#fff6cf" : "#e6eaf0";
    return `<svg viewBox="0 0 200 200" aria-hidden="true">
  <path d="M58 40h84v18c0 34-18 58-42 62-24-4-42-28-42-62z" fill="${b}"/>
  <path d="M62 40h76v16c0 30-16 52-38 56-22-4-38-26-38-56z" fill="${a}"/>
  <path d="M70 46c0 26 10 44 22 52-16-2-26-22-26-52z" fill="${d}" opacity=".8"/>
  <path d="M58 52H36c0 26 12 40 30 42l2-10c-12-2-20-12-21-24h11zM142 52h22c0 26-12 40-30 42l-2-10c12-2 20-12 21-24h-11z" fill="${b}"/>
  <rect x="91" y="118" width="18" height="24" fill="${c}"/>
  <path d="M70 142h60l8 22H62z" fill="${b}"/><rect x="56" y="162" width="88" height="14" rx="4" fill="${c}"/>
  ${gold ? `<path d="M100 58l6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2z" fill="#fff8d6"/>` : place ? "" : `<path d="M96 44l-8 22 12 6-10 24" fill="none" stroke="#5d6678" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`}
  <rect x="56" y="34" width="88" height="10" rx="4" fill="${c}"/>
</svg>`;
  };
  const CLOUD = `<svg viewBox="0 0 260 120" aria-hidden="true"><path d="M60 108c-28 0-46-18-46-40 0-21 17-38 39-39C62 12 80 2 101 2c24 0 44 15 50 36 6-3 13-5 21-5 25 0 45 19 46 43h4c19 0 34 14 34 32H60z" fill="#7b879c"/><path d="M60 108c-20 0-36-12-40-30 10 12 24 18 42 18h196v12z" fill="#5f6a7e"/></svg>`;

  function ensureCss() {
    if (document.getElementById("kto-css")) return;
    const s = document.createElement("style");
    s.id = "kto-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  let current = null;
  window.ktOutcome = function (o) {
    o = o || {};
    ensureCss();
    if (current) current.close(true);
    const win = !!o.win;
    const root = document.createElement("div");
    root.className = "kto " + (win ? "kto-win" : "kto-lose");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-live", "assertive");
    root.setAttribute("aria-label", o.title || "");
    let fx = "";
    if (win) {
      const colors = ["#ffffff", "#ffe27a", "#34d399", "#60a5fa", "#f472b6", "#a78bfa", "#fb7185"];
      for (let k = 0; k < 90; k++) {
        const coin = o.coins && k % 4 === 0;
        fx += `<i class="kto-conf${coin ? " c" : ""}" style="left:${(Math.random() * 100).toFixed(1)}%;background:${colors[k % colors.length]};--x:${((Math.random() - 0.5) * 260).toFixed(0)}px;--r:${((Math.random() - 0.5) * 1600).toFixed(0)}deg;--d:${(2.2 + Math.random() * 2).toFixed(2)}s;--w:${(0.25 + Math.random() * 1.6).toFixed(2)}s"></i>`;
      }
      for (let k = 0; k < 12; k++) fx += `<i class="kto-star" style="left:${(8 + Math.random() * 84).toFixed(1)}%;top:${(8 + Math.random() * 70).toFixed(1)}%;--w:${(Math.random() * 1.6).toFixed(2)}s"></i>`;
    }
    let drops = "";
    if (!win) for (let k = 0; k < 16; k++) drops += `<i class="kto-drop" style="left:${(12 + Math.random() * 76).toFixed(1)}%;--w:${(0.9 + Math.random() * 0.9).toFixed(2)}s"></i>`;
    root.innerHTML =
      `<div class="kto-bg"></div>${win ? `<div class="kto-rays"></div>` : ""}${fx}
      <div class="kto-box">
        ${win ? "" : `<div class="kto-cloud">${CLOUD}${drops}</div>`}
        <div class="kto-hero">${TROPHY(win, o.place)}${o.place ? `<span class="kto-place">${esc(o.place)}</span>` : ""}</div>
        <h2 class="kto-title">${esc(o.title || (win ? "Gewonnen!" : "Verloren"))}</h2>
        ${o.sub ? `<p class="kto-sub">${esc(o.sub)}</p>` : ""}
        <p class="kto-tap">${esc(o.close || (window.KT_LANG === "en" ? "Tap to close" : "Tippen zum Schließen"))}</p>
      </div>`;
    document.body.appendChild(root);
    try { navigator.vibrate && navigator.vibrate(win ? [30, 40, 30, 40, 90] : [160]); } catch (e) {}
    let done = false;
    const close = (now) => {
      if (done) return;
      done = true;
      document.removeEventListener("keydown", onKey);
      clearTimeout(timer);
      if (current && current.root === root) current = null;
      if (now) return root.remove();
      root.classList.add("out");
      setTimeout(() => root.remove(), 330);
      o.onClose && o.onClose();
    };
    const onKey = (e) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") close(); };
    root.addEventListener("click", () => close());
    document.addEventListener("keydown", onKey);
    const timer = setTimeout(close, o.ms || (win ? 4200 : 3400));
    current = { root, close };
    return { close };
  };
})();
