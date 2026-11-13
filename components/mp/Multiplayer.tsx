"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getName, nameProblem } from "@/lib/leaderboard";
import {
  COUNTS,
  MAX_PLAYERS,
  MP_GAMES,
  TIEFGANG_DEFAULT_SECS,
  TIMES,
  buildQuestions,
  cleanCode,
  colorFor,
  gameOf,
  judge,
  loadHost,
  newCode,
  rareAnswers,
  realtime,
  saveHost,
  tabId,
  tiefgangQ,
  validCode,
  type AnswerMsg,
  type GameId,
  type HostSave,
  type Phase,
  type QView,
  type RoomState,
} from "@/lib/mp";
import { check, emojiFor, type Answer, type Question } from "@/lib/tiefgang";
import { Suggestion } from "../Suggestion";

type Member = { name: string; host: boolean };
type LobbyEntry = { code: string; title: string; game: GameId; players: number; phase: Phase };

const NAME_KEY = "geografik:mpname";
function storedName() {
  try {
    return localStorage.getItem(NAME_KEY) || getName() || "";
  } catch {
    return "";
  }
}
function storeName(n: string) {
  try {
    localStorage.setItem(NAME_KEY, n);
  } catch {}
}

// ======================================================================
// Entry: start screen or room
// ======================================================================

export function Multiplayer() {
  const params = useSearchParams();
  const router = useRouter();
  const urlCode = cleanCode(params.get("code") || "");
  const [me, setMe] = useState("");
  const [name, setName] = useState("");
  const [joined, setJoined] = useState<{ code: string; host: boolean } | null>(null);

  useEffect(() => {
    setMe(tabId());
    setName(storedName());
  }, []);

  // coming back after a refresh: rejoin straight away (as admin if this tab created the room)
  useEffect(() => {
    if (!me || joined || !validCode(urlCode)) return;
    const saved = loadHost(urlCode);
    const n = storedName();
    if (saved && n) setJoined({ code: urlCode, host: true });
    else if (n && sessionStorage.getItem("kt:mp:in") === urlCode) setJoined({ code: urlCode, host: false });
  }, [me, urlCode, joined]);

  const enter = (code: string, host: boolean) => {
    storeName(name.trim());
    try {
      sessionStorage.setItem("kt:mp:in", code);
    } catch {}
    setJoined({ code, host });
    router.replace(`/multiplayer?code=${code}`, { scroll: false });
  };
  const leave = () => {
    if (joined) saveHost(joined.code, null);
    try {
      sessionStorage.removeItem("kt:mp:in");
    } catch {}
    setJoined(null);
    router.replace("/multiplayer", { scroll: false });
  };

  if (!me) return <div className="min-h-[60vh]" aria-busy="true" />;
  if (joined) return <Room key={joined.code} code={joined.code} me={me} name={name.trim()} host={joined.host} onLeave={leave} />;
  return <Start name={name} setName={setName} initialCode={urlCode} onEnter={enter} />;
}

// ======================================================================
// Start screen
// ======================================================================

function Start({ name, setName, initialCode, onEnter }: { name: string; setName: (s: string) => void; initialCode: string; onEnter: (code: string, host: boolean) => void }) {
  const [code, setCode] = useState(initialCode);
  const [err, setErr] = useState("");
  const invited = validCode(initialCode);
  const problem = name.trim() ? nameProblem(name) : "Gib zuerst deinen Namen ein.";

  const go = (c: string, host: boolean) => {
    if (problem) return setErr(problem);
    if (!host && !validCode(c)) return setErr("Der Code hat 5 Zeichen, zum Beispiel K7QXM.");
    setErr("");
    onEnter(c, host);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:pt-10">
      <h1 className="text-[32px] font-semibold leading-tight sm:text-[44px]">Mit Freunden spielen</h1>
      <p className="mt-2 max-w-xl text-lg text-muted">
        {invited ? (
          <>
            Du wurdest zum Server <strong className="font-display text-ink">{initialCode}</strong> eingeladen. Gib deinen Namen ein und tritt bei.
          </>
        ) : (
          "Erstelle einen Server oder tritt einem bei. Alle bekommen dieselbe Frage, und wenn alle geantwortet haben, vergleicht ihr eure Antworten."
        )}
      </p>

      <label className="mt-7 block">
        <span className="mb-1.5 block font-display text-lg font-semibold">Dein Name</span>
        <input
          className="input max-w-sm"
          value={name}
          maxLength={20}
          autoComplete="nickname"
          placeholder="z. B. Sam"
          onChange={(e) => {
            setName(e.target.value);
            setErr("");
          }}
          onKeyDown={(e) => e.key === "Enter" && invited && go(initialCode, false)}
        />
      </label>

      {invited ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={() => go(initialCode, false)}>
            Server {initialCode} beitreten
          </button>
          <Link href="/multiplayer" className="btn-ghost">
            Anderen Server wählen
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="card flex flex-col p-5">
            <h2 className="text-2xl font-semibold">Server erstellen</h2>
            <p className="mt-1 flex-1 text-muted">Du bist der Admin und entscheidest, welches Spiel gespielt wird.</p>
            <button type="button" className="btn-primary mt-4" onClick={() => go(newCode(), true)}>
              Server erstellen
            </button>
          </div>
          <div className="card flex flex-col p-5">
            <h2 className="text-2xl font-semibold">Code eingeben</h2>
            <p className="mt-1 text-muted">Den Code bekommst du vom Admin.</p>
            <div className="mt-4 flex gap-2">
              <input
                className="input min-w-0 flex-1 text-center font-display text-xl uppercase tracking-[0.25em]"
                value={code}
                placeholder="K7QXM"
                inputMode="text"
                autoCapitalize="characters"
                aria-label="Server-Code"
                onChange={(e) => {
                  setCode(cleanCode(e.target.value));
                  setErr("");
                }}
                onKeyDown={(e) => e.key === "Enter" && go(code, false)}
              />
              <button type="button" className="btn-primary" onClick={() => go(code, false)}>
                Beitreten
              </button>
            </div>
          </div>
        </div>
      )}
      {err && (
        <p className="mt-3 font-semibold text-bad" role="alert">
          {err}
        </p>
      )}

      {!invited && <OpenServers onJoin={(c) => go(c, false)} />}
    </div>
  );
}

