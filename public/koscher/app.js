/** Mounts the "Ist das koscher?" quiz into an element on koshertrivia.de/koscher. Returns a cleanup function. */
window.mountKosher = function (app) {
  "use strict";
  const EN = window.KT_LANG === "en";
  const T = (de, en) => (EN ? en : de);
  const BASE = EN ? "/en" : "";
  const CAT_EN = { Alle: "All", Essen: "Food", Schabbat: "Shabbat", Feiertage: "Holidays", "Körper": "Body", Alltag: "Everyday life", Geld: "Money", "Gebet & Fasten": "Prayer & fasting", Miteinander: "Relationships" };
  const catName = (c) => (EN ? CAT_EN[c] || c : c);
  const Q = window.QUESTIONS;
  const ROUND = 10;
  const CATS = ["Alle", "Essen", "Schabbat", "Feiertage", "Körper", "Alltag"];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const food = (q) => q.cat === "Essen";
  const stampText = (a, isFood) =>
    EN
      ? a === "kommt" ? "It depends" : a === "ja" ? (isFood ? "Kosher" : "Allowed") : isFood ? "Not kosher" : "Forbidden"
      : a === "kommt" ? "Kommt drauf an" : a === "ja" ? (isFood ? "Koscher" : "Erlaubt") : isFood ? "Nicht koscher" : "Verboten";
  const QE = window.QUESTIONS_EN || {};
  const qq = (q) => (EN && QE[q.q] ? QE[q.q][0] : q.q);
  const qe = (q) => (EN && QE[q.q] ? QE[q.q][1] : q.e);
  const qs = (q) => (EN && QE[q.q] ? QE[q.q][2] : q.src);
  const PROBE_EN = { "Gummibärchen": "Gummy bears", Giraffe: "Giraffe", "Schabbat-Aufzug": "Shabbat elevator", Heuschrecken: "Locusts", Tattoo: "Tattoo", Honig: "Honey" };
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
      <nav class="knav" aria-label="${T("Ist das koscher?", "Is it kosher?")}">
        <a href="#/" class="kbrand"><span class="seal" aria-hidden="true">?</span>${T("Ist das koscher?", "Is it kosher?")}</a>
      </nav>${inner}</div></section>`;

  function setNav(route) {
    app.querySelectorAll(".klinks a").forEach((a) => {
      if (a.getAttribute("href") === "#/" + route) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  // ---------- Home ----------
  const PROBES = [
    ["Essen", "Gummibärchen", "nein"],
    ["Essen", "Giraffe", "ja"],
    ["Schabbat", "Schabbat-Aufzug", "ja"],
    ["Essen", "Heuschrecken", "kommt"],
    ["Körper", "Tattoo", "nein"],
    ["Essen", "Honig", "ja"],
  ];
  function home() {
    const [cat, item, a] = PROBES[Math.floor(Math.random() * PROBES.length)];
    app.innerHTML =
      band(
        `<div class="hero">
          <div>
            <span class="pill"><i></i>${Q.length} ${T("Fragen · Essen, Schabbat, Feiertage, Alltag", "questions · food, Shabbat, holidays, everyday life")}</span>
            <h1>${T('Ist das <span class="grad">koscher?</span>', 'Is it <span class="grad">kosher?</span>')}</h1>
            <p class="lead">${T("Shrimps, Giraffe, Lichtschalter am Schabbat: Rate, was im Judentum erlaubt ist – und erfahre, warum.", "Shrimp, giraffe, light switches on Shabbat: guess what Judaism allows – and find out why.")}</p>
            <div class="actions">
              <a class="btn light" href="#/quiz">${T("Tagesquiz starten", "Start daily quiz")}</a>
            </div>
          </div>
          <div class="stage">
            <div class="disc" aria-hidden="true"></div>
            <img class="figur" src="/koscher/figur.webp?v=2" alt="" width="521" height="700" />
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
      if (el) el.outerHTML = stamp(a, cat === "Essen");
    }, 650);
  }

  // ---------- Quiz ----------
  const LVL = { 1: { de: "Leicht", en: "Easy", n: 10 }, 2: { de: "Mittel", en: "Medium", n: 20 }, 3: { de: "Schwer", en: "Hard", n: 30 } };
  const lvOf = (q) => LVL[q.lv] || LVL[2];
  const worth = (q) => lvOf(q).n;
  const KEY = "kt-daily-koscher";
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
      quiz = { mode, cat, qs: shuffle(pool).slice(0, ROUND), i: 0, picks: [], gold: 0, prev: 0 };
    } else {
      const d = dailySet();
      quiz = { mode: "daily", cat: "Alle", day: d.day, qs: shuffle(d.qs), i: 0, picks: [], gold: 0, prev: 0 };
    }
  }
  const maxGold = () => quiz.qs.reduce((s, q) => s + worth(q), 0);
  const coinsOf = (q) => q.lv || 2;

  const SACK = `<svg class="sack" viewBox="0 0 80 92" aria-hidden="true"><path d="M27 13 Q40 2 53 13 L50 25 Q74 39 71 67 Q68 87 40 87 Q12 87 9 67 Q6 39 30 25 Z" fill="#d4a24a" stroke="#7a5214" stroke-width="3" stroke-linejoin="round"/><path d="M25 26 Q40 35 55 26" fill="none" stroke="#7a5214" stroke-width="3" stroke-linecap="round"/><path d="M29 19 Q40 24 51 19" fill="none" stroke="#a9772a" stroke-width="3" stroke-linecap="round"/><circle cx="40" cy="58" r="14" fill="#f6c945" stroke="#a9772a" stroke-width="3"/><path d="M40 51 v14 M35 55 h10" stroke="#a9772a" stroke-width="3" stroke-linecap="round"/></svg>`;

  function quizView() {
    if (!quiz) newQuiz("daily");
    if (quiz.mode === "daily" && !quiz.replay && quiz.i === 0 && !quiz.picks.length) {
      const done = loadDone();
      if (done && done.day === quiz.day) return doneView(done);
    }
    if (quiz.i >= quiz.qs.length) return resultView();
    const q = quiz.qs[quiz.i];
    const picked = quiz.picks[quiz.i];
    const isFood = food(q);
    const L = lvOf(q);
    const opts = [
      ["nein", "✕", stampText("nein", isFood)],
      ["ja", "✓", stampText("ja", isFood)],
      ["kommt", "≈", stampText("kommt", isFood)],
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
        <div class="sackrow" id="sackrow">${SACK}<div><strong><span id="goldnum">${quiz.prev}</span> ${T("Gold", "gold")}</strong><small>${T("von", "of")} ${maxGold()} ${T("möglich", "possible")}</small></div></div>
        <article class="qcard swipe${picked ? (hit ? " pop" : " shake") : ""}" id="card" aria-live="polite">
          <span class="ov" id="ov" aria-hidden="true"></span>
          <span class="kicker">${esc(catName(q.cat))} · ${EN ? `Is it ${isFood ? "kosher" : "allowed"}?` : `Ist das ${isFood ? "koscher" : "erlaubt"}?`}</span>
          <span class="worth w${coinsOf(q)}"><span class="cn" aria-hidden="true">${"<i></i>".repeat(coinsOf(q))}</span>${T(L.de, L.en)} · ${L.n} ${T("Gold", "gold")}</span>
          <h2>${esc(qq(q))}</h2>
          ${picked ? "" : `<p class="swtip"><span>← ${stampText("nein", isFood)}</span><span>${stampText("ja", isFood)} →</span></p>`}
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
                  <strong>${hit ? T("Richtig!", "Correct!") : T("Daneben.", "Not quite.")} <span class="gain${hit ? "" : " none"}">${hit ? `+${L.n} ${T("Gold", "gold")}` : T("kein Gold", "no gold")}</span></strong>${stamp(q.a, isFood)}
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
    document.getElementById("next")?.addEventListener("click", () => {
      quiz.i++;
      quiz.prev = quiz.gold;
      quizView();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    if (picked) {
      if (hit) flyCoins(coinsOf(q));
      else document.getElementById("sackrow")?.classList.add("nope");
      document.getElementById("next")?.focus({ preventScroll: true });
      return;
    }
    // swipe: right = ja, left = nein (buttons also work, "kommt drauf an" only by button)
    const card = document.getElementById("card");
    const ov = document.getElementById("ov");
    let sx = 0, sy = 0, dx = 0, drag = false, busy = false;
    const answer = (a) => {
      if (busy) return;
      busy = true;
      const out = a === "ja" ? 1 : a === "nein" ? -1 : 0;
      card.classList.remove("dragging");
      card.style.transition = "transform .26s ease-in, opacity .26s";
      card.style.transform = out ? `translate(${out * 560}px, -30px) rotate(${out * 22}deg)` : "translate(0, -420px) scale(.9)";
      card.style.opacity = "0";
      setTimeout(
        () => {
          quiz.picks[quiz.i] = a;
          if (a === q.a) quiz.gold += worth(q);
          quizView();
        },
        reduced() ? 0 : 240
      );
    };
    card.addEventListener("pointerdown", (e) => {
      if (busy || e.target.closest("button")) return;
      drag = true;
      sx = e.clientX;
      sy = e.clientY;
      dx = 0;
      card.classList.add("dragging");
    });
    card.addEventListener("pointermove", (e) => {
      if (!drag) return;
      dx = e.clientX - sx;
      const dy = (e.clientY - sy) * 0.15;
      card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 20}deg)`;
      const side = dx > 0 ? "ja" : "nein";
      ov.className = `ov show ${side}`;
      ov.textContent = stampText(side, isFood);
      ov.style.opacity = String(Math.min(1, Math.abs(dx) / 110));
    });
    const release = () => {
      if (!drag) return;
      drag = false;
      if (Math.abs(dx) > 100) return answer(dx > 0 ? "ja" : "nein");
      card.classList.remove("dragging");
      card.style.transform = "";
      ov.style.opacity = "0";
    };
    card.addEventListener("pointerup", release);
    card.addEventListener("pointercancel", release);
    app.querySelectorAll(".answer").forEach((b) => b.addEventListener("click", () => answer(b.dataset.a)));
  }

  /** Coins fly from the card into the sack, then the gold counter counts up. */
  function flyCoins(n) {
    const card = document.getElementById("card");
    const sack = app.querySelector(".sack");
    const num = document.getElementById("goldnum");
    const set = () => num && (num.textContent = String(quiz.gold));
    if (!card || !sack || !num || reduced()) return set();
    const a = card.getBoundingClientRect();
    const b = sack.getBoundingClientRect();
    const x0 = a.left + a.width / 2 - 11;
    const y0 = a.top + Math.min(a.height * 0.3, 140);
    const dx = b.left + b.width / 2 - 11 - x0;
    const dy = b.top + b.height / 2 - 11 - y0;
    let landed = 0;
    for (let k = 0; k < n; k++) {
      const c = document.createElement("i");
      c.className = "flycoin";
      c.style.left = x0 + (k - (n - 1) / 2) * 26 + "px";
      c.style.top = y0 + "px";
      document.body.appendChild(c);
      c.animate(
        [
          { transform: "translate(0,0) scale(.6) rotate(0deg)", opacity: 0 },
          { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 70}px) scale(1.25) rotate(160deg)`, opacity: 1, offset: 0.4 },
          { transform: `translate(${dx}px, ${dy}px) scale(.55) rotate(360deg)`, opacity: 1 },
        ],
        { duration: 820, delay: k * 130, easing: "cubic-bezier(.45,.05,.55,.95)", fill: "forwards" }
      ).onfinish = () => {
        c.remove();
        const s = app.querySelector(".sack");
        if (s) {
          s.classList.remove("bump");
          void s.getBoundingClientRect();
          s.classList.add("bump");
        }
        if (++landed === n) {
          const from = quiz.prev, to = quiz.gold, t0 = performance.now();
          const tick = (t) => {
            const p = Math.min(1, (t - t0) / 450);
            if (num.isConnected) num.textContent = String(Math.round(from + (to - from) * p));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      };
    }
  }

  const shareText = (right, n, gold, max, marks) =>
    `${T(`Ist das koscher? ${quiz && quiz.mode === "daily" ? "Tagesquiz" : "Quiz"}: ${right} von ${n} richtig, ${gold} von ${max} Gold.`, `Is it kosher? ${quiz && quiz.mode === "daily" ? "Daily quiz" : "Quiz"}: ${right} of ${n} right, ${gold} of ${max} gold.`)}\n${marks}\n${location.origin}${BASE}/koscher`;
  async function share(text) {
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        toast(T("Kopiert!", "Copied!"));
      }
    } catch (e) {}
  }

  function summary(h1, right, n, gold, max, marks, extra, review) {
    const ratio = gold / max;
    const [title, text] =
      ratio >= 0.95
        ? [T("Glatt koscher!", "Glatt kosher!"), T("Fast alles geholt. Du könntest im Rabbinat anfangen.", "Nearly every coin. You could start at the rabbinate.")]
        : ratio >= 0.7
          ? ["Mazel tov!", T("Dein Sack ist ordentlich gefüllt.", "Your sack is nicely filled.")]
          : ratio >= 0.4
            ? [T("Nicht schlecht.", "Not bad."), T("Ein paar Regeln haben dich überrascht – genau dafür ist das Quiz da.", "A few rules surprised you – that’s exactly what the quiz is for.")]
            : [T("So ein Schlamassel.", "What a schlamassel."), T("Kein Problem: Die Erklärungen unten helfen beim nächsten Mal.", "No problem: the explanations below will help next time.")];
    app.innerHTML =
      band(`<div class="quiz"><h1>${h1}</h1></div>`, "short") +
      `<div class="wrap lift"><section class="quiz">
        <div class="result">
          <div class="sackbig">${SACK}</div>
          <div class="big">${gold}</div>
          <p class="goldsub">${T("Gold von", "gold of")} ${max} · ${right}/${n} ${T("richtig", "right")}</p>
          <h1 style="font-size:32px;margin-top:10px">${title}</h1>
          <p>${text}</p>
          ${extra}
        </div>
        ${review}
      </section></div>`;
    document.getElementById("share")?.addEventListener("click", () => share(shareText(right, n, gold, max, marks)));
  }

  function resultView() {
    const n = quiz.qs.length;
    const right = quiz.picks.filter((p, k) => p === quiz.qs[k].a).length;
    const max = maxGold();
    const marks = quiz.picks.map((p, k) => (p === quiz.qs[k].a ? "🟩" : "🟥")).join("");
    if (quiz.mode === "daily" && !quiz.replay) saveDone({ day: quiz.day, right, n, gold: quiz.gold, max, marks });
    summary(
      T("Dein Ergebnis", "Your result"),
      right,
      n,
      quiz.gold,
      max,
      marks,
      `<div class="actions">
        ${quiz.mode === "daily" ? `<button type="button" class="btn" id="free">${T("Freies Spiel", "Free play")}</button>` : `<button type="button" class="btn" id="again">${T("Neue Runde", "New round")}</button>`}
        <button type="button" class="btn ghost" id="share">${T("Ergebnis teilen", "Share result")}</button>
      </div>
      ${quiz.mode === "daily" ? `<p class="comeback">${T("Morgen gibt es 10 neue Fragen.", "Tomorrow there are 10 new questions.")}</p>` : ""}`,
      `<div class="review">
        ${quiz.qs
          .map((q, k) => `<div><b class="${quiz.picks[k] === q.a ? "" : "x"}">${quiz.picks[k] === q.a ? "✓" : "✕"}</b><span>${esc(qq(q))} – <em>${stampText(q.a, food(q))}</em> <small>${worth(q)} ${T("Gold", "gold")}</small></span></div>`)
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
      d.gold,
      d.max,
      d.marks,
      `<div class="actions">
        <button type="button" class="btn" id="free">${T("Freies Spiel", "Free play")}</button>
        <button type="button" class="btn ghost" id="share">${T("Ergebnis teilen", "Share result")}</button>
        <button type="button" class="btn ghost" id="replay">${T("Nochmal spielen", "Play again")}</button>
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
    ? { "": "Is it kosher? – Koshertrivia", quiz: "Quiz – Is it kosher? – Koshertrivia" }
    : { "": "Ist das koscher? – Koshertrivia", quiz: "Quiz – Ist das koscher? – Koshertrivia" };
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
