import type { RedditListing, RedditPost } from './types.js';

// Reddit requires a unique, descriptive User-Agent or it rate-limits/blocks
// harder than usual — see docs/scraper.md.
const USER_AGENT = 'btfp-scraper/1.0 (by /u/badthingsforpets)';
const TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const API_BASE = 'https://oauth.reddit.com';

export interface RedditClientOptions {
  clientId: string;
  clientSecret: string;
}

/**
 * Script-app client_credentials OAuth flow — sufficient for read-only
 * access to public subreddits, no per-user login needed. Token is fetched
 * once and cached for the lifetime of a single (short-lived) task run, no
 * refresh logic needed.
 */
export class RedditClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private accessToken: string | null = null;

  constructor(options: RedditClientOptions) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new Error(`Reddit token request failed: ${response.status} ${await response.text()}`);
    }
    const body = (await response.json()) as { access_token: string };
    this.accessToken = body.access_token;
    return this.accessToken;
  }

  /**
   * Fetches posts newer than `sinceUtc` from r/{subreddit}'s `new` listing.
   * That listing is reverse-chronological, so pagination stops as soon as
   * an already-seen post is reached — no need to page through full
   * history on every run. Returns oldest-first, so a mid-run crash still
   * leaves the watermark at whatever was actually processed.
   */
  async fetchNewPosts(subreddit: string, sinceUtc: number | undefined): Promise<RedditPost[]> {
    const token = await this.getAccessToken();
    const collected: RedditPost[] = [];
    let after: string | null = null;

    do {
      const url = new URL(`${API_BASE}/r/${subreddit}/new`);
      url.searchParams.set('limit', '100');
      if (after) url.searchParams.set('after', after);

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT },
      });
      if (!response.ok) {
        throw new Error(`Reddit listing request failed for r/${subreddit}: ${response.status}`);
      }
      const listing = (await response.json()) as RedditListing;

      let hitWatermark = false;
      for (const child of listing.data.children) {
        const post = child.data;
        if (sinceUtc !== undefined && post.created_utc <= sinceUtc) {
          hitWatermark = true;
          break;
        }
        collected.push(post);
      }

      after = hitWatermark ? null : listing.data.after;
    } while (after);

    return collected.reverse();
  }
}
