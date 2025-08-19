export type AppConfig = {
  openaiApiKey: string;
  model: string;
  apiKey?: string;
  allowedOrigin?: string;
  wordpressBaseUrl?: string;
  wordpressUsername?: string;
  wordpressAppPassword?: string;
  autoCreateTags?: boolean;
};

export function getConfig(): AppConfig {
  const { OPENAI_API_KEY, OPENAI_MODEL, ALLOWED_ORIGIN, WORDPRESS_BASE_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD } = process.env;
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');
  return {
    openaiApiKey: OPENAI_API_KEY,
    model: OPENAI_MODEL || 'gpt-4o-mini',
    apiKey: process.env.API_KEY, // optional server-side API key for protecting endpoints
    allowedOrigin: ALLOWED_ORIGIN,
  wordpressBaseUrl: WORDPRESS_BASE_URL,
  wordpressUsername: WORDPRESS_USERNAME,
  wordpressAppPassword: WORDPRESS_APP_PASSWORD,
  autoCreateTags: process.env.AUTO_CREATE_TAGS === 'true',
  };
}
