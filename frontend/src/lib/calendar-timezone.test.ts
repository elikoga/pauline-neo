import { describe, expect, it } from 'vitest';
import icalGenerator from 'ical-generator';
import { appointmentCollectionEvents, calendarTimezone } from './calendar';
import type { AppointmentCollection } from './api';

const collection: AppointmentCollection = {
  cid: 'L.123.45678',
  name: 'Übung zur Zeitplanung',
  description: '',
  small_groups: [],
  appointments: [
    {
      start_time: '2026-04-20T10:00:00.000+02:00',
      end_time: '2026-04-20T12:00:00.000+02:00',
      room: 'P1.1.01',
      instructors: 'Ada Lovelace'
    }
  ]
};

describe('calendar timezone export', () => {
  it('includes a VTIMEZONE component for Europe/Berlin TZID values', () => {
    const calendarText = icalGenerator({
      name: 'Pauline Export',
      timezone: calendarTimezone,
      events: appointmentCollectionEvents(collection)
    }).toString();

    expect(calendarText).toContain('BEGIN:VTIMEZONE');
    expect(calendarText).toContain('TZID:Europe/Berlin');
    expect(calendarText).toContain('DTSTART;TZID=Europe/Berlin');
  });
});
