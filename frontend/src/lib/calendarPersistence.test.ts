import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { authState } from './auth';
import { loadPersistedCalendar, savePersistedCalendar } from './calendarPersistence';
import type { AppointmentCollection } from './api';

const appointment: AppointmentCollection = {
  cid: 'L.123.45678',
  name: 'Testveranstaltung',
  description: '',
  ou: undefined,
  small_groups: [],
  appointments: [
    {
      start_time: '2026-04-13T09:00:00.000+02:00',
      end_time: '2026-04-13T11:00:00.000+02:00',
      room: 'C1',
      instructors: 'Ada Lovelace'
    }
  ]
};

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });

describe('calendarPersistence', () => {
  beforeEach(() => {
    authState.set({ account: null, token: null });
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('window', { location: { origin: 'http://localhost' } });
    vi.stubEnv('VITE_PAULINE_API', '/api/v1');
  });

  it('does not call the API without an authenticated account', async () => {
    expect(await loadPersistedCalendar()).toBeNull();
    expect(await savePersistedCalendar([appointment])).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('loads the authenticated account calendar', async () => {
    authState.set({
      token: 'secret-token',
      account: {
        id: 1,
        email: 'user@mail.upb.de',
        created_at: '2026-04-29T00:00:00'
      }
    });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ appointments: [appointment] }));

    await expect(loadPersistedCalendar()).resolves.toEqual({ appointments: [appointment] });
    expect(fetch).toHaveBeenCalledWith(expect.any(URL), {
      headers: { authorization: 'Bearer secret-token' }
    });
  });

  it('saves the authenticated account calendar', async () => {
    authState.set({
      token: 'secret-token',
      account: {
        id: 1,
        email: 'user@mail.upb.de',
        created_at: '2026-04-29T00:00:00'
      }
    });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ appointments: [appointment] }));

    await expect(savePersistedCalendar([appointment])).resolves.toEqual({ appointments: [appointment] });
    expect(fetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        method: 'PUT',
        headers: {
          authorization: 'Bearer secret-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ appointments: [appointment] })
      })
    );
    expect(get(authState).token).toBe('secret-token');
  });
});
