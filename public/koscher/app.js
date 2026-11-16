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
    ["Essen", "Gummibärchen", "nein"],
    ["Essen", "Giraffe", "ja"],
    ["Schabbat", "Schabbat-Aufzug", "ja"],
    ["Essen", "Heuschrecken", "kommt"],
    ["Körper", "Tattoo", "nein"],
    ["Essen", "Honig", "ja"],
  ];
  function home() {
    window.KTFX.setPath("/koscher");
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
              <a class="btn outline" href="${BASE}/koscher/fragen">${T("Alle Fragen ansehen", "Browse all questions")}</a>
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
  const FX = window.KTFX;
  const ART = window.KT_ART || {};
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

  let quiz = null;
  // free play: "rookie" = easy + medium questions, "boss" (Rabbi) = the hard ones
  const LVKEY = "kt-level-koscher";
  let level = (() => { try { return localStorage.getItem(LVKEY) === "boss" ? "boss" : "rookie"; } catch (e) { return "rookie"; } })();
  const LEVELS = { rookie: ["Rookie", "Rookie", "leicht & mittel", "easy & medium"], boss: ["Rabbi", "Rabbi", "schwer", "hard"] };
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
      quiz = { mode, cat, level, qs: levelPool(pool), i: 0, picks: [], gold: 0, prev: 0 };
    } else {
      const d = dailySet();
      quiz = { mode: "daily", cat: "Alle", day: d.day, qs: shuffle(d.qs), i: 0, picks: [], gold: 0, prev: 0 };
    }
  }
  const maxGold = () => quiz.qs.reduce((s, q) => s + worth(q), 0);
  const lvN = (q) => q.lv || 2;
  /** 0–4: how many coins peek out of the sack. */
  const fillOf = (gold, max) => (gold <= 0 ? 0 : Math.min(4, 1 + Math.floor((gold / max) * 3.999)));
  const sackScale = (gold, max) => (0.8 + 0.32 * Math.min(1, gold / max)).toFixed(3);
  const STARS = Array.from({ length: 14 }, (_, k) => `<i style="left:${(k * 37 + 11) % 100}%;top:${(k * 53 + 7) % 78}%;animation-delay:${((k * 0.37) % 2.4).toFixed(2)}s"></i>`).join("");
  const dots = () =>
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
    FX.setPath(`/koscher/frage/${FX.slug(q.q)}`);
    const picked = quiz.picks[quiz.i];
    const isFood = food(q);
    const L = lvOf(q);
    const max = maxGold();
    const opts = [
      ["ja", "✓", stampText("ja", isFood)],
      ["nein", "✕", stampText("nein", isFood)],
      ["kommt", "≈", stampText("kommt", isFood)],
    ];
    const right = quiz.picks.filter((p, k) => p === quiz.qs[k].a).length;
    const hit = picked && picked === q.a;
    // keep the sack (big SVG) between questions instead of rebuilding it
    const keepSack = document.getElementById("vsack");
    if (keepSack) keepSack.remove();
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
        <div class="vault" id="vault">
          <div class="vstars" aria-hidden="true">${STARS}</div>
          <div class="vbeam" aria-hidden="true"></div>
          <div class="vsack" id="vsack" data-fill="${fillOf(quiz.prev, max)}" style="--s:${sackScale(quiz.prev, max)}">${ART.sack || ""}</div>
          <div class="vinfo">
            <div class="vgold"><i class="vcoin" aria-hidden="true"></i><span id="goldnum">${quiz.prev}</span></div>
            <small>${T("von", "of")} ${max} ${T("Gold möglich", "gold possible")}</small>
            <div class="vmeter" aria-hidden="true"><i id="vmeter" style="--f:${quiz.prev / max}"></i></div>
            <div class="vdots" aria-hidden="true">${dots()}</div>
          </div>
        </div>
        <div class="deck">
        <article class="qcard tap${picked ? (hit ? " pop" : " shake") : " deal"}" id="card" aria-live="polite">
          <span class="kicker">${esc(catName(q.cat))} · ${EN ? `Is it ${isFood ? "kosher" : "allowed"}?` : `Ist das ${isFood ? "koscher" : "erlaubt"}?`}</span>
          <span class="worth w${lvN(q)}"><span class="cn" aria-hidden="true">${"<i></i>".repeat(lvN(q))}</span>${T(L.de, L.en)} · ${L.n} ${T("Gold", "gold")}</span>
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
                  <strong>${hit ? T("Richtig!", "Correct!") : T("Daneben.", "Not quite.")} <span class="gain${hit ? "" : " none"}">${hit ? `+${L.n} ${T("Gold", "gold")}` : T("kein Gold", "no gold")}</span></strong>${stamp(q.a, isFood)}
                  <p>${esc(qe(q))}</p>
                  ${q.src ? `<p class="src">${T("Quelle", "Source")}: ${esc(qs(q))}</p>` : ""}
                </div>
                <div class="next"><button type="button" class="btn" id="next">${quiz.i + 1 < quiz.qs.length ? T("Nächste Frage", "Next question") : T("Schatz ansehen", "See your treasure")}</button></div>`
              : ""
          }
        </article>
        </div>
      </section></div>`;
    if (keepSack) {
      const fresh = document.getElementById("vsack");
      if (fresh) {
        keepSack.dataset.fill = fresh.dataset.fill;
        keepSack.style.setProperty("--s", fresh.style.getPropertyValue("--s"));
        fresh.replaceWith(keepSack);
      }
    }
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
    document.getElementById("next")?.addEventListener("click", () => {
      quiz.i++;
      quiz.prev = quiz.gold;
      quizView();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    if (picked) {
      if (hit) flyCoins(lvN(q) * 2 + 1, L.n);
      else loseCoin();
      document.getElementById("next")?.focus({ preventScroll: true });
      return;
    }
    const card = document.getElementById("card");
    let busy = false;
    const answer = (a) => {
      if (busy) return;
      busy = true;
      FX.sound.swipe();
      card.classList.remove("deal");
      card.style.transition = "transform .2s ease-in, opacity .2s";
      card.style.transform = "scale(.96)";
      card.style.opacity = ".4";
      setTimeout(
        () => {
          quiz.picks[quiz.i] = a;
          if (a === q.a) quiz.gold += worth(q);
          quizView();
        },
        FX.reduced() ? 0 : 180
      );
    };
    app.querySelectorAll(".answer").forEach((b) => b.addEventListener("click", () => answer(b.dataset.a)));
  }

  /** Updates sack size, peeking coins and meter to the current gold. */
  function settle() {
    const max = maxGold();
    const s = document.getElementById("vsack");
    if (s) {
      s.dataset.fill = String(fillOf(quiz.gold, max));
      s.style.setProperty("--s", sackScale(quiz.gold, max));
    }
    const m = document.getElementById("vmeter");
    if (m) m.style.setProperty("--f", String(quiz.gold / max));
  }

  /** Coins fly in an arc from the card into the sack; each landing rings, sparks and bumps the sack. */
  function flyCoins(n, gain) {
    const card = document.getElementById("card");
    const sack = document.getElementById("vsack");
    const num = document.getElementById("goldnum");
    if (!card || !sack || !num || FX.reduced()) {
      if (num) num.textContent = String(quiz.gold);
      return settle();
    }
    FX.vibrate(18);
    const a = card.getBoundingClientRect();
    const b = sack.getBoundingClientRect();
    const x0 = a.left + a.width / 2, y0 = a.top + Math.min(a.height * 0.28, 130);
    const x1 = b.left + b.width / 2, y1 = b.top + b.height * 0.22;
    let landed = 0;
    for (let k = 0; k < n; k++) {
      const c = document.createElement("i");
      c.className = "flycoin";
      c.style.left = x0 + "px";
      c.style.top = y0 + "px";
      document.body.appendChild(c);
      const spread = (k - (n - 1) / 2) * 34, lift = 110 + Math.random() * 90;
      c.animate(
        [
          { transform: "translate(-50%,-50%) translate(0,0) scale(.3) rotateY(0deg)", opacity: 0 },
          { transform: `translate(-50%,-50%) translate(${spread}px, ${-lift * 0.5}px) scale(1.25) rotateY(200deg)`, opacity: 1, offset: 0.25 },
          { transform: `translate(-50%,-50%) translate(${(x1 - x0) * 0.6 + spread * 0.5}px, ${(y1 - y0) * 0.55 - lift}px) scale(1.1) rotateY(520deg)`, opacity: 1, offset: 0.62 },
          { transform: `translate(-50%,-50%) translate(${x1 - x0}px, ${y1 - y0}px) scale(.5) rotateY(900deg)`, opacity: 1 },
        ],
        { duration: 900 + Math.random() * 120, delay: k * 95, easing: "cubic-bezier(.35,0,.6,1)", fill: "forwards" }
      ).onfinish = () => {
        c.remove();
        FX.sound.coin(landed);
        FX.burst(x1, y1, 5, "spark", { power: 46, size: 6, dur: 520, up: true, gravity: 30 });
        // bounce on the wrapper with the Web Animations API – no forced layout, runs on the compositor
        document.getElementById("vsack")?.animate(
          [{ transform: "scale(1)" }, { transform: "scale(1.14,.88)", offset: 0.4 }, { transform: "scale(1)" }],
          { duration: 340, easing: "cubic-bezier(.3,1.6,.5,1)" }
        );
        if (++landed === n) {
          settle();
          FX.floatText(x1, b.top, `+${gain}`, "gold");
          FX.count(document.getElementById("goldnum"), quiz.prev, quiz.gold, 520);
          document.getElementById("vault")?.classList.add("flash");
        }
      };
    }
  }

  /** Wrong answer: the sack shakes and one grey coin tumbles away. */
  function loseCoin() {
    FX.sound.wrong();
    FX.vibrate([40, 50, 40]);
    const v = document.getElementById("vault"), sack = document.getElementById("vsack");
    if (!v || !sack || FX.reduced()) return;
    v.classList.add("nope");
    const b = sack.getBoundingClientRect();
    const c = document.createElement("i");
    c.className = "flycoin lost";
    c.style.left = b.left + b.width / 2 + "px";
    c.style.top = b.top + b.height * 0.2 + "px";
    document.body.appendChild(c);
    c.animate(
      [
        { transform: "translate(-50%,-50%) translate(0,0) rotate(0deg)", opacity: 1 },
        { transform: "translate(-50%,-50%) translate(46px,-60px) rotate(160deg)", opacity: 1, offset: 0.3 },
        { transform: "translate(-50%,-50%) translate(120px,260px) rotate(520deg)", opacity: 0 },
      ],
      { duration: 1000, easing: "cubic-bezier(.3,0,.7,1)", fill: "forwards" }
    ).onfinish = () => c.remove();
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

  function summary(h1, right, n, gold, max, marks, extra, review, fresh) {
    const ratio = gold / max;
    const [title, text] =
      ratio >= 0.95
        ? [T("Glatt koscher!", "Glatt kosher!"), T("Fast alles geholt. Du könntest im Rabbinat anfangen.", "Nearly every coin. You could start at the rabbinate.")]
        : ratio >= 0.7
          ? ["Mazel tov!", T("Deine Schatztruhe ist ordentlich gefüllt.", "Your treasure chest is nicely filled.")]
          : ratio >= 0.4
            ? [T("Nicht schlecht.", "Not bad."), T("Ein paar Regeln haben dich überrascht – genau dafür ist das Quiz da.", "A few rules surprised you – that’s exactly what the quiz is for.")]
            : [T("So ein Schlamassel.", "What a schlamassel."), T("Kein Problem: Die Erklärungen unten helfen beim nächsten Mal.", "No problem: the explanations below will help next time.")];
    const rich = ratio >= 0.7;
    app.innerHTML =
      band(`<div class="quiz"><h1>${h1}</h1></div>`, "short") +
      `<div class="wrap lift"><section class="quiz">
        <div class="result treasure${rich ? " rich" : ""}">
          <div class="tstage"><div class="tglow" aria-hidden="true"></div>${rich ? ART.chest || "" : `<div class="vsack" data-fill="${fillOf(gold, max)}" style="--s:1">${ART.sack || ""}</div>`}</div>
          <div class="big"><span id="bignum">${fresh ? 0 : gold}</span></div>
          <p class="goldsub">${T("Gold von", "gold of")} ${max} · ${right}/${n} ${T("richtig", "right")}</p>
          <div class="marks" aria-hidden="true">${[...marks].map((m, k) => `<i class="${m === "🟩" ? "ok" : "no"}" style="animation-delay:${0.25 + k * 0.07}s"></i>`).join("")}</div>
          <h1 style="font-size:32px;margin-top:14px">${title}</h1>
          <p>${text}</p>
          ${extra}
        </div>
        ${review}
      </section></div>`;
    document.getElementById("share")?.addEventListener("click", () => share(shareText(right, n, gold, max, marks)));
    if (fresh) {
      FX.count(document.getElementById("bignum"), 0, gold, 1400);
      if (rich) {
        FX.sound.win();
        FX.rain(Math.round(14 + 26 * ratio), "coin");
      }
    }
  }

  function resultView() {
    FX.setPath("/koscher");
    const n = quiz.qs.length;
    const right = quiz.picks.filter((p, k) => p === quiz.qs[k].a).length;
    const max = maxGold();
    const marks = quiz.picks.map((p, k) => (p === quiz.qs[k].a ? "🟩" : "🟥")).join("");
    if (quiz.mode === "daily" && !quiz.replay) saveDone({ day: quiz.day, right, n, gold: quiz.gold, max, marks });
    summary(
      T("Dein Schatz", "Your treasure"),
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
    FX.setPath("/koscher");
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
  const unbindSound = window.KTFX.bindSound(app, T("Ton an", "Sound on"), T("Ton aus", "Sound off"));
  route();
  return () => {
    window.removeEventListener("hashchange", route);
    unbindSound();
  };
};
