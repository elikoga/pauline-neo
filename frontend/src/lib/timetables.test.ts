import { describe, expect, it, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { realAppointments, undo, canUndo, canRedo } from './appointments';
import { semesterNameStore, type AppointmentCollection } from './api';
import {
  activeTimetableForSemester,
  activeTimetableIds,
  createTimetable,
  ensureActiveTimetable,
  mergeActiveIds,
  mergeTimetables,
  persistActiveTimetableAppointments,
  savedTimetables,
  switchTimetable
} from './timetables';
import { runMigrations, CURRENT_VERSION } from './localStorageMigrations';

const appointment = (name: string): AppointmentCollection => ({
  cid: `L.${name}`,
  name,
  description: '',
  small_groups: [],
  appointments: []
});

const localStorageStore = new Map<string, string>();

const localStorageStub: Storage = {
  get length() {
    return localStorageStore.size;
  },
  clear: () => localStorageStore.clear(),
  getItem: (key: string) => localStorageStore.get(key) ?? null,
  key: (index: number) => Array.from(localStorageStore.keys())[index] ?? null,
  removeItem: (key: string) => {
    localStorageStore.delete(key);
  },
  setItem: (key: string, value: string) => {
    localStorageStore.set(key, value);
  }
};

const readMigratedTimetables = () =>
  JSON.parse(localStorage.getItem('timetables')!);
const readMigratedActiveIds = () =>
  JSON.parse(localStorage.getItem('activeTimetableIds')!);

describe('timetables', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageStub);
    localStorage.clear();
    // Reset version so migrations re-run on each test.
    localStorage.removeItem('paulineStorageVersion');
    savedTimetables.set([]);
    activeTimetableIds.set({});
    realAppointments.set([]);
    semesterNameStore.set('Sommer 2026');
  });

  it('starts a separate empty timetable without overwriting the current timetable', () => {
    realAppointments.set([appointment('Plan A')]);
    const first = ensureActiveTimetable('Sommer 2026');

    const second = createTimetable('Alternative B');

    expect(first.appointments.map((entry) => entry.name)).toEqual(['Plan A']);
    expect(second.name).toBe('Alternative B');
    expect(get(savedTimetables)).toHaveLength(2);
    expect(get(realAppointments)).toEqual([]);
  });

  it('switches between timetables and restores their appointments', () => {
    realAppointments.set([appointment('Plan A')]);
    const first = ensureActiveTimetable('Sommer 2026');
    createTimetable('Alternative B');
    realAppointments.set([appointment('Plan B')]);
    persistActiveTimetableAppointments();
    const second = activeTimetableForSemester('Sommer 2026');

    switchTimetable(first.id);
    expect(get(realAppointments).map((entry) => entry.name)).toEqual(['Plan A']);

    switchTimetable(second!.id);
    expect(get(realAppointments).map((entry) => entry.name)).toEqual(['Plan B']);
    expect(activeTimetableForSemester('Sommer 2026')?.id).toBe(second!.id);
  });

  it('switches to the saved timetable semester when opening another semester', () => {
    realAppointments.set([appointment('Sommer Plan')]);
    ensureActiveTimetable('Sommer 2026');
    semesterNameStore.set('Winter 2025/26');
    realAppointments.set([appointment('Winter Plan')]);
    const winter = ensureActiveTimetable('Winter 2025/26');
    persistActiveTimetableAppointments();
    semesterNameStore.set('Sommer 2026');
    realAppointments.set([appointment('Sommer Plan')]);

    switchTimetable(winter.id);

    expect(get(semesterNameStore)).toBe('Winter 2025/26');
    expect(get(realAppointments).map((entry) => entry.name)).toEqual(['Winter Plan']);
  });

  it('resets undo and redo history when switching timetables', () => {
    realAppointments.set([appointment('Plan A')]);
    const first = ensureActiveTimetable('Sommer 2026');
    createTimetable('Alternative B');
    realAppointments.set([appointment('Plan B')]);
    persistActiveTimetableAppointments();

    realAppointments.set([appointment('Plan B'), appointment('Unsaved change')]);
    expect(get(canUndo)).toBe(true);

    switchTimetable(first.id);

    expect(get(realAppointments).map((entry) => entry.name)).toEqual(['Plan A']);
    expect(get(canUndo)).toBe(false);
    expect(get(canRedo)).toBe(false);
    undo();
    expect(get(realAppointments).map((entry) => entry.name)).toEqual(['Plan A']);
  });

  describe('mergeTimetables', () => {
    const makeTimetable = (
      id: string,
      name: string,
      semester: string,
      updatedAt: string
    ) => ({
      id,
      name,
      semesterName: semester,
      appointments: [],
      updatedAt
    });

    it('preserves all timetables from both sides', () => {
      const local = [makeTimetable('a', 'Plan A', 'Sommer 2026', '2026-04-01T00:00:00Z')];
      const server = [makeTimetable('b', 'Plan B', 'Winter 2025/26', '2026-04-02T00:00:00Z')];

      const result = mergeTimetables(local, server);

      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual(expect.arrayContaining(['a', 'b']));
    });

    it('keeps the newer version when same ID exists on both sides', () => {
      const local = makeTimetable('x', 'Old', 'Sommer 2026', '2026-04-01T00:00:00Z');
      const server = makeTimetable('x', 'New', 'Sommer 2026', '2026-04-03T00:00:00Z');

      const result = mergeTimetables([local], [server]);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('New');
    });

    it('keeps local when it is newer than server for same ID', () => {
      const local = makeTimetable('x', 'Fresh', 'Sommer 2026', '2026-04-05T00:00:00Z');
      const server = makeTimetable('x', 'Stale', 'Sommer 2026', '2026-04-01T00:00:00Z');

      const result = mergeTimetables([local], [server]);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Fresh');
    });

    it('handles empty inputs', () => {
      expect(mergeTimetables([], [])).toEqual([]);
      expect(mergeTimetables([], [makeTimetable('a', 'A', 'S', '2026-01-01T00:00:00Z')])).toHaveLength(1);
      expect(mergeTimetables([makeTimetable('a', 'A', 'S', '2026-01-01T00:00:00Z')], [])).toHaveLength(1);
    });
  });

  describe('mergeActiveIds', () => {
    it('server overrides local for same semester', () => {
      const local = { 'Sommer 2026': 'local-id', 'Winter 2025/26': 'winter-local' };
      const server = { 'Sommer 2026': 'server-id' };

      const result = mergeActiveIds(local, server);

      expect(result).toEqual({
        'Sommer 2026': 'server-id',
        'Winter 2025/26': 'winter-local'
      });
    });

    it('preserves semesters only on one side', () => {
      const local = { 'Sommer 2026': 'a' };
      const server = { 'Winter 2025/26': 'b' };

      const result = mergeActiveIds(local, server);

      expect(result).toEqual({ 'Sommer 2026': 'a', 'Winter 2025/26': 'b' });
    });
  });

  describe('versioned migration (0 → 1)', () => {
    it('stamps the version key after migration', () => {
      localStorage.setItem('appointments', JSON.stringify([appointment('X')]));
      expect(localStorage.getItem('paulineStorageVersion')).toBeNull();

      runMigrations();

      expect(localStorage.getItem('paulineStorageVersion')).toBe(String(CURRENT_VERSION));
    });

    it('migrates legacy appointments into a timetable without deleting the appointments key', () => {
      const legacy = [appointment('Vorlesung A'), appointment('Übung B')];
      localStorage.setItem('appointments', JSON.stringify(legacy));

      runMigrations();

      const timetables = readMigratedTimetables();
      expect(timetables).toHaveLength(1);
      expect(timetables[0].appointments.map((a: { name: string }) => a.name)).toEqual([
        'Vorlesung A',
        'Übung B'
      ]);

      // The original 'appointments' key is still intact as a backup.
      const backup = JSON.parse(localStorage.getItem('appointments')!);
      expect(backup).toHaveLength(2);
      expect(backup[0].name).toBe('Vorlesung A');
    });

    it('does not re-migrate when version is already current', () => {
      localStorage.setItem('appointments', JSON.stringify([appointment('First')]));
      runMigrations();

      const firstTimetable = readMigratedTimetables();

      // Change the appointments key — should NOT affect timetables.
      localStorage.setItem('appointments', JSON.stringify([appointment('Second')]));
      runMigrations();

      expect(readMigratedTimetables()).toEqual(firstTimetable);
    });

    it('preserves realAppointments from the appointments key after migration', () => {
      const legacy = [appointment('Bestand')];
      localStorage.setItem('appointments', JSON.stringify(legacy));

      runMigrations();

      // realAppointments is backed by 'appointments' key — still has the data.
      const stored = JSON.parse(localStorage.getItem('appointments')!);
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('Bestand');
    });

    it('migrates calendarCandidates into timetables', () => {
      const oldTimetable = {
        id: 'old-candidate',
        name: 'Alter Plan',
        semesterName: 'Winter 2025/26',
        appointments: [appointment('Legacy Candidate')],
        updatedAt: '2026-04-29T00:00:00.000Z'
      };
      localStorage.setItem('calendarCandidates', JSON.stringify([oldTimetable]));
      localStorage.setItem(
        'activeCalendarCandidateIds',
        JSON.stringify({ 'Winter 2025/26': 'old-candidate' })
      );

      runMigrations();

      expect(readMigratedTimetables()).toEqual([oldTimetable]);
      expect(readMigratedActiveIds()).toEqual({ 'Winter 2025/26': 'old-candidate' });
    });

    it('migrates per-semester data from appointmentsSemesterStore into separate timetables', () => {
      // Simulate the LocalStorageMap format used by main's SemesterSelector.
      const semesterStore = {
        map: {
          dataType: 'Map',
          value: [
            ['"Winter 2025/26"', [appointment('Winter Kurs')]],
            ['"Sommer 2025"', [appointment('Sommer Kurs')]]
          ]
        }
      };
      localStorage.setItem('appointmentsSemesterStore', JSON.stringify(semesterStore));
      localStorage.setItem('appointments', JSON.stringify([appointment('Aktuell')]));

      runMigrations();

      const timetables = readMigratedTimetables();
      // Should have 3 timetables: 2 from semester store + 1 from current appointments.
      expect(timetables).toHaveLength(3);
      const semesters = timetables.map((t: { semesterName: string }) => t.semesterName);
      expect(semesters).toContain('Winter 2025/26');
      expect(semesters).toContain('Sommer 2025');
      expect(semesters).toContain('Sommer 2026');

      const winter = timetables.find((t: { semesterName: string }) => t.semesterName === 'Winter 2025/26');
      expect(winter!.appointments.map((a: { name: string }) => a.name)).toEqual(['Winter Kurs']);

      const summer = timetables.find((t: { semesterName: string }) => t.semesterName === 'Sommer 2025');
      expect(summer!.appointments.map((a: { name: string }) => a.name)).toEqual(['Sommer Kurs']);

      // The appointments key is still intact.
      expect(JSON.parse(localStorage.getItem('appointments')!)).toHaveLength(1);
    });

    it('migrates appointmentsSemesterStore without duplicating the current semester', () => {
      const semesterStore = {
        map: {
          dataType: 'Map',
          value: [['"Sommer 2026"', [appointment('Sommer Daten')]]]
        }
      };
      localStorage.setItem('appointmentsSemesterStore', JSON.stringify(semesterStore));
      localStorage.setItem('appointments', JSON.stringify([appointment('Sommer Aktuell')]));

      runMigrations();

      const timetables = readMigratedTimetables();
      const summerTimetables = timetables.filter(
        (t: { semesterName: string }) => t.semesterName === 'Sommer 2026'
      );
      expect(summerTimetables).toHaveLength(1);
    });
  });
});
