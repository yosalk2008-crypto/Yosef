/** Mounts the "Ist das halal?" quiz into an element on koshertrivia.de/halal. Returns a cleanup function. */
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
  const LVL = { 1: { de: "Leicht", en: "Easy", n: 10 }, 2: { de: "Mittel", en: "Medium", n: 20 }, 3: { de: "Schwer", en: "Hard", n: 30 } };
  const lvOf = (q) => LVL[q.lv] || LVL[2];
  const worth = (q) => lvOf(q).n;
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
  const reduced = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let quiz = null;
  function newQuiz(mode, cat) {
    if (mode === "free") {
      cat = cat || "Alle";
      const pool = cat === "Alle" ? Q : Q.filter((q) => q.cat === cat);
      quiz = { mode, cat, qs: shuffle(pool).slice(0, ROUND), i: 0, picks: [], km: 0, prev: 0 };
    } else {
      const d = dailySet();
      quiz = { mode: "daily", cat: "Alle", day: d.day, qs: shuffle(d.qs), i: 0, picks: [], km: 0, prev: 0 };
    }
  }
  const total = () => quiz.qs.reduce((s, q) => s + worth(q), 0);

  /** Road scene: car, hills, finish flag. `from`/`to` are km values; the car drives from one to the other. */
  const CAR = `<svg viewBox="0 0 122 58" aria-hidden="true"><path d="M5 40 L9 28 Q11 23 18 22 L36 21 L46 9 Q48 7 53 7 L84 7 Q89 7 92 10 L101 21 L111 23 Q117 25 117 31 L117 40 Q117 44 113 44 L9 44 Q5 44 5 40 Z" fill="#0f8a5f"/><path d="M50 11 L84 11 L94 21 L44 21 Z" fill="#d6f3e7"/><path d="M67 11 V21" stroke="#0f8a5f" stroke-width="2.5"/><rect x="8" y="36" width="109" height="3" fill="#0b6e4b" opacity=".55"/><circle cx="111" cy="31" r="3.2" fill="#ffe27a"/><rect x="5" y="30" width="4" height="5" rx="1.5" fill="#e0524a"/><g class="wh"><circle cx="30" cy="45" r="11.5" fill="#1b2421"/><circle cx="30" cy="45" r="5.5" fill="#cfd6d3"/><path d="M30 39.5 v11 M24.5 45 h11" stroke="#8c9894" stroke-width="2"/></g><g class="wh"><circle cx="93" cy="45" r="11.5" fill="#1b2421"/><circle cx="93" cy="45" r="5.5" fill="#cfd6d3"/><path d="M93 39.5 v11 M87.5 45 h11" stroke="#8c9894" stroke-width="2"/></g></svg>`;
  const FLAG = `<svg viewBox="0 0 40 70" aria-hidden="true"><rect x="3" y="2" width="3.5" height="66" rx="1.5" fill="#33423d"/><g><rect x="6.5" y="4" width="28" height="22" fill="#fff" stroke="#33423d" stroke-width="1.5"/><path d="M6.5 4h7v5.5h-7zM20.5 4h7v5.5h-7zM13.5 9.5h7v5.5h-7zM27.5 9.5h7v5.5h-7zM6.5 15h7v5.5h-7zM20.5 15h7v5.5h-7zM13.5 20.5h7v5.5h-7zM27.5 20.5h7v5.5h-7z" fill="#1b2421"/></g></svg>`;
  const carLeft = (p) => `calc(8px + ${p.toFixed(4)} * (100% - 148px))`;
  const scene = (from, to, cls = "") => {
    const t = total() || 1;
    return `<div class="road ${cls}" id="road" data-from="${from}" data-to="${to}" role="img" aria-label="${T("Straße mit Auto", "Road with a car")}">
      <div class="sun"></div>
      <div class="hills far" style="background-position-x:${-from * 3}px"></div>
      <div class="hills near" style="background-position-x:${-from * 7}px"></div>
      <div class="asphalt"><div class="lane" style="background-position-x:${-from * 14}px"></div></div>
      <div class="flag">${FLAG}</div>
      <div class="car" style="left:${carLeft(from / t)}">${CAR}<i class="puff p1"></i><i class="puff p2"></i><i class="puff p3"></i></div>
    </div>`;
  };
  /** Starts the drive animation of a freshly rendered scene. */
  function drive(hit) {
    const road = document.getElementById("road");
    if (!road) return;
    const from = +road.dataset.from, to = +road.dataset.to;
    const car = road.querySelector(".car");
    if (!hit) {
      car.classList.add("stall");
      return;
    }
    const num = document.getElementById("kmnum");
    const t = total() || 1;
    if (reduced()) {
      car.style.left = carLeft(to / t);
      if (num) num.textContent = String(to);
      return;
    }
    road.classList.add("driving");
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        car.style.left = carLeft(to / t);
        road.querySelector(".hills.far").style.backgroundPositionX = -to * 3 + "px";
        road.querySelector(".hills.near").style.backgroundPositionX = -to * 7 + "px";
        road.querySelector(".lane").style.backgroundPositionX = -to * 14 + "px";
      })
    );
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / 1500);
      if (num && num.isConnected) num.textContent = String(Math.round(from + (to - from) * p));
      if (p < 1) requestAnimationFrame(tick);
      else road.classList.remove("driving");
    };
    requestAnimationFrame(tick);
  }

  function quizView() {
    if (!quiz) newQuiz("daily");
    if (quiz.mode === "daily" && !quiz.replay && quiz.i === 0 && !quiz.picks.length) {
      const done = loadDone();
      if (done && done.day === quiz.day) return doneView(done);
    }
    if (quiz.i >= quiz.qs.length) return resultView();
    const q = quiz.qs[quiz.i];
    const picked = quiz.picks[quiz.i];
    const L = lvOf(q);
    const opts = [
      ["halal", "✓", "Halal"],
      ["haram", "✕", "Haram"],
      ["makruh", "–", "Makruh"],
      ["kommt", "≈", LABEL.kommt],
    ];
    const right = quiz.picks.filter((p, k) => p === quiz.qs[k].a).length;
    const hit = picked && picked === q.a;
    app.innerHTML =
      band(
        `<div class="quiz"><h1>Quiz</h1>
        <div class="cats" role="group" aria-label="${T("Modus", "Mode")}">
          <button type="button" class="chip" data-mode="daily" aria-pressed="${quiz.mode === "daily"}">${T("Tagesquiz", "Daily quiz")}</button>
          <button type="button" class="chip" data-mode="free" aria-pressed="${quiz.mode === "free"}">${T("Freies Spiel", "Free play")}</button>
        </div>
        ${
          quiz.mode === "free"
            ? `<div class="cats" role="group" aria-label="${T("Thema", "Topic")}">${CATS.map((c) => `<button type="button" class="chip" data-cat="${c}" aria-pressed="${quiz.cat === c}">${esc(catName(c))}</button>`).join("")}</div>`
            : `<p class="dnote">${T(`${quiz.qs.length} neue Fragen vom ${dayLabel(quiz.day)}`, `${quiz.qs.length} new questions from ${dayLabel(quiz.day)}`)}</p>`
        }
        <div class="progress"><span>${T("Frage", "Question")} ${quiz.i + 1} ${T("von", "of")} ${quiz.qs.length}</span><span>${right} ${T("richtig", "right")}</span></div>
        <div class="bar"><i style="width:${(quiz.i / quiz.qs.length) * 100}%"></i></div></div>`,
        "short"
      ) +
      `<div class="wrap lift"><section class="quiz">
        <div class="trip">
          ${scene(quiz.prev, quiz.km)}
          <div class="kmrow"><strong><span id="kmnum">${quiz.prev}</span> km</strong><small>${T("Ziel in", "finish at")} ${total()} km</small></div>
        </div>
        <article class="qcard${picked ? (hit ? " pop" : " shake") : ""}" aria-live="polite">
          <span class="kicker">${esc(catName(q.cat))} · ${T("Ist das halal?", "Is it halal?")}</span>
          <span class="worth w${q.lv || 2}"><span class="chev" aria-hidden="true">${"▸".repeat(q.lv || 2)}</span>${T(L.de, L.en)} · ${L.n} km</span>
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
                <div class="next"><button type="button" class="btn" id="next">${quiz.i + 1 < quiz.qs.length ? T("Nächste Frage", "Next question") : T("Ergebnis ansehen", "See result")}</button></div>`
              : ""
          }
        </article>
      </section></div>`;
    app.querySelectorAll("[data-mode]").forEach((b) =>
      b.addEventListener("click", () => {
        if (b.dataset.mode === quiz.mode) return;
        newQuiz(b.dataset.mode);
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
      drive(hit);
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

  function summary(h1, right, n, km, max, marks, extra, review) {
    const ratio = km / max;
    const [title, text] =
      ratio >= 0.95
        ? ["Mashallah!", T("Fast die ganze Strecke geschafft – du kennst dich richtig gut aus.", "Nearly the whole way – you really know your stuff.")]
        : ratio >= 0.7
          ? [T("Stark!", "Great!"), T("Fast alles gewusst.", "You knew almost everything.")]
          : ratio >= 0.4
            ? [T("Nicht schlecht.", "Not bad."), T("Ein paar Antworten haben dich überrascht – genau dafür ist das Quiz da.", "A few answers surprised you – that’s exactly what the quiz is for.")]
            : [T("Da geht noch was.", "Room to grow."), T("Kein Problem: Mit den Erklärungen und Quellen klappt es beim nächsten Mal besser.", "No problem: with the explanations and sources it’ll go better next time.")];
    app.innerHTML =
      band(`<div class="quiz"><h1>${h1}</h1></div>`, "short") +
      `<div class="wrap lift"><section class="quiz">
        <div class="result">
          <div class="trip flat">${scene(km, km, "end")}</div>
          <div class="big">${km} km</div>
          <p class="goldsub">${T("von", "of")} ${max} km · ${right}/${n} ${T("richtig", "right")}</p>
          <h1 style="font-size:32px;margin-top:10px">${title}</h1>
          <p>${text}</p>
          ${extra}
        </div>
        ${review}
      </section></div>`;
    document.getElementById("share")?.addEventListener("click", () => share(shareText(right, n, km, max, marks)));
  }

  function resultView() {
    const n = quiz.qs.length;
    const right = quiz.picks.filter((p, k) => p === quiz.qs[k].a).length;
    const max = total();
    const marks = quiz.picks.map((p, k) => (p === quiz.qs[k].a ? "🟩" : "🟥")).join("");
    if (quiz.mode === "daily" && !quiz.replay) saveDone({ day: quiz.day, right, n, km: quiz.km, max, marks });
    summary(
      T("Dein Ergebnis", "Your result"),
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
      </div>`
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
      ""
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
    ? { "": "Is it halal? – Koshertrivia", quiz: "Quiz – Is it halal? – Koshertrivia" }
    : { "": "Ist das halal? – Koshertrivia", quiz: "Quiz – Ist das halal? – Koshertrivia" };
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
  route();
  return () => window.removeEventListener("hashchange", route);
};
