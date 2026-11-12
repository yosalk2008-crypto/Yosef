/** Mounts the "Ist das halal?" quiz into an element on koshertrivia.de/halal. Returns a cleanup function. */
window.mountHalal = function (app) {
  "use strict";
  const Q = window.HALAL;
  const ROUND = 10;
  const CATS = ["Alle", "Essen", "Geld", "Gebet & Fasten", "Miteinander", "Körper", "Alltag"];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const food = () => false;
  const LABEL = { halal: "Halal", haram: "Haram", makruh: "Makruh", kommt: "Kommt drauf an" };
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
      <nav class="knav" aria-label="Ist das halal?">
        <a href="#/" class="kbrand"><span class="seal" aria-hidden="true">?</span>Ist das halal?</a>
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
            <span class="pill"><i></i>${Q.length} Fragen · Essen, Geld, Gebet, Alltag</span>
            <h1>Ist das <span class="grad">halal?</span></h1>
            <p class="lead">Vape, Sportwetten, Zinsen, Kredite: Rate, was im Islam erlaubt ist – mit Quellen aus Quran, Tafsir, Bukhari und Muslim.</p>
            <div class="actions">
              <a class="btn light" href="#/quiz">Quiz starten</a>
            </div>
          </div>
          <div class="stage">
            <div class="disc" aria-hidden="true"></div>
            <svg class="star" viewBox="-50 -50 100 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><rect x="-30" y="-30" width="60" height="60"/><rect x="-30" y="-30" width="60" height="60" transform="rotate(45)"/><circle r="13"/><rect x="-42" y="-42" width="84" height="84" rx="4" opacity=".35"/><rect x="-42" y="-42" width="84" height="84" rx="4" transform="rotate(45)" opacity=".35"/></g></svg>
            <div class="probe">
              <small>${esc(cat)}</small>
              <p>${esc(item)}</p>
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
  let quiz = null;
  function newQuiz(cat) {
    const pool = cat === "Alle" ? Q : Q.filter((q) => q.cat === cat);
    quiz = { cat, qs: shuffle(pool).slice(0, ROUND), i: 0, picks: [] };
  }
  function quizView() {
    if (!quiz) newQuiz("Alle");
    if (quiz.i >= quiz.qs.length) return resultView();
    const q = quiz.qs[quiz.i];
    const picked = quiz.picks[quiz.i];
    const isFood = food(q);
    const opts = [
      ["halal", "✓", "Halal"],
      ["haram", "✕", "Haram"],
      ["makruh", "–", "Makruh"],
      ["kommt", "≈", "Kommt drauf an"],
    ];
    app.innerHTML =
      band(
        `<div class="quiz"><h1>Quiz</h1>
        <div class="cats" role="group" aria-label="Thema">
          ${CATS.map((c) => `<button type="button" class="chip" data-cat="${c}" aria-pressed="${quiz.cat === c}">${c}</button>`).join("")}
        </div>
        <div class="progress"><span>Frage ${quiz.i + 1} von ${quiz.qs.length}</span><span>${quiz.picks.filter((p, k) => p === quiz.qs[k].a).length} richtig</span></div>
        <div class="bar"><i style="width:${(quiz.i / quiz.qs.length) * 100}%"></i></div></div>`,
        "short"
      ) +
      `<div class="wrap lift"><section class="quiz">
        <article class="qcard${picked ? " shake" : ""}" aria-live="polite">
          <span class="kicker">${esc(q.cat)} · Ist das halal?</span>
          <h2>${esc(q.q)}</h2>
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
                  <strong>${picked === q.a ? "Richtig!" : "Daneben."}</strong>${stamp(q.a)}
                  <p>${esc(q.e)}</p>
                  ${q.src ? `<p class="src">Quelle: ${esc(q.src)}</p>` : ""}
                </div>
                <div class="next"><button type="button" class="btn" id="next">${quiz.i + 1 < quiz.qs.length ? "Nächste Frage" : "Ergebnis ansehen"}</button></div>`
              : ""
          }
        </article>
      </section></div>`;
    app.querySelectorAll(".chip").forEach((b) =>
      b.addEventListener("click", () => {
        newQuiz(b.dataset.cat);
        quizView();
      })
    );
    app.querySelectorAll(".answer").forEach((b) =>
      b.addEventListener("click", () => {
        quiz.picks[quiz.i] = b.dataset.a;
        quizView();
        document.getElementById("next")?.focus({ preventScroll: true });
      })
    );
    document.getElementById("next")?.addEventListener("click", () => {
      quiz.i++;
      quizView();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function resultView() {
    const n = quiz.qs.length;
    const right = quiz.picks.filter((p, k) => p === quiz.qs[k].a).length;
    const ratio = right / n;
    const [title, text] =
      ratio === 1
        ? ["Mashallah!", "Alles richtig – du kennst dich richtig gut aus."]
        : ratio >= 0.7
          ? ["Stark!", "Fast alles gewusst."]
          : ratio >= 0.4
            ? ["Nicht schlecht.", "Ein paar Antworten haben dich überrascht – genau dafür ist das Quiz da."]
            : ["Da geht noch was.", "Kein Problem: Mit den Erklärungen und Quellen klappt es beim nächsten Mal besser."];
    app.innerHTML =
      band(`<div class="quiz"><h1>Dein Ergebnis</h1></div>`, "short") +
      `<div class="wrap lift"><section class="quiz">
        <div class="result">
          <div class="big">${right}/${n}</div>
          <h1 style="font-size:32px;margin-top:10px">${title}</h1>
          <p>${text}</p>
          <div class="actions">
            <button type="button" class="btn" id="again">Neue Runde</button>
            <button type="button" class="btn ghost" id="share">Ergebnis teilen</button>
          </div>
        </div>
        <div class="review">
          ${quiz.qs
            .map((q, k) => `<div><b class="${quiz.picks[k] === q.a ? "" : "x"}">${quiz.picks[k] === q.a ? "✓" : "✕"}</b><span>${esc(q.q)} – <em>${stampText(q.a)}</em></span></div>`)
            .join("")}
        </div>
      </section></div>`;
    document.getElementById("again").addEventListener("click", () => {
      newQuiz(quiz.cat);
      quizView();
    });
    document.getElementById("share").addEventListener("click", async () => {
      const t = `Ist das halal? Ich hatte ${right} von ${n} richtig.\n${quiz.picks.map((p, k) => (p === quiz.qs[k].a ? "🟩" : "🟥")).join("")}\n${location.origin}/halal`;
      try {
        if (navigator.share) await navigator.share({ text: t });
        else {
          await navigator.clipboard.writeText(t);
          toast("Kopiert!");
        }
      } catch (e) {}
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
  const TITLES = { "": "Ist das halal? – Koshertrivia", quiz: "Quiz – Ist das halal? – Koshertrivia" };
  function route() {
    const r = location.hash.replace(/^#\/?/, "");
    const key = r in ROUTES ? r : "";
    if (key === "quiz" && quiz && quiz.i >= quiz.qs.length) newQuiz(quiz.cat);
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
