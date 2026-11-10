(function () {
  "use strict";
  const app = document.getElementById("app");
  const Q = window.QUESTIONS;
  const ROUND = 10;
  const CATS = ["Alle", "Essen", "Schabbat", "Körper", "Alltag"];
  const OWNER = { name: "Yosef Al Khatib", street: "Flottheide 23", city: "41564 Kaarst", phone: "0176 57998306", phoneHref: "+4917657998306", email: "firmengrafik@gmail.com" };

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

  function setNav(route) {
    document.querySelectorAll(".top nav a").forEach((a) => {
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
    app.innerHTML = `
      <section class="hero">
        <h1>Ist das koscher?</h1>
        <p class="lead">Shrimps, Giraffe, Lichtschalter am Schabbat: Rate, was im Judentum erlaubt ist – und erfahre, warum.</p>
        <div class="probe">
          <small>${esc(cat)}</small>
          <p>${esc(item)}</p>
          <span id="probe-stamp"></span>
        </div>
        <div class="actions">
          <a class="btn" href="#/quiz">Quiz starten</a>
          <a class="btn ghost" href="#/fakten">Fun Facts lesen</a>
        </div>
      </section>
      <section class="paths" aria-label="Bereiche">
        <a class="path" href="#/quiz"><h2>Das Quiz</h2><p>${ROUND} Fragen aus ${Q.length} – zu Essen, Schabbat, Körper und Alltag.</p></a>
        <a class="path" href="#/fakten"><h2>Fun Facts</h2><p>Warum Cola einen gelben Deckel bekommt und Manhattan einen Draht drumherum hat.</p></a>
        <a class="path" href="#/designs"><h2>Designs</h2><p>Shirts, Tassen und Taschen mit Sprüchen, die du schon kennst.</p></a>
      </section>`;
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
    app.innerHTML = `
      <section class="quiz">
        <div class="cats" role="group" aria-label="Thema">
          ${CATS.map((c) => `<button type="button" class="chip" data-cat="${c}" aria-pressed="${quiz.cat === c}">${c}</button>`).join("")}
        </div>
        <div class="progress"><span>Frage ${quiz.i + 1} von ${quiz.qs.length}</span><span>${quiz.picks.filter((p, k) => p === quiz.qs[k].a).length} richtig</span></div>
        <div class="bar"><i style="width:${(quiz.i / quiz.qs.length) * 100}%"></i></div>
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
      </section>`;
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
    app.innerHTML = `
      <section class="quiz">
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
            .map((q, k) => `<div><b>${quiz.picks[k] === q.a ? "✓" : "✕"}</b><span>${esc(q.q)} – <em>${stampText(q.a, food(q))}</em></span></div>`)
            .join("")}
        </div>
      </section>`;
    document.getElementById("again").addEventListener("click", () => {
      newQuiz(quiz.cat);
      quizView();
    });
    document.getElementById("share").addEventListener("click", async () => {
      const t = `Ist das koscher? Ich hatte ${right} von ${n} richtig.\n${quiz.picks.map((p, k) => (p === quiz.qs[k].a ? "🟩" : "🟥")).join("")}\n${location.origin}`;
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
    el.className = "copied";
    el.setAttribute("role", "status");
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }

  // ---------- Facts ----------
  function facts() {
    app.innerHTML = `
      <section class="page-head"><h1>Fun Facts</h1><p class="lead">Kleine Dinge über jüdische Regeln und Bräuche, die fast niemand weiß.</p></section>
      <section class="facts">${window.FACTS.map((f) => `<article class="fact"><h2>${esc(f.t)}</h2><p>${esc(f.d)}</p></article>`).join("")}</section>`;
  }

  // ---------- Designs ----------
  const ITEM = { shirt: "T-Shirt", mug: "Tasse", tote: "Stoffbeutel", sticker: "Sticker" };
  function mockup(d) {
    const lines = d.text.split("\n");
    const longest = Math.max(...lines.map((l) => l.length));
    const size = Math.min(28, Math.floor((d.item === "mug" ? 118 : 128) / (longest * 0.56)));
    const textBlock = (cx, cy, fill) =>
      `<text x="${cx}" y="${cy - ((lines.length - 1) * size * 0.55)}" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="${size}" fill="${fill}">${lines
        .map((l, i) => `<tspan x="${cx}" dy="${i ? size * 1.1 : 0}">${esc(l)}</tspan>`)
        .join("")}</text>`;
    const stampBox = (cx, cy, w, h, fill) =>
      d.stamp ? `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="10" fill="none" stroke="${fill}" stroke-width="4" transform="rotate(-8 ${cx} ${cy})"/>` : "";
    const edge = d.color === "#ffffff" || d.color === "#f4f6fb" ? "#cfd5e0" : "none";
    if (d.item === "shirt")
      return `<svg viewBox="0 0 240 240" role="img" aria-label="${ITEM.shirt} mit Aufdruck ${esc(d.text.replace("\n", " "))}">
        <path d="M78 34 L52 44 L18 78 L42 104 L60 90 L60 210 L180 210 L180 90 L198 104 L222 78 L188 44 L162 34 C156 50 140 58 120 58 C100 58 84 50 78 34Z" fill="${d.color}" stroke="${edge === "none" ? "rgba(0,0,0,.12)" : edge}" stroke-width="2"/>
        ${stampBox(120, 128, 140, 70, d.ink)}${textBlock(120, 138, d.ink)}</svg>`;
    if (d.item === "mug")
      return `<svg viewBox="0 0 240 240" role="img" aria-label="${ITEM.mug} mit Aufdruck ${esc(d.text.replace("\n", " "))}">
        <path d="M176 90 h14 a26 26 0 0 1 0 52 h-14" fill="none" stroke="${d.color === "#ffffff" ? "#cfd5e0" : d.color}" stroke-width="12"/>
        <rect x="46" y="58" width="134" height="140" rx="16" fill="${d.color}" stroke="${edge === "none" ? "rgba(0,0,0,.1)" : edge}" stroke-width="2"/>
        ${stampBox(113, 128, 110, 66, d.ink)}${textBlock(113, 138, d.ink)}</svg>`;
    if (d.item === "tote")
      return `<svg viewBox="0 0 240 240" role="img" aria-label="${ITEM.tote} mit Aufdruck ${esc(d.text.replace("\n", " "))}">
        <path d="M88 76 C88 30 152 30 152 76" fill="none" stroke="${d.color}" stroke-width="10" />
        <path d="M88 76 C88 30 152 30 152 76" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="10" />
        <rect x="52" y="74" width="136" height="146" rx="6" fill="${d.color}"/>
        ${stampBox(120, 146, 120, 70, d.ink)}${textBlock(120, 154, d.ink)}</svg>`;
    return `<svg viewBox="0 0 240 240" role="img" aria-label="${ITEM.sticker} mit Aufdruck ${esc(d.text.replace("\n", " "))}">
      <circle cx="120" cy="120" r="92" fill="${d.color}"/>
      <circle cx="120" cy="120" r="78" fill="none" stroke="${d.ink}" stroke-width="3" stroke-dasharray="4 6"/>
      ${textBlock(120, 130, d.ink)}</svg>`;
  }
  function designs() {
    app.innerHTML = `
      <section class="page-head"><h1>Designs</h1><p class="lead">Sprüche, die im Deutschen längst Alltag sind – auf Shirts, Tassen, Taschen und Stickern.</p></section>
      <section class="designs">
        ${window.DESIGNS.map((d) => `<figure class="design" style="margin:0">${mockup(d)}<figcaption><p>${esc(d.text.replace("\n", " "))}</p><small>${ITEM[d.item]}</small></figcaption></figure>`).join("")}
      </section>
      <div class="note">
        <strong>Bald im Shop.</strong> Die Designs gibt es bald zu kaufen. Du hast eine Idee für einen Spruch?
        <a href="mailto:${OWNER.email}?subject=Design-Idee%20f%C3%BCr%20istdaskosher.de">Schreib sie uns.</a>
      </div>`;
  }

  // ---------- Legal ----------
  function impressum() {
    app.innerHTML = `<section class="legal"><h1>Impressum</h1>
      <h2>Angaben gemäß § 5 DDG</h2><p><strong>${OWNER.name}</strong><br>${OWNER.street}<br>${OWNER.city}</p>
      <h2>Kontakt</h2><p>Telefon: <a href="tel:${OWNER.phoneHref}">${OWNER.phone}</a><br>E-Mail: <a href="mailto:${OWNER.email}">${OWNER.email}</a></p>
      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2><p>${OWNER.name}, ${OWNER.street}, ${OWNER.city}</p>
      <h2>Hinweis zu den Inhalten</h2><p>Die Antworten im Quiz folgen vereinfacht der traditionellen (orthodoxen) Auslegung der Halacha. Jüdische Strömungen und Gemeinden sehen manches unterschiedlich. Die Inhalte ersetzen keine Auskunft eines Rabbiners.</p>
      <h2>Verbraucherstreitbeilegung</h2><p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p></section>`;
  }
  function datenschutz() {
    app.innerHTML = `<section class="legal"><h1>Datenschutz</h1>
      <h2>1. Verantwortlicher</h2><p>${OWNER.name}, ${OWNER.street}, ${OWNER.city}, ${OWNER.email}</p>
      <h2>2. Hosting</h2><p>Die Website wird bei Vercel Inc. (440 N Barranca Ave #4133, Covina, CA 91723, USA) gehostet. Beim Aufruf werden technisch notwendige Daten wie IP-Adresse, Datum, Uhrzeit und Browser verarbeitet, um die Seite auszuliefern und vor Missbrauch zu schützen (Art. 6 Abs. 1 lit. f DSGVO). Für Übermittlungen in die USA gelten das EU-US Data Privacy Framework bzw. Standardvertragsklauseln.</p>
      <h2>3. Schriftarten</h2><p>Die Schriftart wird von Google Fonts (Google Ireland Limited) geladen. Dabei wird Ihre IP-Adresse an Google übertragen (Art. 6 Abs. 1 lit. f DSGVO).</p>
      <h2>4. Keine Cookies, kein Tracking</h2><p>Wir setzen keine Cookies und keine Analyse- oder Werbedienste ein. Ihre Quiz-Antworten werden nicht gespeichert und verlassen Ihr Gerät nicht.</p>
      <h2>5. Ihre Rechte</h2><p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Widerspruch und Datenübertragbarkeit sowie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.</p></section>`;
  }

  // ---------- Router ----------
  const ROUTES = { "": home, quiz: quizView, fakten: facts, designs, impressum, datenschutz };
  const TITLES = { "": "Ist das koscher? – Das Quiz über jüdische Regeln", quiz: "Quiz – Ist das koscher?", fakten: "Fun Facts – Ist das koscher?", designs: "Designs – Ist das koscher?", impressum: "Impressum – Ist das koscher?", datenschutz: "Datenschutz – Ist das koscher?" };
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
})();
