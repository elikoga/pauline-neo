import { describe, expect, it } from 'vitest';
import icalGenerator from 'ical-generator';
import ical from 'ical.js';
import { appointmentCollectionEvents } from './calendar';
import type { AppointmentCollection } from './api';

const collection = (
  appointments: AppointmentCollection['appointments']
): AppointmentCollection => ({
  cid: 'L.123.45678',
  name: 'Testveranstaltung',
  appointments,
  description: '',
  small_groups: []
});

const serializeEvents = (appointments: AppointmentCollection['appointments']): string => {
  return icalGenerator({
    name: 'Test',
    timezone: 'Europe/Berlin',
    events: appointmentCollectionEvents(collection(appointments))
  }).toString();
};

describe('appointmentCollectionEvents', () => {
  it('exports equal weekly appointments as a recurring event', () => {
    const events = appointmentCollectionEvents(
      collection([
        {
          start_time: '2026-04-20T10:00:00.000+02:00',
          end_time: '2026-04-20T12:00:00.000+02:00',
          room: 'P1.1.01',
          instructors: 'Ada Lovelace'
        },
        {
          start_time: '2026-04-27T10:00:00.000+02:00',
          end_time: '2026-04-27T12:00:00.000+02:00',
          room: 'P1.1.01',
          instructors: 'Ada Lovelace'
        },
        {
          start_time: '2026-05-04T10:00:00.000+02:00',
          end_time: '2026-05-04T12:00:00.000+02:00',
          room: 'P1.1.01',
          instructors: 'Ada Lovelace'
        }
      ])
    );

    expect(events).toHaveLength(1);
    expect(events[0].repeating).toMatchObject({ freq: 'WEEKLY', count: 3 });

    const calendar = ical.parse(
      serializeEvents([
        {
          start_time: '2026-04-20T10:00:00.000+02:00',
          end_time: '2026-04-20T12:00:00.000+02:00',
          room: 'P1.1.01',
          instructors: 'Ada Lovelace'
        },
        {
          start_time: '2026-04-27T10:00:00.000+02:00',
          end_time: '2026-04-27T12:00:00.000+02:00',
          room: 'P1.1.01',
          instructors: 'Ada Lovelace'
        }
      ])
    );
    const vevent = calendar[2][0] as unknown[];
    const properties = vevent[1] as unknown[];
    const rrule = properties.find(
      (entry) => Array.isArray(entry) && entry[0] === 'rrule'
    ) as unknown[];
    expect(rrule[3]).toMatchObject({ freq: 'WEEKLY', count: 2 });
  });

  it('creates separate weekly series for different weekdays in the same course', () => {
    const events = appointmentCollectionEvents(
      collection([
        {
          start_time: '2026-04-20T10:00:00.000+02:00',
          end_time: '2026-04-20T12:00:00.000+02:00',
          room: 'P1.1.01',
          instructors: 'Ada Lovelace'
        },
        {
          start_time: '2026-04-21T10:00:00.000+02:00',
          end_time: '2026-04-21T12:00:00.000+02:00',
          room: 'P1.1.01',
          instructors: 'Ada Lovelace'
        },
        {
          start_time: '2026-04-27T10:00:00.000+02:00',
          end_time: '2026-04-27T12:00:00.000+02:00',
          room: 'P1.1.01',
          instructors: 'Ada Lovelace'
        },
        {
          start_time: '2026-04-28T10:00:00.000+02:00',
          end_time: '2026-04-28T12:00:00.000+02:00',
          room: 'P1.1.01',
          instructors: 'Ada Lovelace'
        }
      ])
    );

    expect(events).toHaveLength(2);
    expect(events.map((event) => event.repeating)).toEqual([
      expect.objectContaining({ freq: 'WEEKLY', interval: 1, count: 2 }),
      expect.objectContaining({ freq: 'WEEKLY', interval: 1, count: 2 })
    ]);
  });

  it('keeps appointments separate when room or time differs', () => {
    const events = appointmentCollectionEvents(
      collection([
        {
          start_time: '2026-04-20T10:00:00.000+02:00',
          end_time: '2026-04-20T12:00:00.000+02:00',
          room: 'P1.1.01',
          instructors: 'Ada Lovelace'
        },
        {
          start_time: '2026-04-27T10:00:00.000+02:00',
          end_time: '2026-04-27T12:00:00.000+02:00',
          room: 'P1.1.02',
          instructors: 'Ada Lovelace'
        },
        {
          start_time: '2026-05-04T14:00:00.000+02:00',
          end_time: '2026-05-04T16:00:00.000+02:00',
          room: 'P1.1.01',
          instructors: 'Ada Lovelace'
        }
      ])
    );

    expect(events).toHaveLength(3);
    expect(events.every((event) => event.repeating === undefined)).toBe(true);
  });

  it('exports biweekly appointments with a two-week interval', () => {
    const events = appointmentCollectionEvents(
      collection([
        {
          start_time: '2026-04-20T10:00:00.000+02:00',
          end_time: '2026-04-20T12:00:00.000+02:00',
          room: 'P1.1.01',
          instructors: 'Ada Lovelace'
        },
        {
          start_time: '2026-05-04T10:00:00.000+02:00',
          end_time: '2026-05-04T12:00:00.000+02:00',
          room: 'P1.1.01',
          instructors: 'Ada Lovelace'
        },
        {
          start_time: '2026-05-18T10:00:00.000+02:00',
          end_time: '2026-05-18T12:00:00.000+02:00',
          room: 'P1.1.01',
          instructors: 'Ada Lovelace'
        }
      ])
    );

    expect(events).toHaveLength(1);
    expect(events[0].repeating).toMatchObject({ freq: 'WEEKLY', interval: 2, count: 3 });
    expect(events[0].repeating).not.toHaveProperty('exclude');
  });

  it('uses exclusions for missing weeks inside a series', () => {
    const events = appointmentCollectionEvents(
      collection([
        {
          start_time: '2026-04-20T10:00:00.000+02:00',
          end_time: '2026-04-20T12:00:00.000+02:00',
          room: 'P1.1.01',
          instructors: 'Ada Lovelace'
        },
        {
          start_time: '2026-05-11T10:00:00.000+02:00',
          end_time: '2026-05-11T12:00:00.000+02:00',
          room: 'P1.1.01',
          instructors: 'Ada Lovelace'
        }
      ])
    );

    expect(events).toHaveLength(1);
    expect(events[0].repeating).toMatchObject({ freq: 'WEEKLY', count: 4 });
    expect(events[0].repeating).toHaveProperty('exclude');

    const calendar = serializeEvents([
      {
        start_time: '2026-04-20T10:00:00.000+02:00',
        end_time: '2026-04-20T12:00:00.000+02:00',
        room: 'P1.1.01',
        instructors: 'Ada Lovelace'
      },
      {
        start_time: '2026-05-11T10:00:00.000+02:00',
        end_time: '2026-05-11T12:00:00.000+02:00',
        room: 'P1.1.01',
        instructors: 'Ada Lovelace'
      }
    ]);
    expect(calendar).toContain('EXDATE');
  });
});
