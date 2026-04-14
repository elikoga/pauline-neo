import { makeAvaliableJsonStringifyMap, makeAvaliableMap } from './LocalStorageMap';

import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import { writableLocalStorageStore } from './localStorageStore';

export const semesterNameStore = writableLocalStorageStore('semesterName', 100, 'Sommer 2022');

let semesterName: string;

semesterNameStore.subscribe((newValue) => {
  semesterName = newValue;
});

let semesterId: number | undefined;
export let semesterResponse: SemesterWithoutCoursesButId[] | undefined;

export const getSemesters = async (): Promise<SemesterWithoutCoursesButId[]> => {
  if (!browser) return [];
  // check if semesterResponse is populated, if so return it
  if (semesterResponse) {
    return semesterResponse;
  }
  const url = getUrl();
  url.pathname += '/semesters/newest';
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  const semesters = (await response.json()) as SemesterWithoutCoursesButId[];
  // if the semesterId is still undefined, just choose the last one
  if (semesterId === undefined) {
    semesterNameStore.set(semesters[semesters.length - 1].name);
    semesterId = semesters[semesters.length - 1].id;
    console.log(`Setting semesterId to ${semesterId}`);
  }
  // set value to semesterResponse
  semesterResponse = semesters;
  return semesters;
};

export const getSemesterId = async (): Promise<number> => {
  if (semesterId == undefined) {
    // run getSemesters() to update the semesterName
    await getSemesters();
    return semesterId as unknown as number;
  }
  return semesterId;
};

const getUrl = () => {
  const url = import.meta.env.VITE_PAULINE_API;
  console.log(`I got the url: ${url}`);
  // our assertion is that this is set. If it isn't please set up
  // your environment variables.
  if (!url || url === true) {
    throw new Error('VITE_PAULINE_API is not set');
  }
  // in development, our URL may be an absolute path.
  // in production it is a relative path mostly but some
  // production environments may be absolute
  if (!url.startsWith('/')) {
    // not a relative path, so we assume it is absolute
    return new URL(url);
  }
  // relative path, so we assume it is relative to the root of the
  // current domain.
  // we can't prerender this, so we need to assert that
  // we aren't on the server but the browser
  if (!browser) {
    // return http://0.0.0.0/
    return new URL('/', 'http://0.0.0.0');
    throw new Error(
      'VITE_PAULINE_API is relative but we are not on the browser, my assumptions were wrong'
    );
  }

  // we are on the browser, so we can use the current origin
  // to construct the absolute URL
  const origin = new URL(url, window.location.origin); // see relative construction
  return origin;
};

const searchResultsCache = makeAvaliableJsonStringifyMap<
  {
    title?: string;
    semesterId: number;
  },
  string[]
>('searchResultsCacheNew'); // title -> cid[]

export const cidCoursesCache = makeAvaliableJsonStringifyMap<
  {
    cid: string;
    semesterName: string;
  },
  CourseWithoutAppointments
>('cidCoursesCacheNew'); // cid -> course

export const getCourses = async (signal?: AbortSignal): Promise<CourseWithoutAppointments[]> => {
  if (!browser) return [];
  const semesterId = await getSemesterId();
  const cacheKey = { semesterId };
  console.log(`Getting courses for semester ${semesterId}, name ${semesterName}`);
  if (searchResultsCache.has(cacheKey)) {
    const cids = searchResultsCache.get(cacheKey) as string[];
    freshCourseCids.update((prev) => ({ ...prev, [semesterName]: new Set(cids) }));
    return cids
      .map((cid) => cidCoursesCache.get({ cid, semesterName }))
      .flatMap((x) => (x ? [x] : []));
  }
  const url = getUrl();
  url.pathname += '/courses/all';
  url.searchParams.append('semesterId', semesterId.toString());
  const response = await fetch(url.toString(), { signal: signal || undefined });
  if (!response.ok) {
    throw await response.json();
  }
  const courses = await response.json();
  // add to cache
  const newCourses = courses.filter(
    (course: CourseWithoutAppointments) => !cidCoursesCache.has({ cid: course.cid, semesterName })
  );
  newCourses.forEach((course: CourseWithoutAppointments) =>
    cidCoursesCache.set(
      {
        cid: course.cid,
        semesterName
      },
      course
    )
  );
  searchResultsCache.set(
    cacheKey,
    courses.map((course: CourseWithoutAppointments) => course.cid)
  );
  freshCourseCids.update((prev) => ({
    ...prev,
    [semesterName]: new Set(courses.map((c: CourseWithoutAppointments) => c.cid))
  }));
  return courses;
};

const courseCache = makeAvaliableJsonStringifyMap<
  { course_id: string; semesterId: number },
  CourseWithSmallGroupBackrefs
>('courseCache');

export const getCourse = async (course_id: string): Promise<CourseWithSmallGroupBackrefs> => {
  const semesterId = await getSemesterId();
  const cacheKey = { course_id, semesterId };
  if (courseCache.has(cacheKey)) {
    return courseCache.get(cacheKey) as CourseWithSmallGroupBackrefs;
  }
  const url = getUrl();
  url.pathname += `/courses/${course_id}`;
  url.searchParams.append('semesterId', semesterId.toString());
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw await response.json();
  }
  const course = await response.json();
  // set backrefs
  course.small_groups.forEach((smallGroup: SmallGroup) => {
    (smallGroup as SmallGroupBackref).cid = course.cid;
  });
  courseCache.set(cacheKey, course);
  return course;
};

