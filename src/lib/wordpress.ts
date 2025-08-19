import { logger } from './logger';
import { AppConfig } from './config';

export type WPPost = {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
  excerpt?: { rendered: string };
  tags: number[]; // tag IDs
};

export type WPTag = {
  id: number;
  name: string;
  slug: string;
};

export class WordPressClient {
  private base: string;
  private authHeader: string;
  private queue: Promise<unknown> = Promise.resolve();
  private rateDelayMs: number = Number(process.env.WP_RATE_DELAY_MS || 200);

  constructor(private cfg: AppConfig) {
    if (!cfg.wordpressBaseUrl || !cfg.wordpressUsername || !cfg.wordpressAppPassword) {
      throw new Error('WordPress configuration missing: please set WORDPRESS_BASE_URL, WORDPRESS_USERNAME and WORDPRESS_APP_PASSWORD if you enable WordPress integration.');
    }
    this.base = cfg.wordpressBaseUrl.replace(/\/$/, '');
    const token = Buffer.from(`${cfg.wordpressUsername}:${cfg.wordpressAppPassword}`).toString('base64');
    this.authHeader = `Basic ${token}`;
  }

  private async doFetch<T>(url: string, init?: RequestInit, retries = 2): Promise<T> {
    try {
      const res = await fetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.authHeader,
          ...(init?.headers || {}),
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      if (retries > 0) {
        const wait = 500 * (3 - retries);
        logger.warn('WP request failed, retrying', { url, retries, err: String(err) });
        await new Promise((r) => setTimeout(r, wait));
        return this.doFetch<T>(url, init, retries - 1);
      }
      throw err;
    }
  }

  private async request<T>(path: string, init?: RequestInit, retries = 2): Promise<T> {
    const url = `${this.base}${path}`;
    // simple queue: ensure one request at a time with a small delay to avoid rate limit
    this.queue = this.queue.then(async () => {
      const data = await this.doFetch<T>(url, init, retries);
      if (this.rateDelayMs > 0) {
        await new Promise((r) => setTimeout(r, this.rateDelayMs));
      }
      return data;
    });
    return (this.queue as Promise<T>);
  }

  async getTagBySlug(slug: string): Promise<WPTag | undefined> {
    // try exact slug match first
    const exact = await this.request<WPTag[]>(`/wp-json/wp/v2/tags?slug=${encodeURIComponent(slug)}&per_page=1`);
    if (exact && exact.length > 0) return exact[0];
    // fallback search by name
    const tags = await this.request<WPTag[]>(`/wp-json/wp/v2/tags?search=${encodeURIComponent(slug)}&per_page=100`);
    return tags.find((t) => t.slug === slug || t.name.toLowerCase() === slug.toLowerCase());
  }

  async ensureTag(slugOrName: string): Promise<WPTag> {
    const existing = await this.getTagBySlug(slugOrName);
    if (existing) return existing;
    if (!this.cfg.autoCreateTags) {
      throw new Error(
        `Tag '${slugOrName}' existiert nicht und AUTO_CREATE_TAGS=false. Bitte in WordPress anlegen (Beiträge → Schlagwörter) oder AUTO_CREATE_TAGS auf true setzen.`
      );
    }
    try {
      return await this.request<WPTag>(`/wp-json/wp/v2/tags`, {
        method: 'POST',
        body: JSON.stringify({ name: slugOrName, slug: slugOrName }),
      });
    } catch (e) {
      const msg = String(e);
      if (msg.includes('401') || msg.includes('rest_cannot_create')) {
        throw new Error(
          `Fehlende WordPress-Berechtigung zum Erstellen des Tags '${slugOrName}'. Entweder Tag manuell anlegen oder AUTO_CREATE_TAGS=false setzen.`
        );
      }
      throw e;
    }
  }

  async getUnansweredQuestions(questionTagId: number, answeredTagId: number, max: number): Promise<WPPost[]> {
    // posts with questionTag but NOT answeredTag
    const posts = await this.request<WPPost[]>(
      `/wp-json/wp/v2/posts?tags=${questionTagId}&per_page=${max}&_fields=id,title,content,tags`
    );
    return posts.filter((p) => !p.tags.includes(answeredTagId));
  }

  async addComment(postId: number, content: string) {
    return this.request(`/wp-json/wp/v2/comments`, {
      method: 'POST',
      body: JSON.stringify({ post: postId, content }),
    });
  }

  async addAnsweredTag(post: WPPost, answeredTagId: number) {
    const tags = Array.from(new Set([...(post.tags || []), answeredTagId]));
    return this.request(`/wp-json/wp/v2/posts/${post.id}`, {
      method: 'POST',
      body: JSON.stringify({ tags }),
    });
  }

  async addEvaluatedTag(post: WPPost, evaluatedTagId: number) {
    const tags = Array.from(new Set([...(post.tags || []), evaluatedTagId]));
    return this.request(`/wp-json/wp/v2/posts/${post.id}`, {
      method: 'POST',
      body: JSON.stringify({ tags }),
    });
  }

  async getCommentsForPost(postId: number) {
    return this.request(`/wp-json/wp/v2/comments?post=${postId}&per_page=100&_fields=id,post,content,parent`);
  }

  async replyToComment(parentCommentId: number, postId: number, content: string) {
    return this.request(`/wp-json/wp/v2/comments`, {
      method: 'POST',
      body: JSON.stringify({ post: postId, content, parent: parentCommentId }),
    });
  }
}
