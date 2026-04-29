// Calendar persistence layers:
//   1. localStorage keys: 'timetables', 'activeTimetableIds' (canonical)
//      and legacy 'appointments', 'calendarCandidates', 'activeCalendarCandidateIds'.
//   2. Server: user_account.calendar_state JSON via /api/v1/calendar.
//   3. In-memory Svelte stores: savedTimetables, activeTimetableIds, realAppointments.
//
// On page load, versioned migrations (localStorageMigrations.ts) bring localStorage
// up to date. On login, server state is merged with local state.
// While logged in, local changes are debounced to the server.
//
// Legacy keys are never deleted during migration — they remain as live backups.

import { get } from 'svelte/store';
import type { AppointmentCollection } from './api';
import { semesterNameStore } from './api';
import { realAppointments, replaceRealAppointments } from './appointments';
import { writableLocalStorageStore } from './localStorageStore';
import { authState } from './auth';
import {
  loadPersistedCalendar,
  savePersistedCalendar,
  type CalendarState
} from './calendarPersistence';
import { runMigrations } from './localStorageMigrations';

export type SavedTimetable = {
  id: string;
  name: string;
  semesterName: string;
  appointments: AppointmentCollection[];
  updatedAt: string;
  order?: number;
  deleted?: boolean;
};

