import { get } from 'svelte/store';
import type { SavedTimetable } from './timetables';
import { authState } from './auth';

export type CalendarState = {
  activeTimetableIds: Record<string, string>;
  timetables: SavedTimetable[];
};

const apiUrl = (path: string): URL => {
  const base = import.meta.env.VITE_PAULINE_API;
  if (!base || base === true) {
    throw new Error('VITE_PAULINE_API is not set');
  }

  const url = base.startsWith('/') ? new URL(base, window.location.origin) : new URL(base);
  url.pathname += path;
  return url;
};

const authHeaders = (): HeadersInit => {
  const token = get(authState).token;
  if (!token) {
    throw new Error('Kein Konto angemeldet.');
  }

  return {
    authorization: `Bearer ${token}`
  };
};

const clearAuthOn401 = (status: number): void => {
  if (status === 401) {
    authState.set({ account: null, token: null });
  }
};

export const loadPersistedCalendar = async (): Promise<CalendarState | null> => {
  if (!get(authState).token) return null;

  const response = await fetch(apiUrl('/calendar'), {
    headers: authHeaders()
  });
  if (response.status === 401) { clearAuthOn401(response.status); return null; }
  if (!response.ok) {
    throw new Error('Gespeicherte Stundenpläne konnten nicht geladen werden.');
  }

  return (await response.json()) as CalendarState;
};

export const savePersistedCalendar = async (
  state: CalendarState
): Promise<CalendarState | null> => {
  if (!get(authState).token) return null;

  const response = await fetch(apiUrl('/calendar'), {
    method: 'PUT',
    headers: {
      ...authHeaders(),
      'content-type': 'application/json'
    },
    body: JSON.stringify(state)
  });
  if (response.status === 401) { clearAuthOn401(response.status); return null; }
  if (!response.ok) {
    throw new Error('Stundenpläne konnten nicht gespeichert werden.');
  }

  return (await response.json()) as CalendarState;
};