function OpenServers({ onJoin }: { onJoin: (code: string) => void }) {
  const [list, setList] = useState<LobbyEntry[] | null>(null);
  useEffect(() => {
    const c = realtime().channel("kt:lobby");
    c.on("presence", { event: "sync" }, () => {
      const raw = c.presenceState<LobbyEntry>();
      const seen = new Map<string, LobbyEntry>();
      for (const k in raw) for (const e of raw[k]) if (e.code && !seen.has(e.code)) seen.set(e.code, e);
      setList([...seen.values()].sort((a, b) => Number(a.phase !== "lobby") - Number(b.phase !== "lobby") || b.players - a.players));
    });
    c.subscribe((s) => s === "SUBSCRIBED" && setList((l) => l ?? []));
    const t = setTimeout(() => setList((l) => l ?? []), 5000);
    return () => {
      clearTimeout(t);
      realtime().removeChannel(c);
    };
  }, []);

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-semibold">Offene Server</h2>
      {list == null ? (
        <p className="mt-2 text-muted">Suche Server …</p>
      ) : list.length === 0 ? (
        <p className="mt-2 text-muted">Gerade ist kein öffentlicher Server offen. Erstelle einfach selbst einen und schick den Code an deine Freunde.</p>
      ) : (
        <ul className="mt-3 grid gap-2.5">
          {list.map((e) => (
            <li key={e.code} className="card flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-lg font-semibold">{e.title}</span>
                <span className="block text-[15px] text-muted">
                  {gameOf(e.game)?.title} · {e.players} {e.players === 1 ? "Spieler" : "Spieler"} · {e.phase === "lobby" ? "wartet auf den Start" : "Spiel läuft"}
                </span>
              </span>
              <button type="button" className="btn-ghost shrink-0" onClick={() => onJoin(e.code)}>
                Beitreten
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ======================================================================
// Room
// ======================================================================

type Conn = "verbinde" | "ok" | "fehlt" | "weg" | "zu" | "fehler";

function freshState(code: string, me: string, name: string): RoomState {
  return {
    seq: 0,
    round: 0,
    code,
    hostId: me,
    title: `Server von ${name}`,
    pub: true,
    game: "koscher",
    n: 10,
    secs: 0,
    phase: "lobby",
    i: 0,
    total: 0,
    q: null,
    endsAt: 0,
    sentAt: 0,
    done: [],
    reveal: null,
    scores: {},
    names: {},
  };
}

function Room({ code, me, name, host, onLeave }: { code: string; me: string; name: string; host: boolean; onLeave: () => void }) {
  const [st, setSt] = useState<RoomState | null>(null);
  const [members, setMembers] = useState<Record<string, Member>>({});
  const [conn, setConn] = useState<Conn>(host ? "ok" : "verbinde");
  const [mine, setMine] = useState<{ round: number; i: number; msg: AnswerMsg; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const ch = useRef<RealtimeChannel | null>(null);
  const H = useRef<HostSave | null>(null);
  const membersRef = useRef<Record<string, Member>>({});
  const offset = useRef(0);
  const stRef = useRef<RoomState | null>(null);
  stRef.current = st;

  // ---------------- admin ----------------

  const send = useCallback((event: string, payload: unknown) => {
    ch.current?.send({ type: "broadcast", event, payload });
  }, []);

  const commit = useCallback(
    (next: RoomState) => {
      const s = { ...next, seq: next.seq + 1, sentAt: Date.now() };
      H.current!.st = s;
      saveHost(code, H.current);
      setSt(s);
      send("state", s);
    },
    [code, send]
  );

  const rebroadcast = useCallback(() => {
    if (H.current) send("state", { ...H.current.st, sentAt: Date.now() });
  }, [send]);

  const reveal = useCallback(() => {
    const h = H.current;
    if (!h || h.st.phase !== "frage") return;
    const s = h.st;
    const hq = h.qs[s.i];
    const ids = new Set([...Object.keys(membersRef.current), ...Object.keys(h.answers)]);
    const answers: Record<string, ReturnType<typeof judge>> = {};
    const scores = { ...s.scores };
    const names = { ...s.names };
    for (const id of ids) {
      answers[id] = h.answers[id] ?? null;
      scores[id] = (scores[id] || 0) + (answers[id]?.pts || 0);
      names[id] = membersRef.current[id]?.name ?? names[id] ?? "?";
    }
    commit({
      ...s,
      phase: "aufloesung",
      endsAt: 0,
      scores,
      names,
      reveal: { correct: hq.correct, explain: hq.explain, src: hq.src, answers, rare: hq.view.kind === "tiefgang" ? rareAnswers(hq.view.key) : undefined },
    });
  }, [commit]);

  const checkAll = useCallback(() => {
    const s = H.current?.st;
    if (!s || s.phase !== "frage") return;
    const present = Object.keys(membersRef.current);
    if (present.length && present.every((id) => s.done.includes(id))) reveal();
  }, [reveal]);

  const ask = useCallback(
    (base: RoomState, i: number) => {
      const h = H.current!;
      h.answers = {};
      commit({ ...base, phase: "frage", i, q: h.qs[i].view, done: [], reveal: null, endsAt: base.secs ? Date.now() + base.secs * 1000 : 0 });
    },
    [commit]
  );

  const onAnswer = useCallback(
    (msg: AnswerMsg) => {
      const h = H.current;
      if (!h) return;
      const s = h.st;
      if (s.phase !== "frage" || msg.i !== s.i || s.done.includes(msg.pid)) return rebroadcast();
      h.answers[msg.pid] = judge(h.qs[s.i], msg);
      commit({ ...s, done: [...s.done, msg.pid], names: { ...s.names, [msg.pid]: membersRef.current[msg.pid]?.name ?? s.names[msg.pid] ?? "?" } });
      checkAll();
    },
    [commit, checkAll, rebroadcast]
  );

  const start = async () => {
    const h = H.current;
    if (!h || busy) return;
    setBusy(true);
    try {
      h.qs = await buildQuestions(h.st.game, h.st.n);
      const names: Record<string, string> = {};
      for (const [id, m] of Object.entries(membersRef.current)) names[id] = m.name;
      ask({ ...h.st, round: h.st.round + 1, total: h.qs.length, scores: {}, names }, 0);
    } finally {
      setBusy(false);
    }
  };
  const nextQ = () => {
    const s = H.current?.st;
    if (!s || s.phase !== "aufloesung") return;
    if (s.i + 1 < s.total) ask(s, s.i + 1);
    else commit({ ...s, phase: "ende", q: null });
  };
  const toLobby = () => H.current && commit({ ...H.current.st, phase: "lobby", q: null, reveal: null, done: [], i: 0, total: 0, endsAt: 0 });
  const setting = (p: Partial<RoomState>) => H.current && H.current.st.phase === "lobby" && commit({ ...H.current.st, ...p });
  const close = () => {
    send("closed", {});
    onLeave();
  };

  // time limit (admin)
  useEffect(() => {
    if (!host || st?.phase !== "frage" || !st.endsAt) return;
    const t = setTimeout(reveal, Math.max(0, st.endsAt - Date.now()) + 800);
    return () => clearTimeout(t);
  }, [host, st?.phase, st?.endsAt, st?.i, reveal]);

  // ---------------- channel ----------------

  useEffect(() => {
    if (host) {
      H.current = loadHost(code) ?? { st: freshState(code, me, name), qs: [], answers: {} };
      setSt(H.current.st);
    }
    const c = realtime().channel(`kt:room:${code}`, { config: { broadcast: { self: false }, presence: { key: me } } });
    c.on("presence", { event: "sync" }, () => {
      const raw = c.presenceState<Member>();
      const m: Record<string, Member> = {};
      for (const k in raw) if (raw[k][0]) m[k] = { name: raw[k][0].name, host: raw[k][0].host };
      membersRef.current = m;
      setMembers(m);
      if (host) checkAll();
    });
    c.on("broadcast", { event: "state" }, ({ payload }) => {
      if (host) return;
      const s = payload as RoomState;
      if (s.code !== code) return;
      offset.current = Date.now() - s.sentAt;
      setSt((prev) => (!prev || s.seq >= prev.seq || s.hostId !== prev.hostId ? s : prev));
      setConn("ok");
    });
    c.on("broadcast", { event: "hello" }, () => host && rebroadcast());
    c.on("broadcast", { event: "answer" }, ({ payload }) => host && onAnswer(payload as AnswerMsg));
    c.on("broadcast", { event: "closed" }, () => !host && setConn("zu"));
    c.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await c.track({ name, host });
        if (host) rebroadcast();
        else c.send({ type: "broadcast", event: "hello", payload: { pid: me } });
      }
    });
    ch.current = c;
    return () => {
      ch.current = null;
      realtime().removeChannel(c);
    };
  }, [code, me, name, host, checkAll, onAnswer, rebroadcast]);

  // players: ask for the state until it arrives
  useEffect(() => {
    if (host || st) return;
    const t0 = Date.now();
    const t = setInterval(() => {
      if (Date.now() - t0 > 9000) {
        setConn("fehlt");
        clearInterval(t);
      } else send("hello", { pid: me });
    }, 1500);
    return () => clearInterval(t);
  }, [host, st, me, send]);

  // players: notice when the admin is gone
  const hostHere = Object.values(members).some((m) => m.host);
  useEffect(() => {
    if (host || !st || conn === "zu") return;
    if (hostHere) {
      if (conn === "weg") setConn("ok");
      return;
    }
    const t = setTimeout(() => setConn("weg"), 12000);
    return () => clearTimeout(t);
  }, [host, st, hostHere, conn]);

  // players: resend an answer the admin has not confirmed yet
  useEffect(() => {
    if (host || !mine || !st || st.phase !== "frage" || st.round !== mine.round || st.i !== mine.i || st.done.includes(me)) return;
    const t = setInterval(() => send("answer", mine.msg), 2000);
    return () => clearInterval(t);
  }, [host, mine, st, me, send]);

  // admin: show public rooms in the server list
  const lobbyEntry: LobbyEntry | null =
    host && st?.pub ? { code, title: st.title, game: st.game, players: Math.max(1, Object.keys(members).length), phase: st.phase } : null;
  const lobbyKey = lobbyEntry ? JSON.stringify(lobbyEntry) : "";
  const lobbyCh = useRef<RealtimeChannel | null>(null);
  useEffect(() => {
    if (!lobbyKey) return;
    const entry = JSON.parse(lobbyKey) as LobbyEntry;
    if (lobbyCh.current) {
      lobbyCh.current.track(entry);
      return;
    }
    const c = realtime().channel("kt:lobby", { config: { presence: { key: code } } });
    lobbyCh.current = c;
    c.on("presence", { event: "sync" }, () => {}); // presence is only switched on for channels that listen to it
    c.subscribe((s) => s === "SUBSCRIBED" && c.track(JSON.parse(lobbyKeyRef.current || lobbyKey)));
  }, [lobbyKey, code]);
  const lobbyKeyRef = useRef(lobbyKey);
  lobbyKeyRef.current = lobbyKey;
  useEffect(() => {
    if (lobbyKey || !lobbyCh.current) return;
    realtime().removeChannel(lobbyCh.current);
    lobbyCh.current = null;
  }, [lobbyKey]);
  useEffect(
    () => () => {
      if (lobbyCh.current) realtime().removeChannel(lobbyCh.current);
      lobbyCh.current = null;
    },
    []
  );

  // ---------------- answering (everyone, admin included) ----------------

  const myAns = mine && st && mine.round === st.round && mine.i === st.i && st.phase !== "lobby" ? mine : null;
  const answer = (part: Pick<AnswerMsg, "choice" | "tg">, label: string) => {
    const s = stRef.current;
    if (!s || s.phase !== "frage" || myAns) return;
    const msg: AnswerMsg = { pid: me, i: s.i, ...part };
    setMine({ round: s.round, i: s.i, msg, label });
    if (host) onAnswer(msg);
    else send("answer", msg);
  };

  // ---------------- render ----------------

  if (conn === "fehlt" || conn === "weg" || conn === "zu" || conn === "fehler") {
    const text =
      conn === "fehlt"
        ? `Den Server ${code} gibt es nicht oder der Admin ist gerade nicht online. Prüf den Code und versuch es noch einmal.`
        : conn === "zu"
          ? "Der Admin hat den Server geschlossen."
          : "Der Admin hat den Server verlassen. Sobald er zurückkommt, geht es hier weiter.";
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-3xl font-semibold">{conn === "fehlt" ? "Server nicht gefunden" : conn === "zu" ? "Server geschlossen" : "Admin weg"}</h1>
        <p className="mt-3 text-lg text-muted">{text}</p>
        <button type="button" className="btn-primary mt-6" onClick={onLeave}>
          Zur Server-Auswahl
        </button>
      </div>
    );
  }
  if (!st) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center" aria-busy="true">
        <p className="font-display text-2xl font-semibold">Verbinde mit Server {code} …</p>
      </div>
    );
  }

  const ids = Object.keys(members);
  const full = !host && !st.names[me] && st.phase !== "lobby" && ids.length > MAX_PLAYERS;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-5 sm:pt-8">
      <RoomBar st={st} members={members} me={me} />
      {full ? (
        <p className="mt-8 text-center text-lg font-semibold">Der Server ist voll ({MAX_PLAYERS} Spieler).</p>
      ) : st.phase === "lobby" ? (
        <LobbyView st={st} host={host} members={members} me={me} busy={busy} onSetting={setting} onStart={start} />
      ) : st.phase === "frage" && st.q ? (
        <QuestionView st={st} q={st.q} members={members} me={me} host={host} myAns={myAns} offset={host ? 0 : offset.current} onAnswer={answer} onForce={reveal} />
      ) : st.phase === "aufloesung" && st.q && st.reveal ? (
        <RevealView st={st} q={st.q} me={me} host={host} onNext={nextQ} />
      ) : st.phase === "ende" ? (
        <EndView st={st} me={me} host={host} onLobby={toLobby} />
      ) : null}

      <div className="mt-10 flex flex-wrap justify-center gap-3 border-t-2 border-line pt-6">
        {host ? (
          <button type="button" className="btn-ghost" onClick={close}>
            Server schließen
          </button>
        ) : (
          <button type="button" className="btn-ghost" onClick={onLeave}>
            Server verlassen
          </button>
        )}
      </div>
    </div>
  );
}

