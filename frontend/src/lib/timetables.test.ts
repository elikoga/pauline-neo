import { describe, expect, it, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { realAppointments, undo, canUndo, canRedo } from './appointments';
import { semesterNameStore, type AppointmentCollection } from './api';
import {
  activeTimetableForSemester,
  activeTimetableIds,
  createTimetable,
  ensureActiveTimetable,
  persistActiveTimetableAppointments,
  migrateLocalActiveTimetableIds,
  migrateLocalTimetables,
  savedTimetables,
  switchTimetable
} from './timetables';

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

describe('timetables', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageStub);
    localStorage.clear();
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

  it('migrates old single localStorage appointments into a saved timetable', () => {
    localStorage.clear();
    localStorage.setItem('appointments', JSON.stringify([appointment('Legacy Plan')]));

    const timetables = migrateLocalTimetables();
    const activeIds = migrateLocalActiveTimetableIds();

    expect(timetables).toHaveLength(1);
    expect(timetables[0].name).toBe('Sommer 2026 – Stundenplan');
    expect(timetables[0].appointments.map((entry) => entry.name)).toEqual(['Legacy Plan']);
    expect(activeIds).toEqual({ 'Sommer 2026': timetables[0].id });
  });

  it('migrates old calendar candidate localStorage keys to timetable keys', () => {
    localStorage.clear();
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

    expect(migrateLocalTimetables()).toEqual([oldTimetable]);
    expect(migrateLocalActiveTimetableIds()).toEqual({ 'Winter 2025/26': 'old-candidate' });
    expect(JSON.parse(localStorage.getItem('timetables')!)).toEqual([oldTimetable]);
    expect(JSON.parse(localStorage.getItem('activeTimetableIds')!)).toEqual({
      'Winter 2025/26': 'old-candidate'
    });
  });
});
