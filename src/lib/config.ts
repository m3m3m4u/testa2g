export type AppConfig = {
  openaiApiKey: string;
  model: string;
  apiKey?: string;
  allowedOrigin?: string;
};

export function getConfig(): AppConfig {
  const { OPENAI_API_KEY, OPENAI_MODEL, ALLOWED_ORIGIN } = process.env;
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');
  return {
    openaiApiKey: OPENAI_API_KEY,
    model: OPENAI_MODEL || 'gpt-4o-mini',
    apiKey: process.env.API_KEY, // optional server-side API key for protecting endpoints
    allowedOrigin: ALLOWED_ORIGIN,
  };
}