// ======================================================================
// Pieces
// ======================================================================

function Avatar({ id, name, size = 36, dim = false }: { id: string; name: string; size?: number; dim?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full border-[2.5px] border-ink font-display font-semibold text-white ${dim ? "opacity-35" : ""}`}
      style={{ width: size, height: size, background: colorFor(id), fontSize: size * 0.45 }}
      aria-hidden="true"
    >
      {(name || "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

function RoomBar({ st, members, me }: { st: RoomState; members: Record<string, Member>; me: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = `${location.origin}/multiplayer?code=${st.code}`;
    const text = `Spiel mit mir auf Koshertrivia – Server-Code ${st.code}`;
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) return await navigator.share({ title: "Koshertrivia", text, url });
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };
  const n = Object.keys(members).length;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-display text-lg font-semibold text-muted">{st.title}</p>
        <p className="flex items-center gap-2">
          <span className="text-muted">Code</span>
          <span className="font-display text-3xl font-semibold tracking-[0.18em]">{st.code}</span>
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold text-muted" aria-live="polite">
          {n} {n === 1 ? "Spieler" : "Spieler"} online
        </span>
        <button type="button" className="btn-ghost" onClick={share}>
          {copied ? "Link kopiert" : "Einladen"}
        </button>
      </div>
      <span className="sr-only">{members[me] ? "Du bist verbunden." : ""}</span>
    </div>
  );
}

function Players({ members, me, done }: { members: Record<string, Member>; me: string; done?: string[] }) {
  const list = Object.entries(members).sort((a, b) => Number(b[1].host) - Number(a[1].host) || a[1].name.localeCompare(b[1].name));
  return (
    <ul className="flex flex-wrap gap-2">
      {list.map(([id, m]) => {
        const ok = done?.includes(id);
        return (
          <li key={id} className={`flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 shadow-[0_3px_0_var(--color-edge)] ${done && !ok ? "opacity-60" : ""}`}>
            <Avatar id={id} name={m.name} size={30} />
            <span className="font-semibold">
              {m.name}
              {id === me && <span className="text-muted"> (du)</span>}
            </span>
            {m.host && <span className="rounded-full bg-[#f3d272] px-2 text-xs font-bold">Admin</span>}
            {done && (ok ? <span className="font-bold text-ok" aria-label="hat geantwortet">✓</span> : <span className="text-muted" aria-label="denkt noch">…</span>)}
          </li>
        );
      })}
    </ul>
  );
}

// ---------------- lobby ----------------

function LobbyView({
  st,
  host,
  members,
  me,
  busy,
  onSetting,
  onStart,
}: {
  st: RoomState;
  host: boolean;
  members: Record<string, Member>;
  me: string;
  busy: boolean;
  onSetting: (p: Partial<RoomState>) => void;
  onStart: () => void;
}) {
  const g = gameOf(st.game);
  return (
    <div className="mt-6">
      <h2 className="mb-2 text-xl font-semibold">Im Server</h2>
      <Players members={members} me={me} />

      {host ? (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold">Welches Spiel?</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {MP_GAMES.map((x) => {
              const on = x.id === st.game;
              return (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onSetting({ game: x.id, secs: x.id === "tiefgang" ? (st.secs || TIEFGANG_DEFAULT_SECS) : st.secs })}
                  className={`chunk relative px-4 py-3.5 text-left ${x.light ? "text-white" : "text-ink"} ${on ? "outline outline-4 outline-offset-2 outline-ink" : ""}`}
                  style={{ background: x.bg, ["--edge" as string]: x.edge }}
                >
                  <span className="block font-display text-xl font-semibold">{x.title}</span>
                  <span className={`block text-[15px] font-semibold ${x.light ? "text-white/80" : "text-ink/70"}`}>{x.desc}</span>
                  {on && (
                    <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white text-ink" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <fieldset>
              <legend className="mb-2 font-display text-lg font-semibold">Fragen</legend>
              <div className="flex flex-wrap gap-2">
                {COUNTS.map((n) => (
                  <button key={n} type="button" className="chip" aria-pressed={st.n === n} onClick={() => onSetting({ n })}>
                    {n}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 font-display text-lg font-semibold">Zeit pro Frage</legend>
              <div className="flex flex-wrap gap-2">
                {TIMES.map((t) => (
                  <button key={t} type="button" className="chip" aria-pressed={st.secs === t} onClick={() => onSetting({ secs: t })}>
                    {t ? `${t} s` : "Ohne Limit"}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-[#2c2a35]" checked={st.pub} onChange={(e) => onSetting({ pub: e.target.checked })} />
            <span>
              <span className="block font-semibold">In „Offene Server“ anzeigen</span>
              <span className="block text-[15px] text-muted">Aus: Nur wer den Code hat, kann beitreten.</span>
            </span>
          </label>

          <button type="button" className="btn-primary mt-7 w-full text-lg sm:w-auto" disabled={busy} onClick={onStart}>
            {busy ? "Lade Fragen …" : `${g.title} starten`}
          </button>
          <p className="mt-2 text-[15px] text-muted">Wer später dazukommt, steigt bei der nächsten Frage ein.</p>
        </div>
      ) : (
        <div className="card mt-8 p-6 text-center">
          <p className="text-muted">Der Admin hat ausgewählt</p>
          <p className="mt-1 font-display text-3xl font-semibold">{g.title}</p>
          <p className="mt-1 font-semibold text-muted">
            {st.n} Fragen · {st.secs ? `${st.secs} Sekunden pro Frage` : "ohne Zeitlimit"}
          </p>
          <p className="mt-5 font-semibold">Warte, bis der Admin das Spiel startet …</p>
        </div>
      )}
    </div>
  );
}

// ---------------- question ----------------

function useCountdown(endsAt: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endsAt]);
  return endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : null;
}

function QHead({ st, children }: { st: RoomState; children?: React.ReactNode }) {
  const g = gameOf(st.game);
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <p className="font-display text-lg font-semibold">
        {g.title} <span className="text-muted">· Frage {st.i + 1} von {st.total}</span>
      </p>
      {children}
    </div>
  );
}

function QuestionView({
  st,
  q,
  members,
  me,
  host,
  myAns,
  offset,
  onAnswer,
  onForce,
}: {
  st: RoomState;
  q: QView;
  members: Record<string, Member>;
  me: string;
  host: boolean;
  myAns: { label: string } | null;
  offset: number;
  onAnswer: (part: Pick<AnswerMsg, "choice" | "tg">, label: string) => void;
  onForce: () => void;
}) {
  const left = useCountdown(st.endsAt ? st.endsAt + offset : 0);
  const present = Object.keys(members);
  const doneN = present.filter((id) => st.done.includes(id)).length;
  const g = gameOf(st.game);

  return (
    <div>
      <QHead st={st}>
        {left != null && (
          <span className={`grid h-12 w-12 place-items-center rounded-full border-[3px] border-ink font-display text-xl font-semibold tabular-nums ${left <= 5 ? "bg-bad text-white" : "bg-white"}`} aria-label={`${left} Sekunden übrig`}>
            {left}
          </span>
        )}
      </QHead>

      <div className={`chunk mt-3 px-5 py-6 sm:px-8 sm:py-8 ${g.light ? "text-white" : "text-ink"}`} style={{ background: g.bg, ["--edge" as string]: g.edge }}>
        {q.kind === "choice" && q.cat && <span className={`rounded-full px-3 py-1 text-sm font-bold ${g.light ? "bg-white/15" : "bg-white/60"}`}>{q.cat}</span>}
        {q.kind === "choice" && q.img && (
          <div className="mx-auto mb-4 mt-1 flex w-full max-w-sm items-center justify-center rounded-2xl bg-surface p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={q.img} alt="Flagge" className="max-h-44 w-auto rounded-md border-2 border-ink/15" />
          </div>
        )}
        <h2 className={`font-display font-semibold leading-tight ${q.kind === "choice" && q.img ? "text-center text-2xl" : "mt-3 text-[28px] sm:text-4xl"}`}>
          {q.kind === "choice" && (st.game === "koscher" || st.game === "halal") ? `${q.text}?` : q.text}
        </h2>
        {q.kind === "tiefgang" && <p className="mt-2 font-semibold text-white/80">{q.hint}</p>}
      </div>

      <div className="mt-5">
        {myAns ? (
          <div className="card p-5 text-center" role="status">
            <p className="text-muted">Deine Antwort</p>
            <p className="font-display text-2xl font-semibold">{myAns.label}</p>
            <p className="mt-3 font-semibold">Warte auf die anderen …</p>
          </div>
        ) : q.kind === "choice" ? (
          <div className={`grid gap-3 ${q.options.length === 4 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
            {q.options.map((o, k) => (
              <button key={o.id} type="button" className="btn-ghost min-h-[60px] justify-start gap-3 px-4 text-left text-lg" onClick={() => onAnswer({ choice: o.id }, o.label)}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface font-display text-base" aria-hidden="true">
                  {"ABCD"[k]}
                </span>
                {o.label}
              </button>
            ))}
          </div>
        ) : (
          <TiefgangInput qkey={q.key} timeUp={left === 0} onDone={(a) => (a ? onAnswer({ tg: { id: a.id } }, a.name) : onAnswer({ tg: null }, "Keine Antwort"))} />
        )}
      </div>

      <div className="mt-7">
        <p className="mb-2 font-semibold" aria-live="polite">
          {doneN} von {present.length} haben geantwortet
        </p>
        <Players members={members} me={me} done={st.done} />
        {host && doneN < present.length && (
          <button type="button" className="btn-ghost mt-4" onClick={onForce}>
            Nicht mehr warten – Antworten zeigen
          </button>
        )}
      </div>
    </div>
  );
}

