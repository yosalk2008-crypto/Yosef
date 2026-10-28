"use client";

import { useState } from "react";

export function KontaktForm() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="mt-6 max-w-xl rounded-2xl bg-fs-soft p-6">
        <p className="font-semibold">Danke für deine Nachricht!</p>
        <p className="mt-1 text-sm text-muted">
          Dies ist eine Musterwebsite – auf einer echten Kundenseite würde die Nachricht jetzt
          direkt im Postfach der Fahrschule landen.
        </p>
      </div>
    );
  }

  return (
    <form
      className="mt-6 max-w-xl space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Name
          <input required placeholder="Lea Krüger" className="mt-1.5 w-full rounded-lg bg-surface px-3.5 py-3 outline-none ring-fs focus:ring-2" />
        </label>
        <label className="block text-sm font-medium">
          E-Mail
          <input required type="email" placeholder="lea.krueger@example.de" className="mt-1.5 w-full rounded-lg bg-surface px-3.5 py-3 outline-none ring-fs focus:ring-2" />
        </label>
      </div>
      <label className="block text-sm font-medium">
        Interesse an
        <select className="mt-1.5 w-full rounded-lg bg-surface px-3.5 py-3 outline-none ring-fs focus:ring-2">
          <option>Klasse B (Auto)</option>
          <option>Klasse B197 (Automatik)</option>
          <option>Klasse A (Motorrad)</option>
          <option>Klasse BE (Anhänger)</option>
        </select>
      </label>
      <label className="block text-sm font-medium">
        Nachricht
        <textarea
          rows={4}
          placeholder="Hallo, ich hätte gern einen Termin für ein Erstgespräch."
          className="mt-1.5 w-full resize-y rounded-lg bg-surface px-3.5 py-3 outline-none ring-fs focus:ring-2"
        />
      </label>
      <button type="submit" className="rounded-full bg-fs px-6 py-3 font-semibold text-white transition hover:brightness-110">
        Absenden
      </button>
    </form>
  );
}
