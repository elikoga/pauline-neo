import { describe, expect, it } from 'vitest';
import icalGenerator from 'ical-generator';
import ical from 'ical.js';
import { appointmentCollectionEvents } from './calendar';
import type {
  AppointmentCollection,
  CourseWithSmallGroupBackrefs,
  CourseWithoutAppointments,
  SemesterWithoutCoursesButId
} from './api';

const apiBase = process.env.PAULINE_REAL_API_BASE;
const sampleSize = Number(process.env.PAULINE_REAL_API_SAMPLE_SIZE ?? '160');

const getJson = async <T>(path: string): Promise<T> => {
  if (!apiBase) throw new Error('PAULINE_REAL_API_BASE is not set');
  const base = apiBase.endsWith('/') ? apiBase : `${apiBase}/`;
  const response = await fetch(new URL(path.replace(/^\//, ''), base));
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${path}`);
  return (await response.json()) as T;
};

const hasStructuredRepeating = (
  event: ReturnType<typeof appointmentCollectionEvents>[number]
): event is ReturnType<typeof appointmentCollectionEvents>[number] & {
  repeating: { interval?: number };
} => Boolean(event.repeating && typeof event.repeating !== 'string' && 'freq' in event.repeating);

const loadCollectionsFromApi = async (): Promise<AppointmentCollection[]> => {
  const semesters = await getJson<SemesterWithoutCoursesButId[]>('/semesters/newest');
  const newestSemester = semesters.at(-1);
  if (!newestSemester) throw new Error('API returned no semesters');

  const courses = await getJson<CourseWithoutAppointments[]>(
    `/courses/all?semesterId=${newestSemester.id}`
  );
  const fullCourses = await Promise.all(
    courses
      .slice(0, sampleSize)
      .map((course) =>
        getJson<CourseWithSmallGroupBackrefs>(
          `/courses/${encodeURIComponent(course.cid)}?semesterId=${newestSemester.id}`
        )
      )
  );

  return fullCourses.flatMap((course) => [course, ...course.small_groups]);
};

describe.skipIf(!apiBase)('calendar export with real API data', () => {
  it('serializes recurrence rules for real appointments from the live API', async () => {
    const collections = (await loadCollectionsFromApi()).filter(
      (collection) => collection.appointments.length > 0
    );
    const events = collections.flatMap(appointmentCollectionEvents);
    const recurringEvents = events.filter(hasStructuredRepeating);
    const biweeklyEvents = recurringEvents.filter((event) => event.repeating.interval === 2);

    expect(collections.length).toBeGreaterThan(0);
    expect(events.length).toBeGreaterThan(0);
    expect(recurringEvents.length).toBeGreaterThan(0);

    const calendarText = icalGenerator({
      name: 'Pauline Real Data Test',
      timezone: 'Europe/Berlin',
      events
    }).toString();
    const parsed = ical.parse(calendarText);

    expect(parsed[0]).toBe('vcalendar');
    expect(calendarText).toContain('RRULE');

    console.log(
      JSON.stringify({
        collections: collections.length,
        events: events.length,
        recurringEvents: recurringEvents.length,
        biweeklyEvents: biweeklyEvents.length
      })
    );
  }, 30_000);
});
