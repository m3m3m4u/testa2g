import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { AIClient } from '@/lib/ai';

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/[ß]/g, "ss")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ALLOWED_TERMS = [
  "mensch im mittelpunkt",
  "mensch im zentrum",
  "caring",
  "beduerfnisse",
  "beduerfnisse des patienten",
  "beduerfnisse des patienten",
  "ganzheitliche pflege",
  "ganzheitlich",
  "holistische pflege",
  "holistisch",
  "patientenorientierung",
];

// Mapping normalized term -> nicely spelled canonical form for feedback
const CANONICAL_MAP: Record<string, string> = {
  [normalize('mensch im mittelpunkt')]: 'Mensch im Mittelpunkt',
  [normalize('mensch im zentrum')]: 'Mensch im Zentrum',
  [normalize('caring')]: 'Caring',
  [normalize('beduerfnisse')]: 'Bedürfnisse',
  [normalize('beduerfnisse des patienten')]: 'Bedürfnisse des Patienten',
  [normalize('ganzheitliche pflege')]: 'Ganzheitliche Pflege',
  [normalize('ganzheitlich')]: 'Ganzheitlich',
  [normalize('holistische pflege')]: 'Holistische Pflege',
  [normalize('holistisch')]: 'Holistisch',
  [normalize('patientenorientierung')]: 'Patientenorientierung',
};