function TiefgangInput({ qkey, timeUp, onDone }: { qkey: string; timeUp: boolean; onDone: (a: Answer | null) => void }) {
  const q = useMemo<Question | undefined>(() => tiefgangQ(qkey), [qkey]);
  const [v, setV] = useState("");
  const [sug, setSug] = useState<{ name: string; for: string } | null>(null);
  const [err, setErr] = useState("");
  const [shake, setShake] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  if (!q) return <p className="font-semibold text-bad">Diese Frage konnte nicht geladen werden.</p>;

  const submit = () => {
    if (timeUp) return;
    const r = check(q, v, sug?.for === v);
    if (r.ok) return onDone(r.answer);
    if (r.suggest) {
      setSug({ name: r.suggest, for: v });
      setErr("");
      return;
    }
    setSug(null);
    setErr(r.reason);
    setShake((s) => s + 1);
    navigator.vibrate?.(120);
    ref.current?.select();
  };

  return (
    <div>
      <style>{`@keyframes mpshake { 0% { transform: translateX(0); box-shadow: 0 0 0 3px #d6453d } 15%,55% { transform: translateX(-9px) } 35%,75% { transform: translateX(9px) } 100% { transform: translateX(0) } } .mp-shake { animation: mpshake .5s ease-in-out } @media (prefers-reduced-motion: reduce) { .mp-shake { animation: none } }`}</style>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          key={`in${shake}`}
          ref={ref}
          className={`input min-w-0 flex-1 ${shake ? "mp-shake" : ""}`}
          value={v}
          disabled={timeUp}
          autoFocus={shake > 0}
          placeholder={timeUp ? "Die Zeit ist um" : "Deine Antwort"}
          aria-label="Deine Antwort"
          onChange={(e) => {
            setV(e.target.value);
            setErr("");
          }}
        />
        <button type="submit" className="btn-primary" disabled={timeUp || !v.trim()}>
          Antworten
        </button>
      </form>
      {sug && <Suggestion name={sug.name} onTake={() => { setV(sug.name); setSug(null); }} hint="oder nochmal Enter, wenn du deine Schreibweise meinst" />}
      {err && <p className="mt-2 font-semibold text-bad">{err} Versuch es nochmal.</p>}
      <button type="button" className="mt-3 text-[15px] font-semibold text-muted underline underline-offset-2 hover:text-ink" onClick={() => onDone(null)}>
        Passen – mir fällt nichts ein
      </button>
    </div>
  );
}