semesterNameStore.subscribe(async () => {
  // This callback syncs semesterId with the store value.
  // Must not run on the server: getSemesters() returns [] there,
  // and localStorage stores are meaningless outside a browser anyway.
  if (!browser) return;

  // const cachedId = semesterIdCache.get(semesterName);
  const cachedId = semesterResponse?.find((semester) => semester.name === semesterName)?.id;
  if (cachedId) {
    semesterId = cachedId;
  } else {
    const semesters = await getSemesters();
    const semester = semesters.find((s) => s.name === semesterName);
    if (!semester) {
      // Stale localStorage value — migrate to the newest available semester.
      // getSemesters() already sets semesterNameStore, which re-triggers this callback.
      semesterNameStore.set(semesters[semesters.length - 1].name);
      return;
    }
    semesterId = semester.id;
  }
});

// Incremented every time the API cache is busted. Consumers can subscribe to
// re-run any work that depended on now-stale cached data.
export const cacheVersion = writable(0);

// Maps semester name → the set of CIDs returned by the most recent getCourses()
// call for that semester.  Accumulates across semester switches so that
// appointments from any previously-visited semester are not falsely flagged.
// Cleared on cache bust.
export const freshCourseCids = writable<Record<string, Set<string>>>({});

export const bustCache = (): void => {
  searchResultsCache.clear();
  cidCoursesCache.clear();
  courseCache.clear();
  freshCourseCids.set({}); // cleared until next getCourses() call
  cacheVersion.update((v) => v + 1);
};

export type SemesterWithoutCoursesButId = {
  name: string;
  created?: string;
  id: number;
};

export type CourseWithoutAppointments = Omit<Course, 'small_groups' | 'appointments'>;

export type Course = {
  cid: string;
  name: string;
  description: string;
  ou?: string;
  small_groups: SmallGroup[];
  appointments: Appointment[];
};

export type SmallGroup = {
  name: string;
  appointments: Appointment[];
};

export type SmallGroupBackref = SmallGroup & { cid: string };

export type CourseWithSmallGroupBackrefs = Omit<Course, 'small_groups'> & {
  small_groups: SmallGroupBackref[];
};

export type AppointmentCollection = CourseWithSmallGroupBackrefs | SmallGroupBackref;

export type Appointment = {
  start_time: string;
  end_time: string;
  room: string;
  instructors: string;
};

export type HTTPValidationError = {
  detail: ValidationError[];
};

export type ValidationError = {
  loc: string;
  msg: string;
  type: string;
};


// Returns the "base" part of a CID: the portion before the '|' separator that
// was introduced to disambiguate courses sharing the same university ID.
// For old-format CIDs that lack a '|' the whole string is returned.
export const getBaseId = (cid: string): string => cid.split('|')[0];

// Attempts to find a single unambiguous replacement for a stale AppointmentCollection
// whose CID no longer exists in the current semester's fresh data.
// Returns the replacement, or null when there are zero or more than one candidates
// (ambiguous — caller should keep the original and surface a broken indicator).
export const tryReplaceStaleAppointment = async (
  stale: AppointmentCollection
): Promise<AppointmentCollection | null> => {
  const courses = await getCourses();
  const staleBase = getBaseId(stale.cid);

  if ('description' in stale) {
    // Full course: match by base ID AND exact course name so we can be certain.
    const candidates = courses.filter(
      (c) => getBaseId(c.cid) === staleBase && c.name === stale.name
    );
    if (candidates.length !== 1) return null; // 0 = gone, >1 = ambiguous
    return getCourse(candidates[0].cid);
  } else {
    // SmallGroupBackref: stale.cid is the COURSE's cid; stale.name is the group name.
    // Find courses with the same base course ID, then look for the matching group.
    const courseCandidates = courses.filter((c) => getBaseId(c.cid) === staleBase);
    const matches: SmallGroupBackref[] = [];
    for (const candidate of courseCandidates) {
      const full = await getCourse(candidate.cid);
      const group = full.small_groups.find((g) => g.name === stale.name);
      if (group) matches.push(group as SmallGroupBackref);
    }
    if (matches.length !== 1) return null; // 0 = gone, >1 = ambiguous
    return matches[0];
  }
};

// Runs over a list of stored appointments and replaces any whose CID is no longer
// in the fresh course data, provided there is exactly one unambiguous replacement.
// Appointments that can't be matched are left unchanged (caller shows broken icon).
export const tryAutoReplaceAppointments = async (
  appointments: AppointmentCollection[]
): Promise<AppointmentCollection[]> => {
  const courses = await getCourses();
  const freshCids = new Set(courses.map((c) => c.cid));
  return Promise.all(
    appointments.map(async (appointment) => {
      if (freshCids.has(appointment.cid)) return appointment;
      const replacement = await tryReplaceStaleAppointment(appointment);
      return replacement ?? appointment;
    })
  );
};