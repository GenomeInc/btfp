import { afterEach, describe, expect, it, vi } from 'vitest';
import { RedditClient } from './client.js';
import type { RedditListing } from './types.js';

function post(id: string, created_utc: number, overrides: Partial<RedditListing['data']['children'][number]['data']> = {}) {
  return {
    kind: 't3',
    data: {
      id,
      title: `post ${id}`,
      selftext: 'body',
      permalink: `/r/dogs/comments/${id}/`,
      created_utc,
      stickied: false,
      ...overrides,
    },
  };
}

function jsonResponse(body: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as Response;
}

describe('RedditClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches an access token via Basic auth and reuses it across calls', async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(jsonResponse({ access_token: 'tok-123' }));
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { children: [], after: null } } satisfies RedditListing),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new RedditClient({ clientId: 'id', clientSecret: 'secret' });
    await client.fetchNewPosts('dogs', undefined);
    await client.fetchNewPosts('cats', undefined);

    const tokenCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('access_token'));
    expect(tokenCalls).toHaveLength(1);

    const [tokenUrl, tokenInit] = tokenCalls[0] as [string, RequestInit];
    expect(tokenUrl).toBe('https://www.reddit.com/api/v1/access_token');
    const headers = tokenInit.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${Buffer.from('id:secret').toString('base64')}`);
    expect(headers['User-Agent']).toContain('btfp-scraper');
    expect(tokenInit.body).toBe('grant_type=client_credentials');

    const listingCall = fetchMock.mock.calls.find(([url]) => String(url).includes('oauth.reddit.com'));
    const [, listingInit] = listingCall as [string, RequestInit];
    expect((listingInit.headers as Record<string, string>).Authorization).toBe('Bearer tok-123');
  });

  it('stops paginating once a post older than the watermark is reached, returns oldest-first', async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(jsonResponse({ access_token: 'tok' }));
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          children: [post('new2', 300), post('new1', 200), post('old', 100)],
          after: 'cursor-2',
        },
      } satisfies RedditListing),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new RedditClient({ clientId: 'id', clientSecret: 'secret' });
    const results = await client.fetchNewPosts('dogs', 100);

    // Only one page fetched even though `after` was non-null — hitting the
    // watermark should short-circuit further pagination.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(results.map((p) => p.id)).toEqual(['new1', 'new2']);
  });

  it('paginates via `after` when no post in the page hits the watermark', async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(jsonResponse({ access_token: 'tok' }));
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: { children: [post('page1-a', 300)], after: 'cursor-1' },
      } satisfies RedditListing),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: { children: [post('page2-a', 200)], after: null },
      } satisfies RedditListing),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new RedditClient({ clientId: 'id', clientSecret: 'secret' });
    const results = await client.fetchNewPosts('dogs', undefined);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const secondListingUrl = String(fetchMock.mock.calls[2]?.[0]);
    expect(secondListingUrl).toContain('after=cursor-1');
    expect(results.map((p) => p.id)).toEqual(['page2-a', 'page1-a']);
  });

  it('throws a descriptive error when the token request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'nope' }, false));
    vi.stubGlobal('fetch', fetchMock);

    const client = new RedditClient({ clientId: 'id', clientSecret: 'secret' });
    await expect(client.fetchNewPosts('dogs', undefined)).rejects.toThrow(
      'Reddit token request failed',
    );
  });
});
