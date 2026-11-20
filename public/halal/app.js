/** Mounts the "Ist das halal?" quiz into an element on geoduels.de/halal. Returns a cleanup function. */
window.mountHalal = function (app) {
  "use strict";
  const EN = window.KT_LANG === "en";
  const T = (de, en) => (EN ? en : de);
  const BASE = EN ? "/en" : "";
  const CAT_EN = { Alle: "All", Essen: "Food", Schabbat: "Shabbat", Feiertage: "Holidays", "Körper": "Body", Alltag: "Everyday life", Geld: "Money", "Gebet & Fasten": "Prayer & fasting", Miteinander: "Relationships" };
  const catName = (c) => (EN ? CAT_EN[c] || c : c);
  const Q = window.HALAL;
  const ROUND = 10;
  const CATS = ["Alle", "Essen", "Geld", "Gebet & Fasten", "Miteinander", "Körper", "Alltag"];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const food = () => false;
  const LABEL = { halal: "Halal", haram: "Haram", makruh: "Makruh", kommt: T("Kommt drauf an", "It depends") };
  const QE = window.HALAL_EN || {};
  const qq = (q) => (EN && QE[q.q] ? QE[q.q][0] : q.q);
  const qe = (q) => (EN && QE[q.q] ? QE[q.q][1] : q.e);
  const qs = (q) => (EN && QE[q.q] ? QE[q.q][2] : q.src);
  const PROBE_EN = { Sportwetten: "Sports betting", Heuschrecken: "Locusts", "Vape mit Nikotin": "Vaping with nicotine", Kredite: "Loans", "Nur am Freitag fasten": "Fasting only on Friday", "Energy-Drink": "Energy drink" };
  const stampText = (a) => LABEL[a];
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const stamp = (a, isFood, slam = true) => `<span class="stamp ${a}${slam ? " slam" : ""}" role="img" aria-label="${stampText(a, isFood)}">${stampText(a, isFood)}</span>`;

  /** Dark header band at the top of every page (like Firmengrafik), content goes below on white. */
  const band = (inner, cls = "") =>
    `<section class="band ${cls}"><div class="glow" aria-hidden="true"></div><div class="wrap">
      <nav class="knav" aria-label="${T("Ist das halal?", "Is it halal?")}">
        <a href="#/" class="kbrand"><span class="seal" aria-hidden="true">?</span>${T("Ist das halal?", "Is it halal?")}</a>
        ${window.KTFX.soundBtn(T("Ton an", "Sound on"), T("Ton aus", "Sound off"))}
      </nav>${inner}</div></section>`;

  function setNav(route) {
    app.querySelectorAll(".klinks a").forEach((a) => {
      if (a.getAttribute("href") === "#/" + route) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  // ---------- Home ----------
  const PROBES = [
    ["Geld", "Sportwetten", "haram"],
    ["Essen", "Heuschrecken", "halal"],
    ["Essen", "Vape mit Nikotin", "haram"],
    ["Geld", "Kredite", "kommt"],
    ["Gebet & Fasten", "Nur am Freitag fasten", "makruh"],
    ["Essen", "Energy-Drink", "halal"],
  ];
  function home() {
    window.KTFX.setPath("/halal");
    const [cat, item, a] = PROBES[Math.floor(Math.random() * PROBES.length)];
    app.innerHTML =
      band(
        `<div class="hero">
          <div>
            <span class="pill"><i></i>${Q.length} ${T("Fragen · Essen, Geld, Gebet, Alltag", "questions · food, money, prayer, everyday life")}</span>
            <h1>${T("Ist das", "Is it")} <span class="grad">halal?</span></h1>
            <p class="lead">${T("Vape, Sportwetten, Zinsen, Kredite: Rate, was im Islam erlaubt ist – mit Quellen aus Quran, Tafsir, Bukhari und Muslim.", "Vaping, sports betting, interest, loans: guess what Islam allows – with sources from the Quran, Tafsir, Bukhari and Muslim.")}</p>
            <div class="actions">
              <a class="btn light" href="#/quiz">${T("Tagesquiz starten", "Start daily quiz")}</a>
              <a class="btn outline" href="${BASE}/halal/fragen">${T("Alle Fragen ansehen", "Browse all questions")}</a>
            </div>
          </div>
          <div class="stage">
            <div class="disc" aria-hidden="true"></div>
            <svg class="star" viewBox="-50 -50 100 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><rect x="-30" y="-30" width="60" height="60"/><rect x="-30" y="-30" width="60" height="60" transform="rotate(45)"/><circle r="13"/><rect x="-42" y="-42" width="84" height="84" rx="4" opacity=".35"/><rect x="-42" y="-42" width="84" height="84" rx="4" transform="rotate(45)" opacity=".35"/></g></svg>
            <div class="probe">
              <small>${esc(catName(cat))}</small>
              <p>${esc(EN ? PROBE_EN[item] || item : item)}</p>
              <span id="probe-stamp"></span>
            </div>
          </div>
        </div>`,
        "big"
      ) +
      "";
    setTimeout(() => {
      const el = document.getElementById("probe-stamp");
      if (el) el.outerHTML = stamp(a);
    }, 650);
  }

  // ---------- Quiz ----------
  const FX = window.KTFX;
  const ART = window.KT_ART || {};
  const LVL = { 1: { de: "Leicht", en: "Easy", n: 10 }, 2: { de: "Mittel", en: "Medium", n: 20 }, 3: { de: "Schwer", en: "Hard", n: 30 } };
  const lvOf = (q) => LVL[q.lv] || LVL[2];
  const worth = (q) => lvOf(q).n;
  const lvN = (q) => q.lv || 2;
  const KEY = "kt-daily-halal";
  const berlinDay = () => {
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); }
  };
  const dayLabel = (d) => new Date(d + "T12:00:00").toLocaleDateString(EN ? "en-GB" : "de-DE", { day: "numeric", month: "long" });
  function dailySet() {
    const days = [...new Set(Q.filter((q) => q.d).map((q) => q.d))].sort();
    if (!days.length) return { day: berlinDay(), qs: shuffle(Q).slice(0, ROUND) };
    const t = berlinDay();
    const day = days.filter((d) => d <= t).pop() || days[0];
    return { day, qs: Q.filter((q) => q.d === day) };
  }
  const loadDone = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } };
  const saveDone = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };

  let quiz = null;
  // free play: "rookie" = easy + medium questions, "boss" (Imam) = the hard ones
  const LVKEY = "kt-level-halal";
  let level = (() => { try { return localStorage.getItem(LVKEY) === "boss" ? "boss" : "rookie"; } catch (e) { return "rookie"; } })();
  const LEVELS = { rookie: ["Rookie", "Rookie", "leicht & mittel", "easy & medium"], boss: ["Imam", "Imam", "schwer", "hard"] };
  function levelPool(pool) {
    const lv = (q) => q.lv || 2;
    if (level === "rookie") return shuffle(pool.filter((q) => lv(q) <= 2)).slice(0, ROUND);
    // hard questions first; topics with only a few of them are topped up with medium ones
    const hard = shuffle(pool.filter((q) => lv(q) === 3)).slice(0, ROUND);
    return hard.length >= ROUND ? hard : shuffle([...hard, ...shuffle(pool.filter((q) => lv(q) === 2)).slice(0, ROUND - hard.length)]);
  }
  function newQuiz(mode, cat) {
    if (mode === "free") {
      cat = cat || "Alle";
      const pool = cat === "Alle" ? Q : Q.filter((q) => q.cat === cat);
      quiz = { mode, cat, level, qs: levelPool(pool), i: 0, picks: [], km: 0, prev: 0 };
    } else {
      const d = dailySet();
      quiz = { mode: "daily", cat: "Alle", day: d.day, qs: shuffle(d.qs), i: 0, picks: [], km: 0, prev: 0 };
    }
  }
  const total = () => quiz.qs.reduce((s, q) => s + worth(q), 0);

  // ----- Road scene (landscape, car and treasure art come from Figma, see /koscher/art.js and /halal/art/) -----
  const PXK = 18; // road pixels per km
  const GATE = `<svg viewBox="0 0 150 170" aria-hidden="true"><defs><pattern id="hchk" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#fff"/><rect width="10" height="10" fill="#14282d"/><rect x="10" y="10" width="10" height="10" fill="#14282d"/></pattern></defs><g stroke="#14282d" stroke-width="4" stroke-linejoin="round"><rect x="12" y="20" width="12" height="148" rx="4" fill="#e0524a"/><rect x="126" y="20" width="12" height="148" rx="4" fill="#e0524a"/><path d="M12 60h12M12 100h12M12 140h12M126 60h12M126 100h12M126 140h12" stroke="#fff" stroke-width="7"/><rect x="6" y="8" width="138" height="40" rx="6" fill="url(#hchk)"/></g><circle cx="18" cy="12" r="8" fill="#ffe27a" stroke="#14282d" stroke-width="4"/><circle cx="132" cy="12" r="8" fill="#ffe27a" stroke="#14282d" stroke-width="4"/></svg>`;
  const scene = (km, tot, cls = "") => {
    const signs = [];
    for (let s = 50; s < tot; s += 50) signs.push(`<span class="sign" style="--k:${s}"><b>${s}</b><i></i></span>`);
    return `<div class="scene ${cls}" id="scene" data-total="${tot}" role="img" aria-label="${T("Ein Auto fährt durch eine Landschaft zum Ziel", "A car drives through a landscape to the finish")}">
      <div class="ly sky"></div><div class="ly dunes"><i></i></div><div class="ly clouds"><i></i></div><div class="ly mid"><i></i></div><div class="ly front"><i></i></div>
      <div class="road"><div class="lane"><i></i></div></div>
      <div class="world">${signs.join("")}<span class="gate" style="--k:${tot}">${GATE}</span></div>
      <div class="lines" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="carbox" id="carbox"><i class="flame"></i><i class="puff p1"></i><i class="puff p2"></i><i class="puff p3"></i><div class="carbody">${ART.car || ""}<i class="haz h1"></i><i class="haz h2"></i></div><i class="shadow"></i></div>
      <div class="hud"><b><span id="kmnum">${km}</span> km</b></div>
      <div class="hud r">${T("Ziel", "Finish")} ${tot} km</div>
    </div>`;
  };
  /**
   * Everything the scene needs per frame, looked up and measured once – the frame loop then only writes
   * transforms (GPU), never reads layout, so the drive stays smooth at the display's full frame rate.
   */
  let SC = null;
  function sceneRefs() {
    const sc = document.getElementById("scene");
    if (!sc) return (SC = null);
    if (SC && SC.sc === sc) {
      if (!SC.mfill || !SC.mfill.isConnected) {
        SC.mfill = document.getElementById("mfill");
        SC.mrun = document.getElementById("mrun");
      }
      return SC;
    }
    const tile = Math.round((sc.querySelector(".ly.dunes")?.offsetHeight || 178) * 8); // landscape art is 3200 × 400
    sc.style.setProperty("--tw", tile + "px");
    const layer = (sel, f) => ({ el: sc.querySelector(sel), f });
    const car = sc.querySelector(".kcar");
    SC = {
      sc,
      tile,
      layers: [layer(".dunes > i", 0.06), layer(".mid > i", 0.3), layer(".front > i", 0.62)],
      lane: sc.querySelector(".lane > i"),
      world: sc.querySelector(".world"),
      spin: car ? [...car.querySelectorAll(".spin")] : [],
      wheel: (car?.getBoundingClientRect().width || 138) * 0.094 || 12,
      tot: +sc.dataset.total || 1,
      mfill: document.getElementById("mfill"),
      mrun: document.getElementById("mrun"),
      num: document.getElementById("kmnum"),
      shown: null,
      fast: false,
    };
    return SC;
  }
  /** Puts every layer of the scene at the given distance. */
  function place(km) {
    const r = sceneRefs();
    if (!r) return;
    const X = km * PXK;
    for (const l of r.layers) if (l.el) l.el.style.transform = `translate3d(${-((X * l.f) % r.tile)}px,0,0)`;
    if (r.lane) r.lane.style.transform = `translate3d(${-(X % 60)}px,0,0)`;
    if (r.world) r.world.style.transform = `translate3d(${-X}px,0,0)`;
    const deg = ((X / r.wheel) * 57.3) % 360;
    if (r.spin[0]) r.spin[0].setAttribute("transform", `rotate(${deg.toFixed(1)} 180 254)`);
    if (r.spin[1]) r.spin[1].setAttribute("transform", `rotate(${deg.toFixed(1)} 465 254)`);
    const f = Math.min(1, km / r.tot);
    if (r.mfill) r.mfill.style.transform = `scaleX(${f})`;
    if (r.mrun) r.mrun.style.transform = `translate3d(${f * 100}%,0,0)`;
    const n = Math.round(km);
    if (r.num && r.shown !== n) {
      r.shown = n;
      r.num.textContent = String(n);
    }
  }
  let raf = 0;
  /** Drives from one km value to another: parallax, spinning wheels, dust, speed lines, engine sound. */
  function driveTo(from, to, lv, done) {
    const sc = document.getElementById("scene"), box = document.getElementById("carbox");
    cancelAnimationFrame(raf);
    if (!sc || !box || FX.reduced() || from === to) {
      place(to);
      return done && done();
    }
    const R = sceneRefs();
    const dur = 1100 + (to - from) * 45;
    FX.sound.engine(dur / 1000, lv);
    sc.classList.add("driving");
    if (lv >= 3) box.classList.add("nitro");
    const body = box.querySelector(".carbody");
    const t0 = performance.now();
    let last = from, lastDust = 0;
    const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
    const step = (now) => {
      if (!sc.isConnected) return;
      const p = Math.min(1, (now - t0) / dur);
      const km = from + (to - from) * ease(p);
      const v = km - last;
      last = km;
      place(km);
      const fast = v > 0.12;
      if (fast !== R.fast) {
        R.fast = fast;
        sc.classList.toggle("fast", fast);
      }
      if (body) body.style.transform = `translateY(${Math.sin(now / 45) * Math.min(2.2, v * 9)}px) rotate(${p < 0.5 ? -Math.min(2.4, v * 9) : Math.min(1.6, (1 - p) * 4)}deg)`;
      if (v > 0.05 && now - lastDust > 70) {
        lastDust = now;
        const d = document.createElement("i");
        d.className = "dust";
        d.style.setProperty("--r", (0.6 + Math.random() * 0.9).toFixed(2));
        d.style.setProperty("--y", (-8 - Math.random() * 26).toFixed(0) + "px");
        box.appendChild(d);
        setTimeout(() => d.remove(), 700);
      }
      if (p < 1) raf = requestAnimationFrame(step);
      else {
        sc.classList.remove("driving", "fast");
        R.fast = false;
        box.classList.remove("nitro");
        if (body) body.style.transform = "";
        done && done();
      }
    };
    raf = requestAnimationFrame(step);
  }
  function stall() {
    FX.sound.stall();
    FX.vibrate([50, 40, 50, 40, 80]);
    document.getElementById("carbox")?.classList.add("stall");
    document.getElementById("scene")?.classList.add("quake");
  }
  /** Point above the car in viewport coordinates. */
  const carTop = () => {
    const r = document.getElementById("carbox")?.getBoundingClientRect();
    return r ? [r.left + r.width / 2, r.top] : [window.innerWidth / 2, 200];
  };
  const mdots = () =>
    quiz.qs
      .map((q, k) => {
        const p = quiz.picks[k];
        return `<i class="l${lvN(q)}${p ? (p === q.a ? " ok" : " no") : k === quiz.i ? " cur" : ""}"></i>`;
      })
      .join("");

  function quizView() {
    if (!quiz) newQuiz("daily");
    if (quiz.mode === "daily" && !quiz.replay && quiz.i === 0 && !quiz.picks.length) {
      const done = loadDone();
      if (done && done.day === quiz.day) return doneView(done);
    }
    if (quiz.i >= quiz.qs.length) return resultView();
    const q = quiz.qs[quiz.i];
    FX.setPath(`/halal/frage/${FX.slug(q.q)}`);
    const picked = quiz.picks[quiz.i];
    const L = lvOf(q);
    const tot = total();
    const opts = [
      ["halal", "✓", "Halal"],
      ["haram", "✕", "Haram"],
      ["makruh", "–", "Makruh"],
      ["kommt", "≈", LABEL.kommt],
    ];
    const right = quiz.picks.filter((p, k) => p === quiz.qs[k].a).length;
    const hit = picked && picked === q.a;
    // keep the running scene (landscape, car, decoded images) instead of rebuilding it for every question
    const keep = document.getElementById("scene");
    const reuse = keep && !keep.classList.contains("end") && keep.dataset.total === String(tot) ? keep : null;
    if (reuse) reuse.remove();
    app.innerHTML =
      band(
        `<div class="quiz"><h1>Quiz</h1>
        <div class="cats" role="group" aria-label="${T("Modus", "Mode")}">
          <button type="button" class="chip" data-mode="daily" aria-pressed="${quiz.mode === "daily"}">${T("Tagesquiz", "Daily quiz")}</button>
          <button type="button" class="chip" data-mode="free" aria-pressed="${quiz.mode === "free"}">${T("Freies Spiel", "Free play")}</button>
        </div>
        ${
          quiz.mode === "free"
            ? `<div class="cats lvls" role="group" aria-label="${T("Schwierigkeit", "Difficulty")}">${Object.entries(LEVELS).map(([k, v]) => `<button type="button" class="chip lvl lvl-${k}" data-level="${k}" aria-pressed="${quiz.level === k}"><b>${T(v[0], v[1])}</b> <small>${T(v[2], v[3])}</small></button>`).join("")}</div><div class="cats" role="group" aria-label="${T("Thema", "Topic")}">${CATS.map((c) => `<button type="button" class="chip" data-cat="${c}" aria-pressed="${quiz.cat === c}">${esc(catName(c))}</button>`).join("")}</div>`
            : `<p class="dnote">${T(`${quiz.qs.length} neue Fragen vom ${dayLabel(quiz.day)}`, `${quiz.qs.length} new questions from ${dayLabel(quiz.day)}`)}</p>`
        }
        <div class="progress"><span>${T("Frage", "Question")} ${quiz.i + 1} ${T("von", "of")} ${quiz.qs.length}</span><span>${right} ${T("richtig", "right")}</span></div></div>`,
        "short"
      ) +
      `<div class="wrap lift"><section class="quiz">
        <div class="trip">
          ${scene(quiz.prev, tot)}
          <div class="mm" aria-hidden="true">
            <div class="mtrack"><i id="mfill"></i><b class="mrun" id="mrun"><span id="mmark"></span></b><em></em></div>
            <div class="mdots">${mdots()}</div>
          </div>
        </div>
        <article class="qcard${picked ? (hit ? " pop" : " shake") : " deal"}" aria-live="polite">
          <span class="kicker">${esc(catName(q.cat))} · ${T("Ist das halal?", "Is it halal?")}</span>
          <span class="worth w${lvN(q)}"><span class="chev" aria-hidden="true">${"<i></i>".repeat(lvN(q))}</span>${T(L.de, L.en)} · ${L.n} km</span>
          <h2>${esc(qq(q))}</h2>
          <div class="answers">
            ${opts
              .map(
                ([a, sym, label]) =>
                  `<button type="button" class="answer${picked === a ? " picked" : ""}${picked && q.a === a ? " right" : ""}" data-a="${a}" ${picked ? "disabled" : ""}><span class="dot" aria-hidden="true">${sym}</span>${label}</button>`
              )
              .join("")}
          </div>
          ${
            picked
              ? `<div class="verdict">
                  <strong>${hit ? T("Richtig!", "Correct!") : T("Daneben.", "Not quite.")} <span class="gain${hit ? "" : " none"}">${hit ? `+${L.n} km` : T("Motor aus, 0 km", "Engine stalled, 0 km")}</span></strong>${stamp(q.a)}
                  <p>${esc(qe(q))}</p>
                  ${q.src ? `<p class="src">${T("Quelle", "Source")}: ${esc(qs(q))}</p>` : ""}
                </div>
                <div class="next"><button type="button" class="btn" id="next">${quiz.i + 1 < quiz.qs.length ? T("Nächste Frage", "Next question") : T("Zur Zieleinfahrt", "To the finish")}</button></div>`
              : ""
          }
        </article>
      </section></div>`;
    if (reuse) {
      document.getElementById("scene")?.replaceWith(reuse);
      reuse.classList.remove("quake", "driving", "fast");
      reuse.querySelector("#carbox")?.classList.remove("stall", "nitro");
      if (SC) SC.fast = false;
    }
    place(quiz.prev);
    app.querySelectorAll("[data-mode]").forEach((b) =>
      b.addEventListener("click", () => {
        if (b.dataset.mode === quiz.mode) return;
        newQuiz(b.dataset.mode);
        quizView();
      })
    );
    app.querySelectorAll("[data-level]").forEach((b) =>
      b.addEventListener("click", () => {
        if (b.dataset.level === quiz.level) return;
        level = b.dataset.level;
        try { localStorage.setItem(LVKEY, level); } catch (e) {}
        newQuiz("free", quiz.cat);
        quizView();
      })
    );
    app.querySelectorAll("[data-cat]").forEach((b) =>
      b.addEventListener("click", () => {
        newQuiz("free", b.dataset.cat);
        quizView();
      })
    );
    app.querySelectorAll(".answer").forEach((b) =>
      b.addEventListener("click", () => {
        quiz.picks[quiz.i] = b.dataset.a;
        quiz.prev = quiz.km;
        if (b.dataset.a === q.a) quiz.km += worth(q);
        quizView();
      })
    );
    document.getElementById("next")?.addEventListener("click", () => {
      quiz.i++;
      quiz.prev = quiz.km;
      quizView();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    if (picked) {
      if (hit) {
        FX.vibrate(18);
        driveTo(quiz.prev, quiz.km, lvN(q), () => {
          const [x, y] = carTop();
          FX.floatText(x, y, `+${L.n} km`, "km");
          FX.burst(x, y + 20, 10, "spark", { power: 70, size: 7, up: true, colors: ["#34d399", "#ffe27a", "#ffffff"] });
        });
      } else stall();
      document.getElementById("next")?.focus({ preventScroll: true });
    }
  }

  const shareText = (right, n, km, max, marks) =>
    `${T(`Ist das halal? ${quiz && quiz.mode === "daily" ? "Tagesquiz" : "Quiz"}: ${right} von ${n} richtig, ${km} von ${max} km gefahren.`, `Is it halal? ${quiz && quiz.mode === "daily" ? "Daily quiz" : "Quiz"}: ${right} of ${n} right, ${km} of ${max} km driven.`)}\n${marks}\n${location.origin}${BASE}/halal`;
  async function share(text) {
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        toast(T("Kopiert!", "Copied!"));
      }
    } catch (e) {}
  }

  function summary(h1, right, n, km, max, marks, extra, review, fresh) {
    const ratio = km / max;
    const [title, text] =
      ratio >= 0.95
        ? ["Mashallah!", T("Fast die ganze Strecke geschafft – du kennst dich richtig gut aus.", "Nearly the whole way – you really know your stuff.")]
        : ratio >= 0.7
          ? [T("Stark!", "Great!"), T("Fast alles gewusst.", "You knew almost everything.")]
          : ratio >= 0.4
            ? [T("Nicht schlecht.", "Not bad."), T("Ein paar Antworten haben dich überrascht – genau dafür ist das Quiz da.", "A few answers surprised you – that’s exactly what the quiz is for.")]
            : [T("Da geht noch was.", "Room to grow."), T("Kein Problem: Mit den Erklärungen und Quellen klappt es beim nächsten Mal besser.", "No problem: with the explanations and sources it’ll go better next time.")];
    const from = fresh ? Math.max(0, km - 45) : km;
    app.innerHTML =
      band(`<div class="quiz"><h1>${h1}</h1></div>`, "short") +
      `<div class="wrap lift"><section class="quiz">
        <div class="result">
          <div class="trip flat">${scene(from, max, "end")}</div>
          <div class="big"><span id="bignum">${fresh ? 0 : km}</span> km</div>
          <p class="goldsub">${T("von", "of")} ${max} km · ${right}/${n} ${T("richtig", "right")}</p>
          <div class="marks" aria-hidden="true">${[...marks].map((m, k) => `<i class="${m === "🟩" ? "ok" : "no"}" style="animation-delay:${0.25 + k * 0.07}s"></i>`).join("")}</div>
          <h1 style="font-size:32px;margin-top:14px">${title}</h1>
          <p>${text}</p>
          ${extra}
        </div>
        ${review}
      </section></div>`;
    place(from);
    document.getElementById("share")?.addEventListener("click", () => share(shareText(right, n, km, max, marks)));
    if (fresh) {
      FX.count(document.getElementById("bignum"), 0, km, 1600);
      driveTo(from, km, 2, () => {
        // winner / loser animation (public/fx/outcome.js): won from 60 % of the way
        const won = ratio >= 0.6;
        window.ktOutcome && window.ktOutcome({
          win: won,
          title: won ? T("Gewonnen!", "You win!") : T("Verloren", "You lose"),
          sub: won ? `Mashallah! ${right}/${n} ${T("richtig", "right")} · ${km} km` : `${right}/${n} ${T("richtig", "right")} – ${T("nächstes Mal klappt’s.", "next time you’ll make it.")}`,
        });
        if (ratio >= 0.7) FX.sound.win();
        if (ratio >= 0.95) FX.sound.honk();
        if (ratio >= 0.7) FX.rain(Math.round(30 + 50 * ratio), "paper");
      });
    }
  }

  function resultView() {
    FX.setPath("/halal");
    const n = quiz.qs.length;
    const right = quiz.picks.filter((p, k) => p === quiz.qs[k].a).length;
    const max = total();
    const marks = quiz.picks.map((p, k) => (p === quiz.qs[k].a ? "🟩" : "🟥")).join("");
    if (quiz.mode === "daily" && !quiz.replay) saveDone({ day: quiz.day, right, n, km: quiz.km, max, marks });
    summary(
      T("Deine Strecke", "Your trip"),
      right,
      n,
      quiz.km,
      max,
      marks,
      `<div class="actions">
        ${quiz.mode === "daily" ? `<button type="button" class="btn" id="free">${T("Freies Spiel", "Free play")}</button>` : `<button type="button" class="btn" id="again">${T("Neue Runde", "New round")}</button>`}
        <button type="button" class="btn ghost" id="share">${T("Ergebnis teilen", "Share result")}</button>
      </div>
      ${quiz.mode === "daily" ? `<p class="comeback">${T("Morgen gibt es 10 neue Fragen.", "Tomorrow there are 10 new questions.")}</p>` : ""}`,
      `<div class="review">
        ${quiz.qs
          .map((q, k) => `<div><b class="${quiz.picks[k] === q.a ? "" : "x"}">${quiz.picks[k] === q.a ? "✓" : "✕"}</b><span>${esc(qq(q))} – <em>${stampText(q.a)}</em> <small>${worth(q)} km</small></span></div>`)
          .join("")}
      </div>`,
      true
    );
    document.getElementById("again")?.addEventListener("click", () => {
      newQuiz("free", quiz.cat);
      quizView();
    });
    document.getElementById("free")?.addEventListener("click", () => {
      newQuiz("free");
      quizView();
    });
  }

  function doneView(d) {
    FX.setPath("/halal");
    summary(
      T("Tagesquiz geschafft", "Daily quiz done"),
      d.right,
      d.n,
      d.km,
      d.max,
      d.marks,
      `<div class="actions">
        <button type="button" class="btn" id="free">${T("Freies Spiel", "Free play")}</button>
        <button type="button" class="btn ghost" id="share">${T("Ergebnis teilen", "Share result")}</button>
        <button type="button" class="btn ghost" id="replay">${T("Nochmal fahren", "Drive again")}</button>
      </div>
      <p class="comeback">${T("Morgen gibt es 10 neue Fragen.", "Tomorrow there are 10 new questions.")}</p>`,
      "",
      false
    );
    document.getElementById("free").addEventListener("click", () => {
      newQuiz("free");
      quizView();
    });
    document.getElementById("replay").addEventListener("click", () => {
      newQuiz("daily");
      quiz.replay = true;
      quizView();
    });
  }

  function toast(msg) {
    const el = document.createElement("div");
    el.className = "kcopied";
    el.setAttribute("role", "status");
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }

  // ---------- Router ----------
  const ROUTES = { "": home, quiz: quizView };
  const TITLES = EN
    ? { "": "Is it halal? – GeoDuels", quiz: "Quiz – Is it halal? – GeoDuels" }
    : { "": "Ist das halal? – GeoDuels", quiz: "Quiz – Ist das halal? – GeoDuels" };
  function route() {
    const r = location.hash.replace(/^#\/?/, "");
    const key = r in ROUTES ? r : "";
    if (key === "quiz" && quiz && quiz.i >= quiz.qs.length) newQuiz(quiz.mode, quiz.cat);
    ROUTES[key]();
    document.title = TITLES[key];
    setNav(key);
    app.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  const unbindSound = window.KTFX.bindSound(app, T("Ton an", "Sound on"), T("Ton aus", "Sound off"));
  route();
  return () => {
    window.removeEventListener("hashchange", route);
    unbindSound();
  };
};