function beautifyTerm(raw: string) {
  if (!raw) return raw;
  const n = normalize(raw);
  if (CANONICAL_MAP[n]) return CANONICAL_MAP[n];
  // Versuch: einfache Umkehr der Normalisierung für Umlaute
  let s = raw
    .replace(/ae/g, 'ä')
    .replace(/oe/g, 'ö')
    .replace(/ue/g, 'ü')
    .replace(/ss/g, 'ß');
  // Title-case
  s = s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return s;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function corsHeaders(origin?: string) {
  const headers = new Headers({
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  if (origin) headers.set('Access-Control-Allow-Origin', origin);
  return headers;
}

export async function OPTIONS() {
  const { allowedOrigin } = getConfig();
  return new NextResponse(null, { headers: corsHeaders(allowedOrigin) });
}

export async function POST(req: Request) {
  try {
  const { allowedOrigin, model } = getConfig();
  const ai = new AIClient(getConfig());

    const body = await req.json().catch(() => ({}));
    const { question, answer } = body || {};
    if (!question || !answer) {
      return NextResponse.json({ error: 'question and answer required' }, { status: 400, headers: corsHeaders(allowedOrigin) });
    }

    const prompt = `Bewerte die folgende Antwort auf die Frage. Antworte knapp auf Deutsch mit:\n` +
      `- Korrektheit: kurz (korrekt/teilweise/falsch)\n- Begründung: 1-2 Sätze\n- Verbesserungen: 1-2 konkrete Punkte\n\n` +
      `Wichtig: Ignoriere offensichtliche Rechtschreib- und Grammatikfehler; beurteile den Inhalt und die Bedeutung. Akzeptiere sinnvolle Synonyme oder Paraphrasen — die unten stehende Liste von Beispielbegriffen ist nur ein Hinweis und darf nicht als zwingende Liste verstanden werden. Zähle nicht nur exakte Wortübereinstimmungen, sondern bewerte den Inhalt semantisch.` +
      `\n\nFrage:\n${question}\n\nAntwort des Nutzers:\n${answer}`;

  const evaluation = await ai.answer(prompt);

  // Normalisiertes Antwort-Text available for normalization but we DO NOT use local heuristics
  const n = normalize(answer);
  let found = new Set<string>();

  // Semantische Prüfung: nutze die KI, um Synonyme / Paraphrasen zu erkennen und
  // zusätzliche sinnvolle Begriffe zu akzeptieren. Erwartetes KI-Output: reines
  // JSON { "matched": [..], "acceptedExtras": [..], "acceptAll": true|false }
  let aiMatched: string[] = [];
  let aiExtras: string[] = [];
  let aiAcceptAll = false;
  let aiCorrectness: 'korrekt' | 'teilweise' | 'falsch' | null = null;
  let aiReason: string | null = null;
    try {
      const semanticPrompt = `Du bewertest die Antwort einer Lernenden Person zur Frage weiter unten.` +
        `\n\nAufgabe: Entscheide primär, ob die Antwort \"korrekt\", \"teilweise\" oder \"falsch\" ist.` +
        ` Die unten stehende Liste mit Beispielen ist nur ein Hinweis in welche Richtung gültige Begriffe gehen könnten; zähle nicht nur exakte Übereinstimmungen.` +
        `\n\nWichtig: Ignoriere offensichtliche Rechtschreib- und Grammatikfehler; beurteile den inhaltlichen Sinn und akzeptiere sinnvolle Paraphrasen oder Synonyme.` +
        `\n\nAntworte ausschließlich mit gültigem JSON (ohne zusätzlichen Text) im Format:` +
        `\n{\"correctness\": \"korrekt\"|\"teilweise\"|\"falsch\", \"reason\": \"<kurze Begründung>\", \"acceptedExtras\": [\"...\"], \"acceptAll\": true|false}` +
        `\n\nBeispielbegriffe (nur als Hinweis):\n` +
        `${ALLOWED_TERMS.map(t => `- ${t}`).join('\n')}` +
        `\n\nFrage:\n${question}\n\nAntwort der Lernenden:\n${answer}\n\nHinweis: Wenn die Antwort inhaltlich stimmig ist, aber andere Begriffe verwendet werden, markiere \"acceptAll\": true und setze \"correctness\":\"korrekt\". Wenn die Antwort teilweise stimmt, setze \"correctness\":\"teilweise\" und gib eine kurze \"reason\".`;

      const semSystem = 'Du bist ein präziser JSON-Generator. Antworte ausschließlich mit gültigem JSON ohne erläuternden Text.';
      const semResp = await ai.answer(semanticPrompt, { system: semSystem, temperature: 0 });
      // Versuche, reines JSON zu extrahieren und zu parsen
      const jsonMatch = semResp.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : semResp;
      const parsed: any = JSON.parse(jsonText);
      if (parsed && Array.isArray(parsed.matched)) aiMatched = parsed.matched.filter(Boolean);
      if (parsed && Array.isArray(parsed.acceptedExtras)) aiExtras = parsed.acceptedExtras.filter(Boolean);
      if (parsed && typeof parsed.acceptAll === 'boolean') aiAcceptAll = parsed.acceptAll;
      if (parsed && typeof parsed.correctness === 'string') aiCorrectness = parsed.correctness;
      if (parsed && typeof parsed.reason === 'string') aiReason = parsed.reason;
    } catch (err) {
      // Bei Fehlern beim semantischen Check: stiller Fallback auf exakte Heuristik
      // (kein Abbruch der Haupt-Flow)
    }

    // Combine: include LLM-provided matches/extras and local allowed terms found in the answer.
    for (const m of aiMatched) {
      const norm = normalize(m);
      if (norm) found.add(norm);
    }
    for (const e of aiExtras) {
      const norm = normalize(e);
      if (norm) found.add(norm);
    }
    // Also detect any of the ALLOWED_TERMS directly in the answer text (they count towards the 3-term rule)
    for (const t of ALLOWED_TERMS) {
      if (n.includes(normalize(t))) found.add(normalize(t));
    }

  // Primär: verwende die Entscheidung des LLM, wenn vorhanden
    // Entscheidungslogik:
    // - Wenn mindestens 3 unterschiedliche passende Begriffe (ALLOWED_TERMS, LLM-matched oder acceptedExtras) gefunden wurden -> korrekt
    // - Sonst, wenn das LLM eine Korrektheit liefert, verwende sie
    // - Sonst, wenn das LLM acceptAll setzt -> korrekt
    // - Sonst: teilweise/falsch je nach Anzahl gefundener Begriffe (1 => teilweise, 0 => falsch)
    let correctness: 'korrekt' | 'teilweise' | 'falsch' = 'falsch';
    const count = found.size;
    if (count >= 3) {
      correctness = 'korrekt';
    } else if (aiCorrectness) {
      correctness = aiCorrectness;
    } else if (aiAcceptAll) {
      correctness = 'korrekt';
    } else if (count === 1) {
      correctness = 'teilweise';
    } else if (count === 2) {
      correctness = 'teilweise';
    } else {
      correctness = 'falsch';
    }

    const ok = correctness === 'korrekt';

    const resp: any = { model, evaluation, ok, correctness, found: Array.from(found), acceptedExtras: aiExtras, acceptAll: aiAcceptAll, reason: aiReason };
  // Korrigierte Anzeigeform der gefundenen / akzeptierten Begriffe
  resp.correctedFound = Array.from(found).map(f => beautifyTerm(f));
  resp.correctedAcceptedExtras = (aiExtras || []).map(e => beautifyTerm(e));
    // Bei vollständiger Korrektheit wird der Lösungscode angezeigt; bei Teilweise nicht.
    if (ok) resp.solutionCode = 145;
    if (correctness === 'teilweise') resp.requireRetry = true;

    return NextResponse.json(resp, { headers: corsHeaders(allowedOrigin) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
