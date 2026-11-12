/** Mounts the "Ist das koscher?" quiz into an element on koshertrivia.de/koscher. Returns a cleanup function. */
window.mountKosher = function (app) {
  "use strict";
  const Q = window.QUESTIONS;
  const ROUND = 10;
  const CATS = ["Alle", "Essen", "Schabbat", "Feiertage", "Körper", "Alltag"];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const food = (q) => q.cat === "Essen";
  const stampText = (a, isFood) => (a === "kommt" ? "Kommt drauf an" : a === "ja" ? (isFood ? "Koscher" : "Erlaubt") : isFood ? "Nicht koscher" : "Verboten");
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
      <nav class="knav" aria-label="Ist das koscher?">
        <a href="#/" class="kbrand"><span class="seal" aria-hidden="true">?</span>Ist das koscher?</a>
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
            <span class="pill"><i></i>${Q.length} Fragen · Essen, Schabbat, Feiertage, Alltag</span>
            <h1>Ist das <span class="grad">koscher?</span></h1>
            <p class="lead">Shrimps, Giraffe, Lichtschalter am Schabbat: Rate, was im Judentum erlaubt ist – und erfahre, warum.</p>
            <div class="actions">
              <a class="btn light" href="#/quiz">Quiz starten</a>
            </div>
          </div>
          <div class="stage">
            <div class="disc" aria-hidden="true"></div>
            <img class="figur" src="/koscher/figur.webp?v=2" alt="" width="521" height="700" />
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
      if (el) el.outerHTML = stamp(a, cat === "Essen");
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
      ["ja", "✓", isFood ? "Koscher" : "Erlaubt"],
      ["nein", "✕", isFood ? "Nicht koscher" : "Verboten"],
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
          <span class="kicker">${esc(q.cat)} · Ist das ${isFood ? "koscher" : "erlaubt"}?</span>
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
                  <strong>${picked === q.a ? "Richtig!" : "Daneben."}</strong>${stamp(q.a, isFood)}
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
        ? ["Glatt koscher!", "Alles richtig. Du könntest im Rabbinat anfangen."]
        : ratio >= 0.7
          ? ["Masel tov!", "Du kennst dich richtig gut aus."]
          : ratio >= 0.4
            ? ["Nicht schlecht.", "Ein paar Regeln haben dich überrascht – genau dafür ist das Quiz da."]
            : ["So ein Schlamassel.", "Kein Problem: Die Erklärungen unten helfen beim nächsten Mal."];
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
            .map((q, k) => `<div><b class="${quiz.picks[k] === q.a ? "" : "x"}">${quiz.picks[k] === q.a ? "✓" : "✕"}</b><span>${esc(q.q)} – <em>${stampText(q.a, food(q))}</em></span></div>`)
            .join("")}
        </div>
      </section></div>`;
    document.getElementById("again").addEventListener("click", () => {
      newQuiz(quiz.cat);
      quizView();
    });
    document.getElementById("share").addEventListener("click", async () => {
      const t = `Ist das koscher? Ich hatte ${right} von ${n} richtig.\n${quiz.picks.map((p, k) => (p === quiz.qs[k].a ? "🟩" : "🟥")).join("")}\n${location.origin}/koscher`;
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
  const TITLES = { "": "Ist das koscher? – Koshertrivia", quiz: "Quiz – Ist das koscher? – Koshertrivia" };
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
