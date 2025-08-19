import { getConfig } from './config';
import { AIClient } from './ai';
import { logger } from './logger';
import { promises as fs } from 'fs';
import path from 'path';

export type RunResult = {
  processed: number;
  saved: number;
  errors: Array<{ error: string }>;
};

const DATA_FILE = path.join(process.cwd(), 'data', 'evaluations.json');

async function ensureData() {
  try {
    await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]', 'utf-8');
  }
}

export async function runOnce(inputs: Array<{ question: string; answer: string }>): Promise<RunResult> {
  const cfg = getConfig();
  const ai = new AIClient(cfg);
  const res: RunResult = { processed: 0, saved: 0, errors: [] };
  await ensureData();
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  const list = JSON.parse(raw || '[]');

  for (const it of inputs) {
    try {
      const prompt = `Bewerte die folgende Antwort auf die Frage. Antworte knapp auf Deutsch mit:\n- Korrektheit: kurz (korrekt/teilweise/falsch)\n- Begründung: 1-2 Sätze\n- Verbesserungen: 1-2 konkrete Punkte\n\nFrage:\n${it.question}\n\nAntwort des Nutzers:\n${it.answer}`;
      const evaluation = await ai.answer(prompt);
      const entry = { id: Date.now() + Math.floor(Math.random() * 1000), question: it.question, answer: it.answer, evaluation, ts: new Date().toISOString() };
      list.unshift(entry);
      res.saved += 1;
    } catch (e) {
      logger.error('Evaluation failed', { error: String(e) });
      res.errors.push({ error: String(e) });
    } finally {
      res.processed += 1;
    }
  }

  await fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2), 'utf-8');
  return res;
}