// ---------------- reveal ----------------

function RevealView({ st, q, me, host, onNext }: { st: RoomState; q: QView; me: string; host: boolean; onNext: () => void }) {
  const rv = st.reveal!;
  const ids = Object.keys(rv.answers);
  const nameOf = (id: string) => st.names[id] ?? "?";
  const last = st.i + 1 >= st.total;
  const mineA = rv.answers[me];

  return (
    <div>
      <QHead st={st} />
      <div className="card mt-3 px-5 py-5 sm:px-7">
        <h2 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">
          {q.kind === "choice" && (st.game === "koscher" || st.game === "halal") ? `${q.text}?` : q.text}
        </h2>
        {q.kind === "choice" && q.img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={q.img} alt="Flagge" className="mt-3 h-20 w-auto rounded-md border-2 border-ink/15" />
        )}
        {ids.includes(me) && (
          <p className={`mt-3 inline-block rounded-full px-3 py-1 font-bold text-white ${mineA?.ok ? "bg-ok" : "bg-bad"}`}>
            {q.kind === "tiefgang" ? (mineA ? `+${mineA.pts} Punkte` : "Keine Antwort") : mineA?.ok ? "Richtig!" : mineA ? "Leider falsch" : "Keine Antwort"}
          </p>
        )}
      </div>

      {q.kind === "choice" ? (
        <ul className="mt-4 grid gap-2.5">
          {q.options.map((o) => {
            const who = ids.filter((id) => rv.answers[id]?.choice === o.id);
            const right = o.id === rv.correct;
            return (
              <li key={o.id} className={`rounded-2xl border-[3px] px-4 py-3 ${right ? "border-ok bg-[#e5f4e3]" : "border-line bg-white"}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display text-lg font-semibold">
                    {right && <span className="mr-1.5 text-ok" aria-hidden="true">✓</span>}
                    {o.label}
                    {right && <span className="sr-only"> (richtig)</span>}
                  </span>
                  <span className="font-semibold tabular-nums text-muted">{who.length}</span>
                </div>
                {who.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {who.map((id) => (
                      <span key={id} className="flex items-center gap-1.5 rounded-full bg-white py-0.5 pl-0.5 pr-2.5 text-[15px] font-semibold shadow-[0_2px_0_var(--color-edge)]">
                        <Avatar id={id} name={nameOf(id)} size={24} />
                        {nameOf(id)}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
          {ids.some((id) => !rv.answers[id]) && (
            <li className="px-1 text-[15px] text-muted">
              Ohne Antwort: {ids.filter((id) => !rv.answers[id]).map(nameOf).join(", ")}
            </li>
          )}
        </ul>
      ) : (
        <div className="mt-4">
          <ul className="grid gap-2">
            {[...ids]
              .sort((a, b) => (rv.answers[b]?.pts ?? -1) - (rv.answers[a]?.pts ?? -1))
              .map((id) => {
                const a = rv.answers[id];
                return (
                  <li key={id} className="card flex items-center gap-3 px-4 py-2.5">
                    <Avatar id={id} name={nameOf(id)} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] text-muted">{nameOf(id)}</span>
                      <span className="block truncate font-display text-lg font-semibold">{a ? a.label : "Keine Antwort"}</span>
                    </span>
                    <span className="text-2xl" aria-hidden="true">
                      {emojiFor(a?.pts ?? 0)}
                    </span>
                    <span className="w-12 text-right font-display text-xl font-semibold tabular-nums">{a?.pts ?? 0}</span>
                  </li>
                );
              })}
          </ul>
          {rv.rare && rv.rare.length > 0 && (
            <p className="mt-3 text-[15px] text-muted">
              Besonders selten wären gewesen: {rv.rare.map((r) => `${r.name} (${r.pts})`).join(", ")}
            </p>
          )}
        </div>
      )}

      {rv.explain && (
        <div className="mt-4 rounded-2xl bg-surface px-5 py-4">
          <p className="text-[17px] leading-relaxed">{rv.explain}</p>
          {rv.src && <p className="mt-2 text-[15px] font-semibold text-muted">Quelle: {rv.src}</p>}
        </div>
      )}

      <Scores st={st} me={me} compact />

      <div className="mt-6">
        {host ? (
          <button type="button" className="btn-primary w-full text-lg sm:w-auto" onClick={onNext}>
            {last ? "Zum Endstand" : "Nächste Frage"}
          </button>
        ) : (
          <p className="font-semibold text-muted">Der Admin startet gleich {last ? "den Endstand" : "die nächste Frage"} …</p>
        )}
      </div>
    </div>
  );
}

function Scores({ st, me, compact = false }: { st: RoomState; me: string; compact?: boolean }) {
  const rows = Object.entries(st.scores)
    .map(([id, p]) => ({ id, p, name: st.names[id] ?? "?" }))
    .sort((a, b) => b.p - a.p || a.name.localeCompare(b.name));
  const unit = st.game === "tiefgang" ? "Punkte" : "richtig";
  let rank = 0;
  let prev = -1;
  return (
    <div className={compact ? "mt-6" : "mt-5"}>
      {compact && <h3 className="mb-2 text-lg font-semibold">Zwischenstand</h3>}
      <ol className="grid gap-1.5">
        {rows.map((r, k) => {
          if (r.p !== prev) rank = k + 1;
          prev = r.p;
          const medal = !compact && rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : null;
          return (
            <li key={r.id} className={`flex items-center gap-3 rounded-xl px-3 ${compact ? "py-1.5" : "py-2.5"} ${r.id === me ? "bg-brand-soft" : "bg-white"}`}>
              <span className="w-7 text-center font-display text-lg font-semibold tabular-nums">{medal ?? `${rank}.`}</span>
              <Avatar id={r.id} name={r.name} size={compact ? 26 : 34} />
              <span className="min-w-0 flex-1 truncate font-semibold">
                {r.name}
                {r.id === me && <span className="text-muted"> (du)</span>}
              </span>
              <span className="font-display text-lg font-semibold tabular-nums">
                {r.p} <span className="text-[15px] text-muted">{unit}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function EndView({ st, me, host, onLobby }: { st: RoomState; me: string; host: boolean; onLobby: () => void }) {
  const best = Math.max(0, ...Object.values(st.scores));
  const winners = Object.entries(st.scores)
    .filter(([, p]) => p === best)
    .map(([id]) => st.names[id] ?? "?");
  return (
    <div className="mt-6">
      <div className="chunk px-5 py-7 text-center" style={{ background: "#f3d272", ["--edge" as string]: "#c9a43c" }}>
        <p className="font-display text-lg font-semibold text-ink/70">{gameOf(st.game).title} · Endstand</p>
        <p className="mt-1 font-display text-3xl font-semibold sm:text-4xl">
          {winners.length === 1 ? `${winners[0]} gewinnt!` : `Unentschieden: ${winners.join(" & ")}`}
        </p>
      </div>
      <Scores st={st} me={me} />
      <div className="mt-6">
        {host ? (
          <button type="button" className="btn-primary w-full text-lg sm:w-auto" onClick={onLobby}>
            Neues Spiel wählen
          </button>
        ) : (
          <p className="font-semibold text-muted">Der Admin wählt gleich das nächste Spiel …</p>
        )}
      </div>
    </div>
  );
}
