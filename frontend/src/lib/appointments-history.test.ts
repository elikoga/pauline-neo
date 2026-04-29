import { get } from 'svelte/store';
import { describe, expect, it } from 'vitest';
import type { AppointmentCollection } from './api';

const collection = (cid: string): AppointmentCollection => ({
  cid,
  name: `Course ${cid}`,
  appointments: []
});

const loadAppointmentsModule = async () => {
  const moduleId = `./appointments?test=${crypto.randomUUID()}`;
  return import(moduleId) as Promise<typeof import('./appointments')>;
};

describe('appointment undo and redo state', () => {
  it('exposes whether undo and redo are available', async () => {
    const { canRedo, canUndo, realAppointments, redo, undo } = await loadAppointmentsModule();
    const snapshot = () => get(realAppointments).map((appointment) => appointment.cid);

    expect(get(canUndo)).toBe(false);
    expect(get(canRedo)).toBe(false);

    realAppointments.set([collection('a')]);

    expect(get(canUndo)).toBe(true);
    expect(get(canRedo)).toBe(false);

    undo();

    expect(snapshot()).toEqual([]);
    expect(get(canUndo)).toBe(false);
    expect(get(canRedo)).toBe(true);

    redo();

    expect(snapshot()).toEqual(['a']);
    expect(get(canUndo)).toBe(true);
    expect(get(canRedo)).toBe(false);
  });

  it('clears redo availability after a new edit', async () => {
    const { canRedo, canUndo, realAppointments, undo } = await loadAppointmentsModule();
    const snapshot = () => get(realAppointments).map((appointment) => appointment.cid);

    realAppointments.set([collection('a')]);
    realAppointments.set([collection('a'), collection('b')]);

    undo();
    expect(snapshot()).toEqual(['a']);
    expect(get(canRedo)).toBe(true);

    realAppointments.set([collection('a'), collection('c')]);

    expect(get(canUndo)).toBe(true);
    expect(get(canRedo)).toBe(false);
  });
});
