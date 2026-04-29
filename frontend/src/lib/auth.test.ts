import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { authState, requestAuthLink, verifyAccount } from './auth';

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });

describe('auth API', () => {
  beforeEach(() => {
    authState.set({ account: null, token: null });
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('window', { location: { origin: 'http://localhost' } });
    vi.stubEnv('VITE_PAULINE_API', '/api/v1');
  });

  it('requests an auth email without saving a session', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ email: 'user@mail.upb.de' }));

    await expect(requestAuthLink('user@mail.upb.de', 'challenge-token', '9')).resolves.toEqual({
      email: 'user@mail.upb.de'
    });
    expect(get(authState)).toEqual({ account: null, token: null });
    expect(fetch).toHaveBeenCalledWith(expect.any(URL), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'user@mail.upb.de',
        challenge_token: 'challenge-token',
        challenge_answer: '9'
      })
    });
  });

  it('verifies a token and saves the session token', async () => {
    const account = {
      id: 1,
      email: 'user@mail.upb.de',
      created_at: '2026-04-29T00:00:00'
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ account, token: 'session-token' }));

    await expect(verifyAccount('magic-link-token')).resolves.toEqual({
      account,
      token: 'session-token'
    });
    expect(get(authState)).toEqual({ account, token: 'session-token' });
  });
});
