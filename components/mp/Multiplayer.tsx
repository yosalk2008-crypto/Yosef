"use client";

import Link from "@/components/Link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getName, nameProblem } from "@/lib/leaderboard";
import {
  MP_DAILY,
  gameDesc,
  gameTitle,
  countsFor,
  isDaily,
  timesFor,
  MAX_PLAYERS,
  MP_GAMES,
  TIEFGANG_DEFAULT_SECS,
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
import { MAX_PTS, check, emojiFor, meters, tierOf, type Answer, type Question } from "@/lib/tiefgang";
import { OceanScene } from "../tiefgang/OceanScene";
import { Creature } from "../tiefgang/Creatures";
import type { Impact } from "../tiefgang/OceanFx";
import { Suggestion } from "../Suggestion";
import { GameArt } from "../GameArt";
import { DailyGame } from "@/app/(de)/taeglich/[spiel]/DailyGame";
import { MpDailyContext, mpLoad, type MpDaily } from "@/lib/mpDaily";
import { dayNumber, formatDay, type DailyResult } from "@/lib/daily";
import { localHref, useLang, useT, type Lang } from "@/lib/i18n";
import { ansName, qHint, qText } from "@/lib/tiefgang-i18n";

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
  const lang = useLang();
  const t = useT();
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
    router.replace(localHref(lang, `/multiplayer?code=${code}`), { scroll: false });
  };
  const leave = () => {
    if (joined) saveHost(joined.code, null);
    try {
      sessionStorage.removeItem("kt:mp:in");
    } catch {}
    setJoined(null);
    router.replace(localHref(lang, "/multiplayer"), { scroll: false });
  };

  if (!me) return <div className="min-h-[60vh]" aria-busy="true" />;
  if (joined) return <Room key={joined.code} code={joined.code} me={me} name={name.trim()} host={joined.host} onLeave={leave} />;
  return <Start name={name} setName={setName} initialCode={urlCode} onEnter={enter} />;
}

// ======================================================================
// Start screen
// ======================================================================

