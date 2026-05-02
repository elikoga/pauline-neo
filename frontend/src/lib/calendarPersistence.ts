import { dbg } from './debug';

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

/**
 * Fix broken active timetable ID references:
 * - Remove entries pointing at non-existent or deleted timetables.
 * - Fall back to the first visible timetable for the semester.
 * Returns a new (or same) state object.
 */
export const sanitizeCalendarState = (state: CalendarState): CalendarState => {
  const byId = new Map(state.timetables.map((t) => [t.id, t]));
  const visibleBySemester = new Map<string, string>();
  for (const t of state.timetables) {
    if (!t.deleted && t.semesterName) {
      if (!visibleBySemester.has(t.semesterName)) visibleBySemester.set(t.semesterName, t.id);
    }
  }

  let changed = false;
  const fixed: Record<string, string> = {};
  for (const [semester, timetableId] of Object.entries(state.activeTimetableIds)) {
    const tt = byId.get(timetableId);
    if (tt && !tt.deleted && tt.semesterName === semester) {
      fixed[semester] = timetableId;
    } else {
      const fallback = visibleBySemester.get(semester);
      if (fallback) {
        dbg('sanitize: fixed active ID for', semester, timetableId, '->', fallback);
        fixed[semester] = fallback;
      } else {
        dbg('sanitize: removed active ID for', semester, timetableId, '(no visible timetable)');
      }
      changed = true;
    }
  }
  return changed ? { ...state, activeTimetableIds: fixed } : state;
};

/** Validate calendar state before saving. Returns true if valid. */
export const validateCalendarState = (state: CalendarState): boolean => {
  const ids = new Set<string>();
  let ok = true;
  for (const t of state.timetables) {
    if (ids.has(t.id)) {
      dbg('validate: duplicate timetable ID', t.id);
      ok = false;
    }
    ids.add(t.id);
    if (!t.semesterName) {
      dbg('validate: timetable', t.id, 'has empty semesterName');
      ok = false;
    }
  }
  for (const [semester, timetableId] of Object.entries(state.activeTimetableIds)) {
    if (!ids.has(timetableId)) {
      dbg('validate: active ID', timetableId, 'for', semester, 'references non-existent timetable');
      ok = false;
    }
  }
  return ok;
};
