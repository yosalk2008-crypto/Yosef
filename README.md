# Firmengrafik

Website von Firmengrafik – Websites im Abo, KI-Chatbots, KI-Telefonassistenten und Terminbuchung. Next.js 15 + Tailwind CSS, gehostet auf Vercel.

- `/` – Startseite mit Leistungen, KI-Bereich, Vorteilen, Ablauf und FAQ
- `/kontakt` – Online-Anfrageformular
- `/impressum`, `/datenschutz`

## Anfrageformular (Resend + Supabase)

Das Formular sendet an `/api/anfrage`. Benötigte Umgebungsvariablen in Vercel: siehe `.env.example`.

- **Resend**: `RESEND_API_KEY` setzen → Anfragen kommen per E-Mail an `firmengrafik@gmail.com` (Antworten gehen direkt an den Kunden).
- **Supabase**: SQL aus `supabase/migrations/` ausführen, dann `SUPABASE_URL` und `SUPABASE_KEY` (Publishable Key) setzen.

Ist mindestens einer der beiden Dienste eingerichtet, funktioniert das Formular.

## Entwicklung

```bash
npm install
npm run dev
```
