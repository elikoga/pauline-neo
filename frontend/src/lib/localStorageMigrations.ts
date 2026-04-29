// Versioned localStorage migration system.
//
// Each page load checks a `paulineStorageVersion` key in localStorage.
// If the stored version is behind CURRENT_VERSION, migrations run in order
// (0→1, 1→2, …) to bring localStorage up to date.
//
// New installs get CURRENT_VERSION stamped immediately — no migrations run.
// Legacy installs (no version key) start at version 0.

import { get } from 'svelte/store';
import type { AppointmentCollection } from './api';
import { semesterNameStore } from './api';

// Local copy of SavedTimetable to avoid circular import with timetables.ts.
type SavedTimetable = {
  id: string;
  name: string;
  semesterName: string;
  appointments: AppointmentCollection[];
  updatedAt: string;
};

export const CURRENT_VERSION = 1;

const VERSION_KEY = 'paulineStorageVersion';

const readJson = <T>(key: string): T | undefined => {
  if (typeof localStorage === 'undefined') return undefined;
  const raw = localStorage.getItem(key);
  if (raw === null) return undefined;
  return JSON.parse(raw) as T;
};

const writeJson = (key: string, value: unknown): void => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
};

const timetableId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `timetable-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

// --- Migration 0 → 1 --------------------------------------------------------
// Handles all pre-versioned formats:
//   - 'calendarCandidates' → 'timetables' (rename)
//   - 'activeCalendarCandidateIds' → 'activeTimetableIds' (rename)
//   - 'appointments' → wrap in a single timetable
//   - 'appointmentsSemesterStore' → one timetable per semester
//
// None of the legacy keys are deleted — they remain as live backups.

const migrate0to1 = (): void => {
  // If timetables already exist (from an earlier partial migration), skip.
  const existing = readJson<SavedTimetable[]>('timetables');
  if (existing && existing.length > 0) {
    migrateActiveIds0to1();
    return;
  }

  // If calendarCandidates exists, just rename.
  const candidates = readJson<SavedTimetable[]>('calendarCandidates');
  if (candidates && candidates.length > 0) {
    writeJson('timetables', candidates);
    migrateActiveIds0to1();
    return;
  }

  // Build timetables from legacy main-branch data.
  const semesterMap = parseLegacySemesterStore();
  const currentAppointments = readJson<AppointmentCollection[]>('appointments') ?? [];
  const currentSemester = get(semesterNameStore);

  if (currentAppointments.length > 0 && !semesterMap.has(currentSemester)) {
    semesterMap.set(currentSemester, currentAppointments);
  }

  if (semesterMap.size === 0) return;

  const timetables: SavedTimetable[] = [];
  const activeIds: Record<string, string> = {};
  for (const [semesterName, appointments] of semesterMap) {
    const id = timetableId();
    timetables.push({
      id,
      name: `${semesterName} – Stundenplan`,
      semesterName,
      appointments,
      updatedAt: new Date().toISOString()
    });
    activeIds[semesterName] = id;
  }

  writeJson('timetables', timetables);
  writeJson('activeTimetableIds', activeIds);
};

const migrateActiveIds0to1 = (): void => {
  const existing = readJson<Record<string, string>>('activeTimetableIds');
  if (existing && Object.keys(existing).length > 0) return;

  const legacy = readJson<Record<string, string>>('activeCalendarCandidateIds');
  if (legacy && Object.keys(legacy).length > 0) {
    writeJson('activeTimetableIds', legacy);
    return;
  }

  const timetables = readJson<SavedTimetable[]>('timetables') ?? [];
  const ids = Object.fromEntries(
    timetables.map((timetable) => [timetable.semesterName, timetable.id])
  );
  if (Object.keys(ids).length > 0) writeJson('activeTimetableIds', ids);
};

// Parse the legacy 'appointmentsSemesterStore' localStorage key.
// On main, SemesterSelector stored per-semester appointments as a LocalStorageMap
// with format: {"map":{"dataType":"Map","value":[["\"Semester\"", [...]], ...]}}
const parseLegacySemesterStore = (): Map<string, AppointmentCollection[]> => {
  const result = new Map<string, AppointmentCollection[]>();
  const raw = readJson<{
    map?: { dataType?: string; value?: [string, AppointmentCollection[]][] };
  }>('appointmentsSemesterStore');
  if (!raw?.map || raw.map.dataType !== 'Map' || !Array.isArray(raw.map.value)) return result;
  for (const [key, appointments] of raw.map.value) {
    try {
      const semesterName = JSON.parse(key);
      if (
        typeof semesterName === 'string' &&
        Array.isArray(appointments) &&
        appointments.length > 0
      ) {
        result.set(semesterName, appointments);
      }
    } catch {
      // malformed key, skip
    }
  }
  return result;
};

// --- Migration runner --------------------------------------------------------

const migrations: Array<{ from: number; to: number; migrate: () => void }> = [
  { from: 0, to: 1, migrate: migrate0to1 }
];

export const getStorageVersion = (): number => {
  if (typeof localStorage === 'undefined') return CURRENT_VERSION;
  const raw = localStorage.getItem(VERSION_KEY);
  if (raw === null) return 0;
  const v = Number(raw);
  return Number.isFinite(v) ? v : 0;
};

export const runMigrations = (): void => {
  if (typeof localStorage === 'undefined') return;
  let version = getStorageVersion();

  for (const migration of migrations) {
    if (version === migration.from) {
      migration.migrate();
      version = migration.to;
    }
  }

  localStorage.setItem(VERSION_KEY, String(CURRENT_VERSION));
};
