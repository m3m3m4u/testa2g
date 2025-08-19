import OpenAI from 'openai';
import { AppConfig } from './config';

export class AIClient {
  private client: OpenAI;
  private model: string;

  constructor(cfg: AppConfig) {
    this.client = new OpenAI({ apiKey: cfg.openaiApiKey });
    this.model = cfg.model;
  }

  /**
   * Frage an das Modell. Optional kann ein spezieller System-Prompt und die Temperatur
   * übergeben werden (z.B. für JSON-only Antworten).
   */
  async answer(question: string, options?: { temperature?: number; system?: string }): Promise<string> {
    const system = options?.system ?? 'Du bist ein hilfreicher, präziser Assistent. Antworte kurz und sachlich in Deutsch.';
    const temperature = typeof options?.temperature === 'number' ? options!.temperature : 0.2;

    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: question },
      ],
      temperature,
    });
    const msg = res.choices?.[0]?.message?.content?.trim();
    return msg || 'Keine Antwort generiert.';
  }
}
