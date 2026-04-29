import { get } from 'svelte/store';
import type { AppointmentCollection } from './api';
import { semesterNameStore } from './api';
import { realAppointments, replaceRealAppointments } from './appointments';
import { writableLocalStorageStore } from './localStorageStore';
import { authState } from './auth';
import { loadPersistedCalendar, savePersistedCalendar } from './calendarPersistence';

export type SavedTimetable = {
  id: string;
  name: string;
  semesterName: string;
  appointments: AppointmentCollection[];
  updatedAt: string;
};

const timetableId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `timetable-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const defaultTimetableNameFor = (semesterName: string, timetables: SavedTimetable[]): string => {
  const semesterTimetables = timetables.filter(
    (timetable) => timetable.semesterName === semesterName
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

const writeLocalStorageJson = (key: string, value: unknown): void => {
  if (typeof localStorage === 'undefined') return;

  localStorage.setItem(key, JSON.stringify(value));
};

const legacyAppointments = (): AppointmentCollection[] =>
  readLocalStorageJson<AppointmentCollection[]>('appointments') ?? [];

export const migrateLocalTimetables = (): SavedTimetable[] => {
  const existing = readLocalStorageJson<SavedTimetable[]>('timetables');
  if (existing && existing.length > 0) return existing;

  const legacyCandidates = readLocalStorageJson<SavedTimetable[]>('calendarCandidates');
  if (legacyCandidates && legacyCandidates.length > 0) {
    writeLocalStorageJson('timetables', legacyCandidates);
    return legacyCandidates;
  }

  const appointments = legacyAppointments();
  if (appointments.length === 0) return [];

  const semesterName = get(semesterNameStore);
  const migrated: SavedTimetable = {
    id: timetableId(),
    name: defaultTimetableNameFor(semesterName, []),
    semesterName,
    appointments,
    updatedAt: new Date().toISOString()
  };
  writeLocalStorageJson('timetables', [migrated]);
  writeLocalStorageJson('activeTimetableIds', { [semesterName]: migrated.id });
  return [migrated];
};

export const migrateLocalActiveTimetableIds = (): Record<string, string> => {
  const existing = readLocalStorageJson<Record<string, string>>('activeTimetableIds');
  if (existing && Object.keys(existing).length > 0) return existing;

  const legacyActiveIds = readLocalStorageJson<Record<string, string>>(
    'activeCalendarCandidateIds'
  );
  if (legacyActiveIds && Object.keys(legacyActiveIds).length > 0) {
    writeLocalStorageJson('activeTimetableIds', legacyActiveIds);
    return legacyActiveIds;
  }

  const timetables = readLocalStorageJson<SavedTimetable[]>('timetables') ?? [];
  const ids = Object.fromEntries(
    timetables.map((timetable) => [timetable.semesterName, timetable.id])
  );
  if (Object.keys(ids).length > 0) writeLocalStorageJson('activeTimetableIds', ids);
  return ids;
};

export const savedTimetables = writableLocalStorageStore<SavedTimetable[]>(
  'timetables',
  100,
  migrateLocalTimetables()
);

export const activeTimetableIds = writableLocalStorageStore<Record<string, string>>(
  'activeTimetableIds',
  100,
  migrateLocalActiveTimetableIds()
);
let loadedAccountId: number | null = null;
let applyingPersistedState = false;
let savePersistedStateTimer: NodeJS.Timeout | undefined;

const persistStateForAccount = (): void => {
  if (applyingPersistedState || !get(authState).token) return;

  if (savePersistedStateTimer) {
    clearTimeout(savePersistedStateTimer);
  }

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

authState.subscribe(async ($authState) => {
  const accountId = $authState.account?.id ?? null;
  if (!accountId || !$authState.token) {
    loadedAccountId = null;
    return;
  }
  if (loadedAccountId === accountId) return;

  loadedAccountId = accountId;
  try {
    const persistedState = await loadPersistedCalendar();
    if (!persistedState) return;

    applyingPersistedState = true;
    savedTimetables.set(persistedState.timetables);
    activeTimetableIds.set(persistedState.activeTimetableIds);
    const active = activeTimetableForSemester(get(semesterNameStore));
    replaceRealAppointments(active?.appointments ?? [], { resetHistory: true });
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
): SavedTimetable[] => timetables.filter((timetable) => timetable.semesterName === semesterName);

export const activeTimetableIdForSemester = (semesterName: string): string | undefined =>
  get(activeTimetableIds)[semesterName];

export const activeTimetableForSemester = (semesterName: string): SavedTimetable | undefined => {
  const activeId = activeTimetableIdForSemester(semesterName);
  return get(savedTimetables).find(
    (timetable) => timetable.semesterName === semesterName && timetable.id === activeId
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
  if (!deleted) return;

  const remaining = timetables.filter((timetable) => timetable.id !== timetableId);
  savedTimetables.set(remaining);

  const replacement = timetablesForSemester(remaining, deleted.semesterName)[0];
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
