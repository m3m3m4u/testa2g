"use client";
import { useState } from "react";

const FIXED_QUESTION = "Nennen Sie drei Begriffe, die die Personenzentrierung in der Pflege beschreiben.";

// Liste plausibler Begriffe (kleingeschrieben) und einige Synonyme
const ALLOWED_TERMS = [
  "mensch im mittelpunkt",
  "mensch im zentrum",
  "caring",
  "beduerfnisse",
  "beduerfnisse des patienten",
  "ganzheitliche pflege",
  "ganzheitlich",
  "holistische pflege",
  "holistisch",
  "patientenorientierung",
  "patienten orientierung",
];

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

export default function EvaluatePage({ embedded = false }: { embedded?: boolean }) {
  const [a, setA] = useState("");
  const [out, setOut] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [statusOk, setStatusOk] = useState<boolean | null>(null);

  const checkAnswer = (answer: string) => {
    const n = normalize(answer);
    const found = new Set<string>();
    for (const term of ALLOWED_TERMS) {
      const nt = normalize(term);
      if (n.includes(nt)) found.add(nt);
    }
    const ok = found.size >= 3;
    return { ok, found: Array.from(found) };
  };

  const onSubmit = async (_e: React.FormEvent) => {
    _e.preventDefault();
    setOut("Prüfung läuft…");
    setLoading(true);
    setStatusOk(null);
    try {
      // call server-side evaluation
      try {
        const res = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ question: FIXED_QUESTION, answer: a }),
        });
        if (!res || !res.ok) {
          // API returned an error (5xx/4xx) or no response
          const msg = 'Server nicht verfügbar oder liefert Fehler. Bitte prüfe die Server-Logs oder versuche es später erneut.';
          setOut(msg + "\n\nHinweis: Dieses Feedback kann nicht erstellt werden, weil die Bewertungs-API nicht erreichbar ist.");
          setStatusOk(null);
          setLoading(false);
          return;
        }

        const data = await res.json();
        let evalText = '';
        if (data) {
          // Prefer server/LLM feedback when provided
          if (data.evaluation) {
            // If LLM explicitly marks "teilweise" or requests a retry, do not show the solution code
            if (data.requireRetry || data.correctness === 'teilweise') {
              evalText = data.evaluation + '\n\nHinweis: Die Antwort ist teilweise korrekt. Versuchen Sie bitte noch einmal und konkretisieren Sie Ihre Begriffe.';
              setStatusOk(false);
            } else {
              // Only reveal the solution code when the server explicitly marks the answer as fully correct
              evalText = data.evaluation;
              if (data.ok === true && data.correctness === 'korrekt' && data.solutionCode) {
                evalText += `\nLösungscode: ${data.solutionCode}.`;
              }
              setStatusOk(Boolean(data.ok));
            }
          } else {
            // Server answered but provided no evaluation — ask user to retry / check server
            setOut('Die Bewertungs-API konnte keine abschließende Entscheidung treffen. Bitte versuchen Sie es erneut oder prüfe die Server-Logs.');
            setStatusOk(null);
            setLoading(false);
            return;
          }
        } else {
          // network/server error or non-ok response — inform user
          setOut('Die Bewertungs-API hat keine gültige Antwort geliefert. Bitte prüfe die Server-Logs oder versuche es später erneut.');
          setStatusOk(null);
          setLoading(false);
          return;
        }

  // The page already shows a static hint/footer about KI-based feedback,
  // so don't append the same message to the evaluation text to avoid duplication.
  setOut(evalText);

        // Save to history (non-blocking)
        try {
          await fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ question: FIXED_QUESTION, answer: a, evaluation: evalText }),
          });
  } catch (e) {
          // ignore history save errors
        }
        } catch (e) {
          // Unexpected error while calling server or saving history — use clear, targeted messages
          const local = checkAnswer(a);
          if (local.ok) {
            // Do not reveal the solution code when the server is unreachable. Require the server to confirm.
            setOut(`Ihre Antwort enthält mindestens drei passende Begriffe (${local.found.join(', ')}).\n\nHinweis: Das Server-Feedback konnte nicht vollständig abgerufen werden. Der Lösungscode wird nur angezeigt, wenn die Bewertungs-API eine abschließende "korrekt"-Entscheidung trifft.`);
            setStatusOk(null);
          } else {
            setOut(`Die automatische Prüfung konnte keine ausreichenden Treffer finden. Bitte nennen Sie drei prägnante Begriffe oder kurze Umschreibungen (Synonyme/Paraphrasen werden akzeptiert).\n\nFalls du sicher bist, dass deine Antwort korrekt ist, starte den Server neu oder prüfe die Server-Logs.`);
            setStatusOk(false);
          }
        }
    } catch (err) {
      setOut("Fehler: " + ((err as Error)?.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 max-w-5xl mx-auto font-sans">
      <div className="flex gap-6 items-start flex-wrap">
        <section className="flex-1 min-w-[20rem]">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <h1 className="m-0 text-lg">Tag 14 · Kapitel 6</h1>
            <p className="mt-1 text-gray-600 font-semibold">Personenzentrierung</p>

            <form onSubmit={onSubmit} className="grid gap-4 mt-4">
              <div>
                <div className="text-sm text-gray-500">Frage</div>
                <div className="mt-2 p-3 bg-slate-50 rounded-lg text-slate-900 text-sm">{FIXED_QUESTION}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500 mb-1">Meine Antwort</div>
                <textarea
                  value={a}
                  onChange={(e) => setA(e.target.value)}
                  placeholder="Tragen Sie hier drei Begriffe ein, z. B. 'Mensch im Mittelpunkt, Caring, Bedürfnisse'"
                  required
                  className="w-full min-h-[10rem] p-3 rounded-lg border border-slate-200 resize-vertical text-sm shadow-inner"
                />
              </div>

              <div className="flex gap-3 items-center">
                <button type='submit' disabled={loading} className="bg-sky-600 text-white px-4 py-2 rounded-lg disabled:opacity-60">
                  {loading ? 'Bewerten…' : 'Bewerten'}
                </button>
                <button type='button' onClick={() => { setA(''); setOut(''); setStatusOk(null); }} className="bg-white border px-3 py-2 rounded-lg">Zurücksetzen</button>
              </div>
            </form>
          </div>
        </section>

        <aside className="w-80 min-w-[16rem]">
          <div className="bg-white rounded-2xl p-4 shadow-sm border">
            <div className="text-sm text-gray-500">Ergebnis</div>
            <div className="mt-2">
              <div className={`p-3 rounded-md min-h-[8rem] ${statusOk === null ? 'bg-slate-50 border border-slate-100' : statusOk ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
                <div className="text-sm text-slate-900">
                  {out ? (
                    // Render formatted evaluation: paragraphs, bold labels before ':' and preserve line breaks
                    (() => {
                      const paragraphs = out.split(/\n\s*\n/).filter(p => p.trim().length > 0);
                      return (
                        <div>
                          {paragraphs.map((p, pi) => {
                            const m = p.match(/^([^:]+):\s*([\s\S]*)$/);
                            const lines = (m ? m[2] : p).split(/\n/);
                            return (
                              <p key={pi} className="mb-2">
                                {m ? <strong>{m[1].trim()}:</strong> : null}
                                {m ? ' ' : null}
                                {lines.map((ln, li) => (
                                  <span key={li}>
                                    {ln}
                                    {li < lines.length - 1 ? <br /> : null}
                                  </span>
                                ))}
                              </p>
                            );
                          })}
                        </div>
                      );
                    })()
                  ) : (loading ? 'Prüfung läuft…' : 'Hier erscheint das Feedback.')}
                </div>
              </div>
            </div>
            {!embedded ? (
              <div className="mt-3 text-xs text-gray-500">Hinweis: Dieses Feedback wurde KI-gestützt erstellt und orientiert sich an den Lehrunterlagen von Dr. German Quernheim.</div>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}

// Recent removed per request
