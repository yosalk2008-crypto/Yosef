"use client";

import Link from "next/link";
import { useState } from "react";
import { pakete, site } from "@/lib/site";

type Status = "idle" | "sending" | "success" | "error";

export function AnfrageForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/anfrage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Die Anfrage konnte nicht gesendet werden.");
      form.reset();
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Die Anfrage konnte nicht gesendet werden.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-3xl border border-line bg-white p-10 text-center shadow-xl shadow-ink/5">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mt-5 text-2xl font-bold">Vielen Dank für Ihre Anfrage!</h3>
        <p className="mt-2 text-muted">
          Wir haben Ihre Nachricht erhalten und melden uns in der Regel innerhalb von 24 Stunden bei
          Ihnen.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-6 text-sm font-semibold text-brand hover:underline"
        >
          Weitere Anfrage senden
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative rounded-3xl border border-line bg-white p-6 shadow-xl shadow-ink/5 sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name *" htmlFor="name">
          <input id="name" name="name" required maxLength={120} autoComplete="name" className="input" />
        </Field>
        <Field label="Firma" htmlFor="firma">
          <input id="firma" name="firma" maxLength={160} autoComplete="organization" className="input" />
        </Field>
        <Field label="E-Mail *" htmlFor="email">
          <input id="email" name="email" type="email" required maxLength={200} autoComplete="email" className="input" />
        </Field>
        <Field label="Telefon" htmlFor="telefon">
          <input id="telefon" name="telefon" type="tel" maxLength={60} autoComplete="tel" className="input" />
        </Field>
        <Field label="Gewünschtes Paket" htmlFor="paket">
          <select id="paket" name="paket" className="input" defaultValue="beratung">
            <option value="beratung">Noch unsicher – bitte beraten</option>
            {pakete.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name} – {p.preis} € / Monat
              </option>
            ))}
          </select>
        </Field>
        <Field label="Aktuelle Website (falls vorhanden)" htmlFor="website">
          <input id="website" name="website" maxLength={200} placeholder="www.ihre-firma.de" className="input" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Ihre Nachricht *" htmlFor="nachricht">
            <textarea
              id="nachricht"
              name="nachricht"
              required
              rows={5}
              maxLength={4000}
              placeholder="Erzählen Sie uns kurz von Ihrem Unternehmen und was Ihre neue Website können soll."
              className="input resize-y"
            />
          </Field>
        </div>
      </div>

      {/* Honeypot gegen Spam-Bots */}
      <div className="absolute -left-[9999px]" aria-hidden>
        <label>
          Bitte leer lassen
          <input name="firmenfax" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="mt-6 flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="datenschutz" required className="mt-1 h-4 w-4 accent-brand" />
        <span>
          Ich bin damit einverstanden, dass meine Angaben zur Bearbeitung meiner Anfrage gespeichert
          werden. Details in der{" "}
          <Link href="/datenschutz" className="font-medium text-brand hover:underline">
            Datenschutzerklärung
          </Link>
          . *
        </span>
      </label>

      {status === "error" && (
        <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error} Sie erreichen uns auch direkt unter{" "}
          <a href={`mailto:${site.email}`} className="font-semibold underline">
            {site.email}
          </a>
          .
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand-2 px-7 py-3.5 font-semibold text-white shadow-lg shadow-brand/30 transition hover:opacity-95 disabled:opacity-60 sm:w-auto"
      >
        {status === "sending" ? "Wird gesendet …" : "Unverbindlich anfragen"}
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
