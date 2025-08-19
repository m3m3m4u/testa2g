# Next.js — KI-gestützte Antwortbewertung

Dieses Projekt ist eine kleine Next.js-App, die Lernantworten bewertet und die Bewertungen lokal speichert.

Features
- Einfache UI: `/evaluate` zeigt eine Frage, erlaubt das Eingeben einer Antwort und liefert ein KI-gestütztes Feedback.
- Server-seitige Bewertung via OpenAI + lokale Heuristik (bei erfolgreichem Match wird `solutionCode: 145` zurückgegeben).
- History-Persistenz in `data/evaluations.json` (GET/POST `/api/history`).
- Optionale API-Key-Absicherung für POST-Endpunkte.

## Setup

1. `.env` anlegen

Kopiere `.env.example` zu `.env` und fülle mindestens:

- `OPENAI_API_KEY` — erforderlich
- optional: `API_KEY` (serverseitig) zum Schutz der POST-Endpunkte
- optional: `NEXT_PUBLIC_API_KEY` wenn du in einer geschlossenen Umgebung möchtest, dass der Browser automatisch den Key mitschickt (sichtbar im Client-Bundle!)

2. Abhängigkeiten installieren

```bash
npm install
```

3. Dev-Server starten

```bash
npm run dev
```

4. Öffne

http://localhost:3000/evaluate

## API

- POST `/api/evaluate` — Body: `{ question, answer }`. Antwort: `{ model, evaluation, ok, found, solutionCode? }`.
- GET `/api/history` — listet gespeicherte Bewertungen.
- POST `/api/history` — speichert `{ question, answer, evaluation }` (geschützt mit `API_KEY` falls gesetzt).

Authentifizierung
- Wenn `API_KEY` in `.env` gesetzt ist, müssen POST-Anfragen den Header `x-api-key: <API_KEY>` enthalten.
- Hinweis: `NEXT_PUBLIC_API_KEY` macht den Key im Browser sichtbar. Verwende das nur in vertrauenswürdigen, internen Umgebungen.

## Sicherheitsempfehlung
- Für öffentliche Deployments empfehle ich: keine clientseitig sichtbaren API-Keys. Stattdessen Session- oder OAuth-basiertes Login und serverseitiges Weiterreichen des Keys.

## Tests

```bash
npm test
```

## Weiteres
- Möchtest du die Heuristik semantisch verbessern (z. B. Embeddings) oder die Persistenz auf eine Datenbank umstellen (SQLite/Postgres)? Sag Bescheid — ich erstelle das gerne.