const timetableId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `timetable-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const defaultTimetableNameFor = (semesterName: string, timetables: SavedTimetable[]): string => {
  const semesterTimetables = timetables.filter(
    (timetable) => !timetable.deleted && timetable.semesterName === semesterName
  );
  const suffix = semesterTimetables.length === 0 ? '' : ` ${semesterTimetables.length + 1}`;
  return `${semesterName} – Stundenplan${suffix}`;
};

const readLocalStorageJson = <T>(key: string): T | undefined => {
  if (typeof localStorage === 'undefined') return undefined;
  const value = localStorage.getItem(key);
  if (value === null) return undefined;
  return JSON.parse(value) as T;
};

// Run versioned migrations before reading any localStorage keys.
runMigrations();

// After migrations, 'timetables' and 'activeTimetableIds' are guaranteed to
// exist in localStorage (or both are empty for fresh installs).
export const savedTimetables = writableLocalStorageStore<SavedTimetable[]>(
  'timetables',
  100,
  readLocalStorageJson<SavedTimetable[]>('timetables') ?? []
);

export const activeTimetableIds = writableLocalStorageStore<Record<string, string>>(
  'activeTimetableIds',
  100,
  readLocalStorageJson<Record<string, string>>('activeTimetableIds') ?? {}
);
// --- Auth-state sync -------------------------------------------------------
// When the user logs in, we must reconcile local and server calendar state.
// Three cases:
//   A. Server empty, local has data -> first login: upload local to server.
//   B. Both have data -> multi-device or offline edits: merge by timetable ID,
//      preferring the newer updatedAt, then persist the merge back.
//   C. Server has data, local empty -> new device: load from server.

let loadedAccountId: number | null = null;
let applyingPersistedState = false;
let savePersistedStateTimer: NodeJS.Timeout | undefined;

const persistStateForAccount = (): void => {
  if (applyingPersistedState || !get(authState).token) return;

  if (savePersistedStateTimer) clearTimeout(savePersistedStateTimer);

  savePersistedStateTimer = setTimeout(() => {
    savePersistedCalendar({
      activeTimetableIds: get(activeTimetableIds),
      timetables: get(savedTimetables)
    }).catch((error) => {
      console.error('Failed to persist timetables:', error);
    });
  }, 500);
};

savedTimetables.subscribe(persistStateForAccount);
activeTimetableIds.subscribe(persistStateForAccount);

export const mergeTimetables = (
  local: SavedTimetable[],
  server: SavedTimetable[]
): SavedTimetable[] => {
  const byId = new Map<string, SavedTimetable>();
  // Seed with server — it is authoritative for what exists across all devices.
  for (const t of server) byId.set(t.id, { ...t });
  // Apply local changes: keep local-only timetables (new creates, pending PUTs)
  // and prefer the newer updatedAt for conflicts (tombstones included).
  for (const t of local) {
    const existing = byId.get(t.id);
    if (!existing) {
      byId.set(t.id, { ...t });
    } else if (new Date(t.updatedAt) > new Date(existing.updatedAt)) {
      byId.set(t.id, { ...t, order: t.order ?? existing.order });
    }
    // else: server is newer or same — keep server version
  }
  return Array.from(byId.values());
};

/** Filter out tombstones. Use this everywhere timetables are displayed or selected. */
export const visibleTimetables = (timetables: SavedTimetable[]): SavedTimetable[] =>
  timetables.filter((t) => !t.deleted);

export const mergeActiveIds = (
  local: Record<string, string>,
  server: Record<string, string>
): Record<string, string> => ({ ...server, ...local });

const loadServerStateIntoStores = (serverState: CalendarState): void => {
  savedTimetables.set(serverState.timetables);
  activeTimetableIds.set(serverState.activeTimetableIds);
  const active = activeTimetableForSemester(get(semesterNameStore));
  replaceRealAppointments(active?.appointments ?? [], { resetHistory: true });
};

const reconcileOnLogin = async (
  serverState: CalendarState,
  localTimetables: SavedTimetable[],
  localActiveIds: Record<string, string>
): Promise<void> => {
  const serverHasData = serverState.timetables.length > 0;
  const localHasData = localTimetables.length > 0;

  if (!serverHasData && localHasData) {
    // Case A: first login — upload local to server, keep local as-is.
    await savePersistedCalendar({
      activeTimetableIds: localActiveIds,
      timetables: localTimetables
    });
    return;
  }

  if (serverHasData && localHasData) {
    // Case B: both sides have data — merge, then persist back.
    const mergedTimetables = mergeTimetables(localTimetables, serverState.timetables);
    const mergedActiveIds = mergeActiveIds(localActiveIds, serverState.activeTimetableIds);
    loadServerStateIntoStores({
      timetables: mergedTimetables,
      activeTimetableIds: mergedActiveIds
    });
    savePersistedCalendar({
      timetables: mergedTimetables,
      activeTimetableIds: mergedActiveIds
    }).catch((error) => console.error('Failed to persist merged timetables:', error));
    return;
  }

  // Case C: only server has data — use it.
  loadServerStateIntoStores(serverState);
};

authState.subscribe(async ($authState) => {
  const accountId = $authState.account?.id ?? null;
  if (!accountId || !$authState.token) {
    loadedAccountId = null;
    return;
  }
  if (loadedAccountId === accountId) return;

  loadedAccountId = accountId;
  try {
    const serverState = await loadPersistedCalendar();
    if (!serverState) return;

    applyingPersistedState = true;
    await reconcileOnLogin(serverState, get(savedTimetables), get(activeTimetableIds));
    applyingPersistedState = false;
  } catch (error) {
    applyingPersistedState = false;
    console.error('Failed to load persisted timetables:', error);
  }
});

export const defaultTimetableName = (
  semesterName: string,
  timetables: SavedTimetable[] = get(savedTimetables)
): string => defaultTimetableNameFor(semesterName, timetables);

export const timetablesForSemester = (
  timetables: SavedTimetable[],
  semesterName: string
): SavedTimetable[] => timetables.filter((timetable) => !timetable.deleted && timetable.semesterName === semesterName);

export const activeTimetableIdForSemester = (semesterName: string): string | undefined =>
  get(activeTimetableIds)[semesterName];

export const activeTimetableForSemester = (semesterName: string): SavedTimetable | undefined => {
  const activeId = activeTimetableIdForSemester(semesterName);
  return get(savedTimetables).find(
    (timetable) => !timetable.deleted && timetable.semesterName === semesterName && timetable.id === activeId
  );
};

export const ensureActiveTimetable = (semesterName: string): SavedTimetable => {
  const existing = activeTimetableForSemester(semesterName);
  if (existing) return existing;

  const sameSemester = timetablesForSemester(get(savedTimetables), semesterName);
  const fallback = sameSemester[0];
  if (fallback) {
    activeTimetableIds.update((ids) => ({ ...ids, [semesterName]: fallback.id }));
    return fallback;
  }

  const created: SavedTimetable = {
    id: timetableId(),
    name: defaultTimetableName(semesterName),
    semesterName,
    appointments: get(realAppointments),
    updatedAt: new Date().toISOString()
  };
  savedTimetables.update((timetables) => [...timetables, created]);
  activeTimetableIds.update((ids) => ({ ...ids, [semesterName]: created.id }));
  return created;
};

export const persistActiveTimetableAppointments = (): void => {
  const semesterName = get(semesterNameStore);
  const active = ensureActiveTimetable(semesterName);
  const appointments = get(realAppointments);
  savedTimetables.update((timetables) =>
    timetables.map((timetable) =>
      timetable.id === active.id
        ? {
            ...timetable,
            appointments,
            updatedAt: new Date().toISOString()
          }
        : timetable
    )
  );
};

export const switchTimetable = (timetableId: string): void => {
  persistActiveTimetableAppointments();
  const timetable = get(savedTimetables).find((entry) => entry.id === timetableId);
  if (!timetable) return;

  activeTimetableIds.update((ids) => ({ ...ids, [timetable.semesterName]: timetable.id }));
  if (get(semesterNameStore) !== timetable.semesterName) {
    semesterNameStore.set(timetable.semesterName);
  }
  replaceRealAppointments(timetable.appointments, { resetHistory: true });
};

export const createTimetable = (name?: string): SavedTimetable => {
  persistActiveTimetableAppointments();
  const semesterName = get(semesterNameStore);
  const created: SavedTimetable = {
    id: timetableId(),
    name: name?.trim() || defaultTimetableName(semesterName),
    semesterName,
    appointments: [],
    updatedAt: new Date().toISOString()
  };
  savedTimetables.update((timetables) => [...timetables, created]);
  activeTimetableIds.update((ids) => ({ ...ids, [semesterName]: created.id }));
  replaceRealAppointments([], { resetHistory: true });
  return created;
};

export const duplicateActiveTimetable = (): SavedTimetable => {
  persistActiveTimetableAppointments();
  const semesterName = get(semesterNameStore);
  const active = ensureActiveTimetable(semesterName);
  const created: SavedTimetable = {
    id: timetableId(),
    name: `${active.name} Kopie`,
    semesterName,
    appointments: [...active.appointments],
    updatedAt: new Date().toISOString()
  };
  savedTimetables.update((timetables) => [...timetables, created]);
  activeTimetableIds.update((ids) => ({ ...ids, [semesterName]: created.id }));
  replaceRealAppointments(created.appointments, { resetHistory: true });
  return created;
};

export const renameTimetable = (timetableId: string, name: string): void => {
  const trimmed = name.trim();
  if (!trimmed) return;

  savedTimetables.update((timetables) =>
    timetables.map((timetable) =>
      timetable.id === timetableId
        ? {
            ...timetable,
            name: trimmed,
            updatedAt: new Date().toISOString()
          }
        : timetable
    )
  );
};

export const deleteTimetable = (timetableId: string): void => {
  const timetables = get(savedTimetables);
  const deleted = timetables.find((timetable) => timetable.id === timetableId);
  if (!deleted || deleted.deleted) return;

  // Mark as tombstone — preserves the record so cross-device sync propagates the deletion.
  savedTimetables.update((tt) =>
    tt.map((t) =>
      t.id === timetableId
        ? { ...t, deleted: true, updatedAt: new Date().toISOString() }
        : t
    )
  );

  // Find replacement from visible (non-deleted) timetables for the same semester.
  const replacement = timetables.find(
    (t) => !t.deleted && t.id !== timetableId && t.semesterName === deleted.semesterName
  );
  if (replacement) {
    activeTimetableIds.update((ids) => ({
      ...ids,
      [deleted.semesterName]: replacement.id
    }));
    if (get(semesterNameStore) === deleted.semesterName) {
      replaceRealAppointments(replacement.appointments, { resetHistory: true });
    }
  } else {
    activeTimetableIds.update((ids) => {
      const next = { ...ids };
      delete next[deleted.semesterName];
      return next;
    });
    if (get(semesterNameStore) === deleted.semesterName) {
      replaceRealAppointments([], { resetHistory: true });
    }
  }
};