function Start({ name, setName, initialCode, onEnter }: { name: string; setName: (s: string) => void; initialCode: string; onEnter: (code: string, host: boolean) => void }) {
  const lang = useLang();
  const t = useT();
  const [code, setCode] = useState(initialCode);
  const [err, setErr] = useState("");
  const invited = validCode(initialCode);
  const problem = name.trim() ? nameProblem(name, lang) : t("Gib zuerst deinen Namen ein.", "Enter your name first.");

  const go = (c: string, host: boolean) => {
    if (problem) return setErr(problem);
    if (!host && !validCode(c)) return setErr(t("Der Code hat 5 Zeichen, zum Beispiel K7QXM.", "The code has 5 characters, e.g. K7QXM."));
    setErr("");
    onEnter(c, host);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:pt-10">
      <h1 className="text-[32px] font-semibold leading-tight sm:text-[44px]">{t("Mit Freunden spielen", "Play with friends")}</h1>
      <p className="mt-2 max-w-xl text-lg text-muted">
        {invited ? (
          <>
            {t("Du wurdest zum Server", "You’ve been invited to server")} <strong className="font-display text-ink">{initialCode}</strong>
            {t(" eingeladen. Gib deinen Namen ein und tritt bei.", ". Enter your name and join.")}
          </>
        ) : (
          t(
            "Erstelle einen Server oder tritt einem bei. Alle bekommen dieselbe Frage, und wenn alle geantwortet haben, vergleicht ihr eure Antworten.",
            "Create a server or join one. Everyone gets the same question, and once everyone has answered you compare your answers."
          )
        )}
      </p>

      <label className="mt-7 block">
        <span className="mb-1.5 block font-display text-lg font-semibold">{t("Dein Name", "Your name")}</span>
        <input
          className="input max-w-sm"
          value={name}
          maxLength={20}
          autoComplete="nickname"
          placeholder={t("z. B. Sam", "e.g. Sam")}
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
            {t(`Server ${initialCode} beitreten`, `Join server ${initialCode}`)}
          </button>
          <Link href="/multiplayer" className="btn-ghost">
            {t("Anderen Server wählen", "Choose another server")}
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="card flex flex-col p-5">
            <h2 className="text-2xl font-semibold">{t("Server erstellen", "Create a server")}</h2>
            <p className="mt-1 flex-1 text-muted">{t("Du bist der Admin und entscheidest, welches Spiel gespielt wird.", "You’re the admin and decide which game is played.")}</p>
            <button type="button" className="btn-primary mt-4" onClick={() => go(newCode(), true)}>
              {t("Server erstellen", "Create server")}
            </button>
          </div>
          <div className="card flex flex-col p-5">
            <h2 className="text-2xl font-semibold">{t("Code eingeben", "Enter a code")}</h2>
            <p className="mt-1 text-muted">{t("Den Code bekommst du vom Admin.", "You get the code from the admin.")}</p>
            <div className="mt-4 flex gap-2">
              <input
                className="input min-w-0 flex-1 text-center font-display text-xl uppercase tracking-[0.25em]"
                value={code}
                placeholder="K7QXM"
                inputMode="text"
                autoCapitalize="characters"
                aria-label={t("Server-Code", "Server code")}
                onChange={(e) => {
                  setCode(cleanCode(e.target.value));
                  setErr("");
                }}
                onKeyDown={(e) => e.key === "Enter" && go(code, false)}
              />
              <button type="button" className="btn-primary" onClick={() => go(code, false)}>
                {t("Beitreten", "Join")}
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
  const lang = useLang();
  const t = useT();
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
      <h2 className="text-2xl font-semibold">{t("Offene Server", "Open servers")}</h2>
      {list == null ? (
        <p className="mt-2 text-muted">{t("Suche Server …", "Looking for servers …")}</p>
      ) : list.length === 0 ? (
        <p className="mt-2 text-muted">{t("Gerade ist kein öffentlicher Server offen. Erstelle einfach selbst einen und schick den Code an deine Freunde.", "No public server is open right now. Just create one and send the code to your friends.")}</p>
      ) : (
        <ul className="mt-3 grid gap-2.5">
          {list.map((e) => (
            <li key={e.code} className="card flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-lg font-semibold">{serverName(e.title, lang)}</span>
                <span className="block text-[15px] text-muted">
                  {gameTitle(e.game, lang)} · {e.players} {e.players === 1 ? t("Spieler", "player") : t("Spieler", "players")} · {e.phase === "lobby" ? t("wartet auf den Start", "waiting to start") : t("Spiel läuft", "game in progress")}
                </span>
              </span>
              <button type="button" className="btn-ghost shrink-0" onClick={() => onJoin(e.code)}>
                {t("Beitreten", "Join")}
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
    title: name,
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
  const lang = useLang();
  const t = useT();
  const [st, setSt] = useState<RoomState | null>(null);
  const [members, setMembers] = useState<Record<string, Member>>({});
  const [conn, setConn] = useState<Conn>(host ? "ok" : "verbinde");
  const [mine, setMine] = useState<{ round: number; i: number; msg: AnswerMsg; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dive, setDive] = useState<{ round: number; list: DiveR[] }>({ round: -1, list: [] });
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
  const answer = (part: Pick<AnswerMsg, "choice" | "tg" | "daily">, label: string, d?: Omit<DiveR, "i">) => {
    const s = stRef.current;
    if (!s || s.phase !== "frage" || myAns) return;
    const msg: AnswerMsg = { pid: me, i: s.i, ...part };
    setMine({ round: s.round, i: s.i, msg, label });
    if (d) setDive((x) => ({ round: s.round, list: [...(x.round === s.round ? x.list.filter((r) => r.i !== s.i) : []), { ...d, i: s.i }] }));
    if (host) onAnswer(msg);
    else send("answer", msg);
  };

  // ---------------- render ----------------

  if (conn === "fehlt" || conn === "weg" || conn === "zu" || conn === "fehler") {
    const text =
      conn === "fehlt"
        ? t(`Den Server ${code} gibt es nicht oder der Admin ist gerade nicht online. Prüf den Code und versuch es noch einmal.`, `Server ${code} doesn’t exist or the admin isn’t online right now. Check the code and try again.`)
        : conn === "zu"
          ? t("Der Admin hat den Server geschlossen.", "The admin closed the server.")
          : t("Der Admin hat den Server verlassen. Sobald er zurückkommt, geht es hier weiter.", "The admin left the server. As soon as they’re back, the game continues here.");
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-3xl font-semibold">{conn === "fehlt" ? t("Server nicht gefunden", "Server not found") : conn === "zu" ? t("Server geschlossen", "Server closed") : t("Admin weg", "Admin gone")}</h1>
        <p className="mt-3 text-lg text-muted">{text}</p>
        <button type="button" className="btn-primary mt-6" onClick={onLeave}>
          {t("Zur Server-Auswahl", "Back to servers")}
        </button>
      </div>
    );
  }
  if (!st) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center" aria-busy="true">
        <p className="font-display text-2xl font-semibold">{t(`Verbinde mit Server ${code} …`, `Connecting to server ${code} …`)}</p>
      </div>
    );
  }

  const ids = Object.keys(members);
  const full = !host && !st.names[me] && st.phase !== "lobby" && ids.length > MAX_PLAYERS;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-5 sm:pt-8">
      <RoomBar st={st} members={members} me={me} />
      {full ? (
        <p className="mt-8 text-center text-lg font-semibold">{t(`Der Server ist voll (${MAX_PLAYERS} Spieler).`, `The server is full (${MAX_PLAYERS} players).`)}</p>
      ) : st.phase === "lobby" ? (
        <LobbyView st={st} host={host} members={members} me={me} busy={busy} onSetting={setting} onStart={start} />
      ) : st.phase === "frage" && st.q ? (
        <QuestionView st={st} q={st.q} members={members} me={me} host={host} myAns={myAns} offset={host ? 0 : offset.current} onAnswer={answer} onForce={reveal} dive={dive.round === st.round ? dive.list : []} />
      ) : st.phase === "aufloesung" && st.q && st.reveal ? (
        <RevealView st={st} q={st.q} me={me} host={host} onNext={nextQ} dive={dive.round === st.round ? dive.list : []} />
      ) : st.phase === "ende" ? (
        <EndView st={st} me={me} host={host} onLobby={toLobby} />
      ) : null}

      <div className="mt-10 flex flex-wrap justify-center gap-3 border-t-2 border-line pt-6">
        {host ? (
          <button type="button" className="btn-ghost" onClick={close}>
            {t("Server schließen", "Close server")}
          </button>
        ) : (
          <button type="button" className="btn-ghost" onClick={onLeave}>
            {t("Server verlassen", "Leave server")}
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
  const lang = useLang();
  const t = useT();
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = `${location.origin}${lang === "en" ? "/en" : ""}/multiplayer?code=${st.code}`;
    const text = t(`Spiel mit mir auf Koshertrivia – Server-Code ${st.code}`, `Play with me on Koshertrivia – server code ${st.code}`);
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
        <p className="truncate font-display text-lg font-semibold text-muted">{serverName(st.title, lang)}</p>
        <p className="flex items-center gap-2">
          <span className="text-muted">Code</span>
          <span className="font-display text-3xl font-semibold tracking-[0.18em]">{st.code}</span>
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold text-muted" aria-live="polite">
          {n} {n === 1 ? t("Spieler", "player") : t("Spieler", "players")} online
        </span>
        <button type="button" className="btn-ghost" onClick={share}>
          {copied ? t("Link kopiert", "Link copied") : t("Einladen", "Invite")}
        </button>
      </div>
      <span className="sr-only">{members[me] ? t("Du bist verbunden.", "You’re connected.") : ""}</span>
    </div>
  );
}

function Players({ members, me, done }: { members: Record<string, Member>; me: string; done?: string[] }) {
  const lang = useLang();
  const t = useT();
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
              {id === me && <span className="text-muted"> ({t("du", "you")})</span>}
            </span>
            {m.host && <span className="rounded-full bg-[#f3d272] px-2 text-xs font-bold">Admin</span>}
            {done && (ok ? <span className="font-bold text-ok" aria-label={t("hat geantwortet", "answered")}>✓</span> : <span className="text-muted" aria-label={t("denkt noch", "still thinking")}>…</span>)}
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
  const lang = useLang();
  const t = useT();
  const g = gameOf(st.game);
  return (
    <div className="mt-6">
      <h2 className="mb-2 text-xl font-semibold">{t("Im Server", "On the server")}</h2>
      <Players members={members} me={me} />

      {host ? (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold">{t("Welches Spiel?", "Which game?")}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {MP_GAMES.map((x) => {
              const on = x.id === st.game;
              return (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onSetting(switchTo(st, x.id))}
                  className={`chunk relative px-4 py-3.5 text-left ${x.light ? "text-white" : "text-ink"} ${on ? "outline outline-4 outline-offset-2 outline-ink" : ""}`}
                  style={{ background: x.bg, ["--edge" as string]: x.edge }}
                >
                  <span className="block font-display text-xl font-semibold">{lang === "en" ? x.titleEn : x.title}</span>
                  <span className={`block text-[15px] font-semibold ${x.light ? "text-white/80" : "text-ink/70"}`}>{gameDesc(x, lang)}</span>
                  {on && (
                    <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white text-ink" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <h3 className="mt-6 text-xl font-semibold">{t("Tägliche Spiele", "Daily games")}</h3>
          <p className="text-[15px] text-muted">{t("Jede Runde ist ein zufälliges Rätsel aus dem Archiv. Wenn alle fertig sind, vergleicht ihr eure Ergebnisse.", "Each round is a random puzzle from the archive. Once everyone is done, you compare your results.")}</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {MP_DAILY.map((x) => {
              const on = x.id === st.game;
              return (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onSetting(switchTo(st, x.id))}
                  className={`chunk relative flex items-center gap-2 px-2.5 py-2 text-left font-display font-semibold ${on ? "outline outline-4 outline-offset-2 outline-ink" : ""}`}
                  style={{ background: x.bg, ["--edge" as string]: x.edge }}
                >
                  <GameArt game={x.id} className="h-9 w-12 shrink-0" />
                  <span className="text-[15px] leading-tight">{lang === "en" ? x.titleEn : x.title}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <fieldset>
              <legend className="mb-2 font-display text-lg font-semibold">{isDaily(st.game) ? t("Runden", "Rounds") : t("Fragen", "Questions")}</legend>
              <div className="flex flex-wrap gap-2">
                {countsFor(st.game).map((n) => (
                  <button key={n} type="button" className="chip" aria-pressed={st.n === n} onClick={() => onSetting({ n })}>
                    {n}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 font-display text-lg font-semibold">{isDaily(st.game) ? t("Zeit pro Runde", "Time per round") : t("Zeit pro Frage", "Time per question")}</legend>
              <div className="flex flex-wrap gap-2">
                {timesFor(st.game).map((tm) => (
                  <button key={tm} type="button" className="chip" aria-pressed={st.secs === tm} onClick={() => onSetting({ secs: tm })}>
                    {tm ? (tm >= 60 ? `${tm / 60} Min` : `${tm} s`) : t("Ohne Limit", "No limit")}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-[#2c2a35]" checked={st.pub} onChange={(e) => onSetting({ pub: e.target.checked })} />
            <span>
              <span className="block font-semibold">{t("In „Offene Server“ anzeigen", "Show in “Open servers”")}</span>
              <span className="block text-[15px] text-muted">{t("Aus: Nur wer den Code hat, kann beitreten.", "Off: only people with the code can join.")}</span>
            </span>
          </label>

          <button type="button" className="btn-primary mt-7 w-full text-lg sm:w-auto" disabled={busy} onClick={onStart}>
            {busy ? t("Lade …", "Loading …") : t(`${g.title} starten`, `Start ${g.titleEn}`)}
          </button>
          <p className="mt-2 text-[15px] text-muted">{isDaily(st.game) ? t("Wer später dazukommt, steigt bei der nächsten Runde ein.", "Anyone joining later starts with the next round.") : t("Wer später dazukommt, steigt bei der nächsten Frage ein.", "Anyone joining later starts with the next question.")}</p>
        </div>
      ) : (
        <div className="card mt-8 p-6 text-center">
          <p className="text-muted">{t("Der Admin hat ausgewählt", "The admin picked")}</p>
          <p className="mt-1 font-display text-3xl font-semibold">{lang === "en" ? g.titleEn : g.title}</p>
          <p className="mt-1 font-semibold text-muted">
            {lang === "en"
              ? isDaily(st.game)
                ? `${st.n} ${st.n === 1 ? "round" : "rounds"} · ${st.secs ? `${st.secs / 60} minutes per round` : "no time limit"}`
                : `${st.n} questions · ${st.secs ? `${st.secs} seconds per question` : "no time limit"}`
              : isDaily(st.game)
                ? `${st.n} ${st.n === 1 ? "Runde" : "Runden"} · ${st.secs ? `${st.secs / 60} Minuten pro Runde` : "ohne Zeitlimit"}`
                : `${st.n} Fragen · ${st.secs ? `${st.secs} Sekunden pro Frage` : "ohne Zeitlimit"}`}
          </p>
          <p className="mt-5 font-semibold">{t("Warte, bis der Admin das Spiel startet …", "Waiting for the admin to start the game …")}</p>
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
  const lang = useLang();
  const t = useT();
  const g = gameOf(st.game);
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <p className="font-display text-lg font-semibold">
        {lang === "en" ? g.titleEn : g.title}{" "}
        <span className="text-muted">
          · {isDaily(st.game) ? t("Runde", "Round") : t("Frage", "Question")} {st.i + 1} {t("von", "of")} {st.total}
        </span>
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
  dive,
}: {
  st: RoomState;
  q: QView;
  members: Record<string, Member>;
  me: string;
  host: boolean;
  myAns: { label: string } | null;
  offset: number;
  onAnswer: (part: Pick<AnswerMsg, "choice" | "tg" | "daily">, label: string, d?: Omit<DiveR, "i">) => void;
  onForce: () => void;
  dive: DiveR[];
}) {
  const lang = useLang();
  const t = useT();
  const left = useCountdown(st.endsAt ? st.endsAt + offset : 0);
  const present = Object.keys(members);
  const doneN = present.filter((id) => st.done.includes(id)).length;
  const g = gameOf(st.game);

  if (q.kind === "tiefgang")
    return <TgQuestion st={st} q={q} members={members} me={me} host={host} myAns={myAns} left={left} onAnswer={onAnswer} onForce={onForce} dive={dive} />;
  if (q.kind === "daily")
    return <DailyRound st={st} q={q} members={members} me={me} host={host} myAns={myAns} left={left} onAnswer={onAnswer} onForce={onForce} />;

  return (
    <div>
      <QHead st={st}>
        {left != null && (
          <span className={`grid h-12 w-12 place-items-center rounded-full border-[3px] border-ink font-display text-xl font-semibold tabular-nums ${left <= 5 ? "bg-bad text-white" : "bg-white"}`} aria-label={t(`${left} Sekunden übrig`, `${left} seconds left`)}>
            {left}
          </span>
        )}
      </QHead>

      <div className={`chunk mt-3 px-5 py-6 sm:px-8 sm:py-8 ${g.light ? "text-white" : "text-ink"}`} style={{ background: g.bg, ["--edge" as string]: g.edge }}>
        {q.kind === "choice" && q.cat && <span className={`rounded-full px-3 py-1 text-sm font-bold ${g.light ? "bg-white/15" : "bg-white/60"}`}>{lang === "en" ? q.catEn ?? q.cat : q.cat}</span>}
        {q.kind === "choice" && q.img && (
          <div className="mx-auto mb-4 mt-1 flex w-full max-w-sm items-center justify-center rounded-2xl bg-surface p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={q.img} alt={t("Flagge", "Flag")} className="max-h-44 w-auto rounded-md border-2 border-ink/15" />
          </div>
        )}
        <h2 className={`font-display font-semibold leading-tight ${q.kind === "choice" && q.img ? "text-center text-2xl" : "mt-3 text-[28px] sm:text-4xl"}`}>
          {questionText(st, q, lang)}
        </h2>
      </div>

      <div className="mt-5">
        {myAns ? (
          <div className="card p-5 text-center" role="status">
            <p className="text-muted">{t("Deine Antwort", "Your answer")}</p>
            <p className="font-display text-2xl font-semibold">{myAns.label}</p>
            <p className="mt-3 font-semibold">{t("Warte auf die anderen …", "Waiting for the others …")}</p>
          </div>
        ) : q.kind === "choice" ? (
          <div className={`grid gap-3 ${q.options.length === 4 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
            {q.options.map((o, k) => (
              <button key={o.id} type="button" className="btn-ghost min-h-[60px] justify-start gap-3 px-4 text-left text-lg" onClick={() => onAnswer({ choice: o.id }, optLabel(o, lang))}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface font-display text-base" aria-hidden="true">
                  {"ABCD"[k]}
                </span>
                {optLabel(o, lang)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-7">
        <p className="mb-2 font-semibold" aria-live="polite">
          {t(`${doneN} von ${present.length} haben geantwortet`, `${doneN} of ${present.length} have answered`)}
        </p>
        <Players members={members} me={me} done={st.done} />
        {host && doneN < present.length && (
          <button type="button" className="btn-ghost mt-4" onClick={onForce}>
            {t("Nicht mehr warten – Antworten zeigen", "Stop waiting – show answers")}
          </button>
        )}
      </div>
    </div>
  );
}

function TiefgangInput({ qkey, timeUp, onDone, dark = false }: { qkey: string; timeUp: boolean; onDone: (a: Answer | null) => void; dark?: boolean }) {
  const lang = useLang();
  const t = useT();
  const q = useMemo<Question | undefined>(() => tiefgangQ(qkey), [qkey]);
  const [v, setV] = useState("");
  const [sug, setSug] = useState<{ name: string; for: string } | null>(null);
  const [err, setErr] = useState("");
  const [shake, setShake] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  if (!q) return <p className="font-semibold text-bad">{t("Diese Frage konnte nicht geladen werden.", "This question could not be loaded.")}</p>;

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
          placeholder={timeUp ? t("Die Zeit ist um", "Time’s up") : t("Deine Antwort", "Your answer")}
          aria-label={t("Deine Antwort", "Your answer")}
          onChange={(e) => {
            setV(e.target.value);
            setErr("");
          }}
        />
        <button type="submit" className={`btn-primary ${dark ? "bg-[#f3d272] text-ink shadow-[0_4px_0_#b8962f] hover:bg-[#f7dc8a]" : ""}`} disabled={timeUp || !v.trim()}>
          {dark ? t("Tauchen", "Dive") : t("Antworten", "Answer")}
        </button>
      </form>
      {sug && <Suggestion dark={dark} name={sug.name} onTake={() => { setV(sug.name); setSug(null); }} hint={t("oder nochmal Enter, wenn du deine Schreibweise meinst", "or press Enter again to keep your spelling")} />}
      {err && <p className={`mt-2 font-semibold ${dark ? "text-[#ffb4ae]" : "text-bad"}`}>{err} {t("Versuch es nochmal.", "Try again.")}</p>}
      <button type="button" className={`mt-3 text-[15px] font-semibold underline underline-offset-2 ${dark ? "text-white/70 hover:text-white" : "text-muted hover:text-ink"}`} onClick={() => onDone(null)}>
        {t("Passen – mir fällt nichts ein", "Pass – I’ve got nothing")}
      </button>
    </div>
  );
}

// ---------------- reveal ----------------

function RevealView({ st, q, me, host, onNext, dive }: { st: RoomState; q: QView; me: string; host: boolean; onNext: () => void; dive: DiveR[] }) {
  const lang = useLang();
  const t = useT();
  const rv = st.reveal!;
  const ids = Object.keys(rv.answers);
  const nameOf = (id: string) => st.names[id] ?? "?";
  const last = st.i + 1 >= st.total;
  const mineA = rv.answers[me];

  if (q.kind === "daily") return <DailyReveal st={st} q={q} me={me} host={host} onNext={onNext} />;

  return (
    <div>
      <QHead st={st} />
      <div className="card mt-3 px-5 py-5 sm:px-7">
        <h2 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">
          {questionText(st, q, lang)}
        </h2>
        {q.kind === "choice" && q.img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={q.img} alt={t("Flagge", "Flag")} className="mt-3 h-20 w-auto rounded-md border-2 border-ink/15" />
        )}
        {ids.includes(me) && (
          <p className={`mt-3 inline-block rounded-full px-3 py-1 font-bold text-white ${mineA?.ok ? "bg-ok" : "bg-bad"}`}>
            {q.kind === "tiefgang"
              ? mineA
                ? t(`+${mineA.pts} Punkte`, `+${mineA.pts} points`)
                : t("Keine Antwort", "No answer")
              : mineA?.ok
                ? t("Richtig!", "Correct!")
                : mineA
                  ? t("Leider falsch", "Wrong")
                  : t("Keine Antwort", "No answer")}
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
                    {optLabel(o, lang)}
                    {right && <span className="sr-only"> ({t("richtig", "correct")})</span>}
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
              {t("Ohne Antwort", "No answer")}: {ids.filter((id) => !rv.answers[id]).map(nameOf).join(", ")}
            </li>
          )}
        </ul>
      ) : (
        <div className="mt-4">
          <TgStage total={myDepth(st, me, dive)} list={dive} className="mb-4 h-[260px] sm:h-[300px]" />
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
                      <span className="block truncate font-display text-lg font-semibold">{a ? ansName(a.label, lang) : t("Keine Antwort", "No answer")}</span>
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
              {t("Besonders selten wären gewesen", "Really rare ones would have been")}: {rv.rare.map((r) => `${ansName(r.name, lang)} (${r.pts})`).join(", ")}
            </p>
          )}
        </div>
      )}

      {rv.explain && (
        <div className="mt-4 rounded-2xl bg-surface px-5 py-4">
          <p className="text-[17px] leading-relaxed">{lang === "en" ? rv.explainEn ?? rv.explain : rv.explain}</p>
          {rv.src && (
            <p className="mt-2 text-[15px] font-semibold text-muted">
              {t("Quelle", "Source")}: {lang === "en" ? rv.srcEn ?? rv.src : rv.src}
            </p>
          )}
        </div>
      )}

      <Scores st={st} me={me} compact />

      <div className="mt-6">
        {host ? (
          <button type="button" className="btn-primary w-full text-lg sm:w-auto" onClick={onNext}>
            {last ? t("Zum Endstand", "Final standings") : t("Nächste Frage", "Next question")}
          </button>
        ) : (
          <p className="font-semibold text-muted">{last ? t("Der Admin zeigt gleich den Endstand …", "The admin will show the final standings soon …") : t("Der Admin startet gleich die nächste Frage …", "The admin will start the next question soon …")}</p>
        )}
      </div>
    </div>
  );
}

function Scores({ st, me, compact = false }: { st: RoomState; me: string; compact?: boolean }) {
  const lang = useLang();
  const t = useT();
  const rows = Object.entries(st.scores)
    .map(([id, p]) => ({ id, p, name: st.names[id] ?? "?" }))
    .sort((a, b) => b.p - a.p || a.name.localeCompare(b.name));
  const unit = st.game === "tiefgang" || isDaily(st.game) ? t("Punkte", "points") : t("richtig", "right");
  let rank = 0;
  let prev = -1;
  return (
    <div className={compact ? "mt-6" : "mt-5"}>
      {compact && <h3 className="mb-2 text-lg font-semibold">{t("Zwischenstand", "Standings")}</h3>}
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
                {r.id === me && <span className="text-muted"> ({t("du", "you")})</span>}
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
  const lang = useLang();
  const t = useT();
  const best = Math.max(0, ...Object.values(st.scores));
  const winners = Object.entries(st.scores)
    .filter(([, p]) => p === best)
    .map(([id]) => st.names[id] ?? "?");
  return (
    <div className="mt-6">
      <div className="chunk px-5 py-7 text-center" style={{ background: "#f3d272", ["--edge" as string]: "#c9a43c" }}>
        <p className="font-display text-lg font-semibold text-ink/70">{gameTitle(st.game, lang)} · {t("Endstand", "Final standings")}</p>
        <p className="mt-1 font-display text-3xl font-semibold sm:text-4xl">
          {winners.length === 1 ? t(`${winners[0]} gewinnt!`, `${winners[0]} wins!`) : t(`Unentschieden: ${winners.join(" & ")}`, `Tie: ${winners.join(" & ")}`)}
        </p>
      </div>
      <Scores st={st} me={me} />
      <div className="mt-6">
        {host ? (
          <button type="button" className="btn-primary w-full text-lg sm:w-auto" onClick={onLobby}>
            {t("Neues Spiel wählen", "Pick a new game")}
          </button>
        ) : (
          <p className="font-semibold text-muted">{t("Der Admin wählt gleich das nächste Spiel …", "The admin is about to pick the next game …")}</p>
        )}
      </div>
    </div>
  );
}

// ---------------- daily games ----------------

function questionText(st: RoomState, q: QView, lang: Lang = "de") {
  if (q.kind === "daily") return "";
  if (q.kind === "tiefgang") {
    const tq = tiefgangQ(q.key);
    return tq ? qText(tq, lang) : q.text;
  }
  const text = lang === "en" ? q.textEn ?? q.text : q.text;
  return st.game === "koscher" || st.game === "halal" ? `${text}?` : text;
}
const optLabel = (o: { label: string; labelEn?: string }, lang: Lang) => (lang === "en" ? o.labelEn ?? o.label : o.label);
/** Rooms are named after the admin; older rooms still carry "Server von …". */
const serverName = (title: string, lang: Lang) => {
  const name = title.replace(/^Server von /, "");
  return lang === "en" ? `${name}’s server` : `Server von ${name}`;
};

/** Switching games keeps the settings that still fit, otherwise sensible defaults. */
function switchTo(st: RoomState, game: GameId): Partial<RoomState> {
  const counts = countsFor(game);
  const times = timesFor(game);
  const n = counts.includes(st.n) ? st.n : isDaily(game) ? 3 : 10;
  let secs = times.includes(st.secs) ? st.secs : 0;
  if (game === "tiefgang" && !secs) secs = TIEFGANG_DEFAULT_SECS;
  return { game, n, secs };
}

const clock = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}`);

function DailyRound({
  st,
  q,
  members,
  me,
  host,
  myAns,
  left,
  onAnswer,
  onForce,
}: {
  st: RoomState;
  q: Extract<QView, { kind: "daily" }>;
  members: Record<string, Member>;
  me: string;
  host: boolean;
  myAns: { label: string } | null;
  left: number | null;
  onAnswer: (part: Pick<AnswerMsg, "choice" | "tg" | "daily">, label: string) => void;
  onForce: () => void;
}) {
  const lang = useLang();
  const t = useT();
  const send = useRef(onAnswer);
  send.current = onAnswer;
  const storeKey = `${st.code}:${st.round}:${st.i}`;
  const report = useCallback((r: DailyResult) => {
    send.current({ daily: { done: r.done, won: r.won, score: r.score, max: r.max, label: r.label, share: r.share } }, r.label);
  }, []);
  const ctx = useMemo<MpDaily>(() => ({ day: q.day, storeKey, onResult: report }), [q.day, storeKey, report]);
  // finished before a refresh: report again (the admin ignores doubles)
  useEffect(() => {
    const r = mpLoad(`${q.game}:${storeKey}`);
    if (r?.done && !st.done.includes(me)) report(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeKey]);

  const present = Object.keys(members);
  const doneN = present.filter((id) => st.done.includes(id)).length;
  const timeUp = left === 0 && !myAns;

  return (
    <div>
      <QHead st={st}>
        {left != null && (
          <span
            className={`grid h-12 min-w-12 place-items-center rounded-full border-[3px] border-ink px-2 font-display text-lg font-semibold tabular-nums ${left <= 10 ? "bg-bad text-white" : "bg-white"}`}
            aria-label={t(`${left} Sekunden übrig`, `${left} seconds left`)}
          >
            {clock(left)}
          </span>
        )}
      </QHead>

      <div className="sticky top-[68px] z-30 mt-3 sm:top-[76px]">
        <div className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-2.5 shadow-[0_3px_0_var(--color-edge)] ${myAns ? "bg-[#e5f4e3]" : "bg-white"}`} role="status" aria-live="polite">
          <span className="font-semibold">
            {myAns ? (
              <>
                {t("Fertig", "Done")}: <strong>{myAns.label}</strong> – {t("warte auf die anderen", "waiting for the others")}
              </>
            ) : timeUp ? (
              t("Die Zeit ist um.", "Time’s up.")
            ) : (
              t("Spiel das Rätsel – wenn alle fertig sind, vergleicht ihr.", "Play the puzzle – once everyone is done, you compare.")
            )}
          </span>
          <span className="font-semibold text-muted">
            {t(`${doneN} von ${present.length} fertig`, `${doneN} of ${present.length} done`)}
          </span>
        </div>
      </div>

      <div className={`mt-4 ${timeUp ? "pointer-events-none opacity-50" : ""}`}>
        <MpDailyContext.Provider value={ctx}>
          <div key={storeKey}>
            <DailyGame game={q.game} />
          </div>
        </MpDailyContext.Provider>
      </div>

      <div className="mt-7">
        <Players members={members} me={me} done={st.done} />
        {host && doneN < present.length && (
          <button type="button" className="btn-ghost mt-4" onClick={onForce}>
            {t("Nicht mehr warten – Ergebnisse zeigen", "Stop waiting – show results")}
          </button>
        )}
      </div>
    </div>
  );
}

function DailyReveal({ st, q, me, host, onNext }: { st: RoomState; q: Extract<QView, { kind: "daily" }>; me: string; host: boolean; onNext: () => void }) {
  const lang = useLang();
  const t = useT();
  const rv = st.reveal!;
  const ids = Object.keys(rv.answers).sort((a, b) => (rv.answers[b]?.pts ?? -1) - (rv.answers[a]?.pts ?? -1));
  const nameOf = (id: string) => st.names[id] ?? "?";
  const last = st.i + 1 >= st.total;
  const g = gameOf(st.game);
  const mineA = rv.answers[me];

  return (
    <div>
      <QHead st={st} />
      <div className="chunk mt-3 flex items-center gap-3 px-4 py-3" style={{ background: g.bg, ["--edge" as string]: g.edge }}>
        <GameArt game={q.game} className="h-11 w-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-semibold leading-tight">
            {lang === "en" ? g.titleEn : g.title} <span className="text-ink/55">#{dayNumber(q.day)}</span>
          </p>
          <p className="text-sm font-semibold text-ink/70">{t("Rätsel vom", "Puzzle from")} {formatDay(q.day, lang)}</p>
        </div>
        {rv.answers[me] !== undefined && (
          <span className={`shrink-0 rounded-full px-3 py-1 font-bold text-white ${mineA ? "bg-ok" : "bg-bad"}`}>{mineA ? t(`+${mineA.pts} Punkte`, `+${mineA.pts} points`) : t("Nicht fertig", "Not finished")}</span>
        )}
      </div>

      <ul className="mt-4 grid gap-2.5">
        {ids.map((id, k) => {
          const a = rv.answers[id];
          return (
            <li key={id} className={`card px-4 py-3 ${id === me ? "ring-[3px] ring-brand-2" : ""}`}>
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-display text-lg font-semibold">{a ? k + 1 : "–"}</span>
                <Avatar id={id} name={nameOf(id)} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {nameOf(id)}
                    {id === me && <span className="text-muted"> ({t("du", "you")})</span>}
                  </span>
                  <span className="block text-[15px] text-muted">{a ? a.label : t("Nicht fertig geworden", "Didn’t finish")}</span>
                </span>
                <span className="font-display text-2xl font-semibold tabular-nums">{a?.pts ?? 0}</span>
              </div>
              {a?.share && <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-paper px-3 py-2 font-sans text-sm font-semibold">{a.share.split("\n").slice(1).join("\n") || a.share}</pre>}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[15px] text-muted">{t("Punkte wie in der Bestenliste: 0 bis 100 pro Rätsel.", "Points as on the leaderboard: 0 to 100 per puzzle.")}</p>

      <Scores st={st} me={me} compact />

      <div className="mt-6">
        {host ? (
          <button type="button" className="btn-primary w-full text-lg sm:w-auto" onClick={onNext}>
            {last ? t("Zum Endstand", "Final standings") : t("Nächste Runde", "Next round")}
          </button>
        ) : (
          <p className="font-semibold text-muted">{last ? t("Der Admin zeigt gleich den Endstand …", "The admin will show the final standings soon …") : t("Der Admin startet gleich die nächste Runde …", "The admin will start the next round soon …")}</p>
        )}
      </div>
    </div>
  );
}

// ---------------- Tiefgang: the dive ----------------

type DiveR = { i: number; input: string; pts: number; answer?: string; id?: string; perle?: boolean };

/** My depth in metres: my own answers this game, or the admin's score after a reload. */
function myDepth(st: RoomState, me: string, dive: DiveR[]) {
  const local = dive.reduce((a, r) => a + r.pts, 0);
  return meters(Math.max(local, st.scores[me] ?? 0));
}

/** The ocean from the Tiefgang game: the camera glides down as your answers sink. */
function TgStage({ total, list, className = "", children }: { total: number; list: DiveR[]; className?: string; children?: React.ReactNode }) {
  const lang = useLang();
  const t = useT();
  const [cam, setCam] = useState(total);
  const camRef = useRef(total);
  const [sinking, setSinking] = useState<DiveR | null>(null);
  const [base, setBase] = useState(total);
  const [impact, setImpact] = useState<Impact | null>(null);
  const seen = useRef(list.length);

  // a new answer worth 0 points: just a splash
  useEffect(() => {
    if (list.length <= seen.current) return;
    seen.current = list.length;
    const last = list[list.length - 1];
    if (last && last.pts <= 0) setImpact({ at: Date.now(), kind: "miss" });
  }, [list]);

  useEffect(() => {
    const from = camRef.current;
    const to = total;
    if (from === to) return;
    const last = list[list.length - 1];
    const sink = to > from && !!last && last.pts > 0 && Math.abs(from + meters(last.pts) - to) < 1;
    if (sink) {
      setBase(from);
      setSinking(last);
    }
    const dur = sink ? Math.min(4800, 1400 + Math.abs(to - from) * 3.2) : 700;
    const ease = (x: number) => (sink ? 1 - Math.pow(1 - x, 2.4) : 1 - Math.pow(1 - x, 3));
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const v = from + (to - from) * ease(k);
      camRef.current = v;
      setCam(v);
      if (k < 1) raf = requestAnimationFrame(step);
      else if (sink) {
        setSinking(null);
        setImpact({ at: Date.now(), kind: tierOf(last).key as Impact["kind"] });
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  return (
    <div className={`relative overflow-hidden rounded-[28px] text-white shadow-[0_5px_0_#061a3d] ${className}`}>
      <OceanScene cam={cam} results={list} questions={[]} sinking={sinking} base={sinking ? base : total} impact={impact} />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between bg-gradient-to-b from-[#051a3a]/70 to-transparent px-4 pb-5 pt-3">
        <div>
          <p className="text-xs font-bold text-white/70">{t("Deine Tiefe", "Your depth")}</p>
          <p className="font-display text-2xl font-semibold tabular-nums">{nfDe.format(Math.round(cam))} m</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-white/70">{t("Punkte", "Points")}</p>
          <p className="font-display text-2xl font-semibold tabular-nums">{Math.round(cam / 10)}</p>
        </div>
      </div>
      {children && <div className="absolute inset-x-0 bottom-0 z-20 max-h-[78%] overflow-y-auto p-3 sm:p-4">{children}</div>}
    </div>
  );
}
const nfDe = new Intl.NumberFormat("de-DE");

function TgQuestion({
  st,
  q,
  members,
  me,
  host,
  myAns,
  left,
  onAnswer,
  onForce,
  dive,
}: {
  st: RoomState;
  q: Extract<QView, { kind: "tiefgang" }>;
  members: Record<string, Member>;
  me: string;
  host: boolean;
  myAns: { label: string } | null;
  left: number | null;
  onAnswer: (part: Pick<AnswerMsg, "choice" | "tg" | "daily">, label: string, d?: Omit<DiveR, "i">) => void;
  onForce: () => void;
  dive: DiveR[];
}) {
  const lang = useLang();
  const t = useT();
  const present = Object.keys(members);
  const doneN = present.filter((id) => st.done.includes(id)).length;
  const mineNow = dive.find((r) => r.i === st.i);

  return (
    <div>
      <QHead st={st}>
        {left != null && (
          <span className={`grid h-12 w-12 place-items-center rounded-full border-[3px] border-ink font-display text-xl font-semibold tabular-nums ${left <= 5 ? "bg-bad text-white" : "bg-white"}`} aria-label={t(`${left} Sekunden übrig`, `${left} seconds left`)}>
            {left}
          </span>
        )}
      </QHead>
      <TgStage total={myDepth(st, me, dive)} list={dive} className="mt-3 h-[min(72dvh,640px)] min-h-[500px]">
        {myAns ? (
          <div className="pop rounded-[24px] bg-white/95 p-5 text-ink shadow-[0_6px_0_rgb(0_0_0_/_0.3)]" role="status">
            <p className="font-display font-semibold text-ink/60">{questionText(st, q, lang)}</p>
            {mineNow && mineNow.pts > 0 ? (
              <div className="mt-2 flex items-center gap-4">
                <Creature tier={tierOf(mineNow).key} className={`shrink-0 ${mineNow.perle ? "h-20 w-20" : "h-16 w-16"}`} />
                <div>
                  <p className="inline-block rounded-full px-3 py-0.5 font-display font-semibold" style={{ background: tierOf(mineNow).color }}>
                    {tierOf(mineNow).name}
                  </p>
                  <p className="font-display text-3xl font-semibold text-[#0f4c8a]">+{nfDe.format(meters(mineNow.pts))} m</p>
                  <p className="font-semibold">
                    {ansName(mineNow.answer ?? "", lang)} – {t(`${mineNow.pts} von ${MAX_PTS} Punkten`, `${mineNow.pts} of ${MAX_PTS} points`)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-4">
                <Creature tier="none" className="h-14 w-14 shrink-0" />
                <p className="font-display text-3xl font-semibold text-bad">0 m</p>
              </div>
            )}
            <p className="mt-3 font-semibold text-muted">
              {t(`Warte auf die anderen … ${doneN} von ${present.length} fertig`, `Waiting for the others … ${doneN} of ${present.length} done`)}
            </p>
          </div>
        ) : (
          <div className="pop" key={"q" + st.i}>
            <div className="rounded-[24px] bg-[#082650]/85 p-5 shadow-[0_6px_0_rgb(0_0_0_/_0.3)] backdrop-blur-sm">
              <h2 className="text-[24px] font-semibold leading-snug sm:text-3xl">{questionText(st, q, lang)}</h2>
              <p className="mt-1 text-sm font-semibold text-white/65">
                {(() => {
                  const tq = tiefgangQ(q.key);
                  return tq ? qHint(tq, lang) : q.hint;
                })()}{" "}
                {t("Seltenere Antworten sinken tiefer.", "Rarer answers sink deeper.")}
              </p>
            </div>
            <div className="mt-3 rounded-[24px] bg-[#082650]/85 p-3 backdrop-blur-sm">
              <TiefgangInput
                qkey={q.key}
                timeUp={left === 0}
                dark
                onDone={(a) =>
                  a
                    ? onAnswer({ tg: { id: a.id } }, a.name, { input: a.name, pts: a.pts, answer: a.name, id: a.id, perle: a.perle })
                    : onAnswer({ tg: null }, t("Keine Antwort", "No answer"), { input: "", pts: 0 })
                }
              />
            </div>
          </div>
        )}
      </TgStage>

      <div className="mt-6">
        <p className="mb-2 font-semibold" aria-live="polite">
          {t(`${doneN} von ${present.length} haben geantwortet`, `${doneN} of ${present.length} have answered`)}
        </p>
        <Players members={members} me={me} done={st.done} />
        {host && doneN < present.length && (
          <button type="button" className="btn-ghost mt-4" onClick={onForce}>
            {t("Nicht mehr warten – Antworten zeigen", "Stop waiting – show answers")}
          </button>
        )}
      </div>
    </div>
  );
}
