import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Anfrage = {
  name: string;
  firma: string;
  email: string;
  telefon: string;
  paket: string;
  website: string;
  nachricht: string;
};

const LIMITS: Record<keyof Anfrage, number> = {
  name: 120,
  firma: 160,
  email: 200,
  telefon: 60,
  paket: 60,
  website: 200,
  nachricht: 4000,
};

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  // Honeypot ausgefüllt → Bot. Still „erfolgreich“ antworten.
  if (clean(body.firmenfax, 100)) return NextResponse.json({ ok: true });

  const data = Object.fromEntries(
    (Object.keys(LIMITS) as (keyof Anfrage)[]).map((k) => [k, clean(body[k], LIMITS[k])]),
  ) as Anfrage;

  if (!data.name || !data.email || !data.nachricht) {
    return NextResponse.json({ error: "Bitte füllen Sie alle Pflichtfelder aus." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return NextResponse.json({ error: "Bitte geben Sie eine gültige E-Mail-Adresse an." }, { status: 400 });
  }
  if (!body.datenschutz) {
    return NextResponse.json({ error: "Bitte stimmen Sie der Datenschutzerklärung zu." }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  // Publishable Key reicht: RLS erlaubt der Website nur das Anlegen von Anfragen.
  const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!resendKey && !(supabaseUrl && supabaseKey)) {
    console.error("Anfrage erhalten, aber weder Resend noch Supabase sind konfiguriert.");
    return NextResponse.json(
      { error: "Das Formular ist gerade nicht erreichbar." },
      { status: 503 },
    );
  }

  const results = await Promise.allSettled([
    resendKey ? sendMail(resendKey, data) : Promise.resolve("skipped"),
    supabaseUrl && supabaseKey ? saveToSupabase(supabaseUrl, supabaseKey, data) : Promise.resolve("skipped"),
  ]);

  const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
  failed.forEach((f) => console.error("Anfrage-Fehler:", f.reason));

  // Erfolg, sobald mindestens ein konfigurierter Kanal funktioniert hat.
  const succeeded = results.some((r) => r.status === "fulfilled" && r.value !== "skipped");
  if (!succeeded) {
    return NextResponse.json({ error: "Die Anfrage konnte nicht gesendet werden." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

async function sendMail(apiKey: string, a: Anfrage) {
  const to = process.env.ANFRAGE_EMAIL || "firmengrafik@gmail.com";
  const from = process.env.RESEND_FROM || "Firmengrafik <onboarding@resend.dev>";
  const rows: [string, string][] = [
    ["Name", a.name],
    ["Firma", a.firma],
    ["E-Mail", a.email],
    ["Telefon", a.telefon],
    ["Paket", a.paket],
    ["Website", a.website],
  ];
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px">
      <h2 style="margin:0 0 16px">Neue Anfrage über firmengrafik</h2>
      <table style="border-collapse:collapse;width:100%">
        ${rows
          .filter(([, v]) => v)
          .map(
            ([k, v]) =>
              `<tr><td style="padding:6px 12px 6px 0;color:#5b6474;width:110px">${k}</td><td style="padding:6px 0"><strong>${escapeHtml(v)}</strong></td></tr>`,
          )
          .join("")}
      </table>
      <h3 style="margin:24px 0 8px">Nachricht</h3>
      <p style="white-space:pre-wrap;line-height:1.5">${escapeHtml(a.nachricht)}</p>
    </div>`;
  const text = `${rows
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")}\n\nNachricht:\n${a.nachricht}`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: a.email,
      subject: `Neue Anfrage: ${a.name}${a.firma ? ` (${a.firma})` : ""}`,
      html,
      text,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return "sent";
}

async function saveToSupabase(url: string, key: string, a: Anfrage) {
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/anfragen`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(a),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return "saved";
}
