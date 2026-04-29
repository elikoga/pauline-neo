import icalGenerator, {
  ICalEventRepeatingFreq,
  type ICalEventData,
  type ICalRepeatingOptions
} from 'ical-generator';
import ical from 'ical.js';
import { realAppointments } from './appointments';
import { derived } from 'svelte/store';
import { fromISO } from './fromISOcache';
import type { Appointment, AppointmentCollection } from './api';

const timezone = 'Europe/Berlin';

type AppointmentSeries = {
  first: Appointment;
  appointments: Appointment[];
  cancelledAppointments: Appointment[];
  intervalWeeks: number;
};

const eventDescription = (
  appointmentCollection: AppointmentCollection,
  appointment: Appointment
): string => `ID: ${appointmentCollection.cid}
Raum: ${appointment.room}
Name: ${appointmentCollection.name}
Dozenten: ${appointment.instructors}
`;

const eventData = (
  appointmentCollection: AppointmentCollection,
  appointment: Appointment,
  repeating?: ICalRepeatingOptions
): ICalEventData => ({
  start: fromISO(appointment.start_time).toJSDate(),
  end: fromISO(appointment.end_time).toJSDate(),
  timezone,
  summary: `${appointmentCollection.name}`,
  location: appointment.room,
  description: eventDescription(appointmentCollection, appointment),
  repeating
});

const appointmentSeriesKey = (appointment: Appointment): string => {
  const start = fromISO(appointment.start_time);
  const end = fromISO(appointment.end_time);
  return [
    start.weekday,
    start.toFormat('HH:mm'),
    end.toFormat('HH:mm'),
    appointment.room,
    appointment.instructors
  ].join('|');
};

const daysBetween = (left: ReturnType<typeof fromISO>, right: ReturnType<typeof fromISO>): number =>
  Math.round(right.startOf('day').diff(left.startOf('day'), 'days').days);

const candidateIntervals = (appointments: Appointment[]): number[] => {
  if (appointments.length < 2) return [1];

  const starts = appointments.map((appointment) => fromISO(appointment.start_time));
  const gaps = starts
    .slice(1)
    .map((start, index) => Math.max(1, Math.round(daysBetween(starts[index], start) / 7)));

  return [2, 1].filter((interval) => gaps.some((gap) => gap % interval === 0));
};

const buildSeriesFromGroup = (appointments: Appointment[]): AppointmentSeries[] => {
  const sorted = [...appointments].sort(
    (a, b) => fromISO(a.start_time).toMillis() - fromISO(b.start_time).toMillis()
  );
  const unused = new Set(sorted);
  const series: AppointmentSeries[] = [];

  for (const first of sorted) {
    if (!unused.has(first)) continue;

    const remaining = sorted.filter((appointment) => unused.has(appointment));
    let bestSeries: AppointmentSeries | undefined;

    for (const intervalWeeks of candidateIntervals(remaining)) {
      const current = [first];
      const cancelledAppointments: Appointment[] = [];

      let expectedStart = fromISO(first.start_time).plus({ weeks: intervalWeeks });
      const lastStart = fromISO(remaining[remaining.length - 1].start_time);

      while (expectedStart <= lastStart) {
        const match = remaining.find(
          (appointment) =>
            appointment !== first &&
            daysBetween(expectedStart, fromISO(appointment.start_time)) === 0
        );

        if (match) {
          current.push(match);
        } else {
          cancelledAppointments.push({
            ...first,
            start_time: expectedStart.toISO()!,
            end_time: expectedStart
              .plus(fromISO(first.end_time).diff(fromISO(first.start_time)))
              .toISO()!
          });
        }

        expectedStart = expectedStart.plus({ weeks: intervalWeeks });
      }

      const candidate = {
        first,
        appointments: current,
        cancelledAppointments,
        intervalWeeks
      };

      if (
        bestSeries === undefined ||
        candidate.appointments.length > bestSeries.appointments.length ||
        (candidate.appointments.length === bestSeries.appointments.length &&
          candidate.cancelledAppointments.length < bestSeries.cancelledAppointments.length)
      ) {
        bestSeries = candidate;
      }
    }

    if (!bestSeries) continue;

    for (const appointment of bestSeries.appointments) {
      unused.delete(appointment);
    }
    series.push(bestSeries);
  }

  return series;
};

const groupAppointmentSeries = (appointments: Appointment[]): AppointmentSeries[] => {
  const grouped = new Map<string, Appointment[]>();
  for (const appointment of appointments) {
    const key = appointmentSeriesKey(appointment);
    grouped.set(key, [...(grouped.get(key) ?? []), appointment]);
  }

  return [...grouped.values()].flatMap(buildSeriesFromGroup);
};

const repeatingForSeries = (series: AppointmentSeries): ICalRepeatingOptions | undefined => {
  if (series.appointments.length < 2) return undefined;

  const repeating: ICalRepeatingOptions = {
    freq: ICalEventRepeatingFreq.WEEKLY,
    interval: series.intervalWeeks,
    count: series.appointments.length + series.cancelledAppointments.length
  };

  if (series.cancelledAppointments.length > 0) {
    repeating.exclude = series.cancelledAppointments.map((appointment) =>
      fromISO(appointment.start_time).toJSDate()
    );
  }

  return repeating;
};

export const appointmentCollectionEvents = (
  appointmentCollection: AppointmentCollection
): ICalEventData[] => {
  return groupAppointmentSeries(appointmentCollection.appointments).map((series) =>
    eventData(appointmentCollection, series.first, repeatingForSeries(series))
  );
};

export const exportCalendar = derived<typeof realAppointments, () => void>(
  realAppointments,
  ($appointments) => () => {
    const calendar = icalGenerator({
      name: 'Pauline Export',
      timezone,
      events: $appointments.flatMap(appointmentCollectionEvents),
      x: [['X-PAULO-APPOINTMENTS', JSON.stringify($appointments)]]
    });
    const blob = new Blob([calendar.toString()], { type: 'text/calendar;charset=utf-8' });
    const link = window.URL.createObjectURL(blob);
    const tempLink = document.createElement('a');
    tempLink.href = link;
    tempLink.setAttribute('download', 'pauline.ics');
    tempLink.click();
    // remove temp link
    setTimeout(() => {
      tempLink.remove();
      window.URL.revokeObjectURL(link);
    }, 100);
  }
);

export const importCalendar = async (): Promise<void> => {
  const file = await new Promise<File>((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ics';
    input.onchange = (event) => {
      const target = event.target;
      if (!target) {
        reject('No target');
      } else if (!(target instanceof HTMLInputElement)) {
        reject('Target is not an input element');
      } else if (!target.files) {
        reject('No files');
      } else if (target.files.length !== 1) {
        reject('More than one file');
      } else {
        resolve(target.files[0]);
      }
    };
    input.click();
  });
  const reader = new FileReader();
  const readFile = new Promise<string>((resolve, reject) => {
    reader.onload = (e) => {
      const data = e.target?.result;
      // check if string, if not, reject
      if (typeof data !== 'string') {
        reject(new Error('File is not a string'));
      } else {
        resolve(data);
      }
    };
    reader.readAsText(file);
  });
  const data = await readFile;
  const calendar = ical.parse(data);
  // console.log(calendar);
  let appointmentsJson = (calendar[1] as unknown[][]).find(
    (attribute: unknown[]) => attribute[0] === 'x-paulo-appointments'
  )?.[3] as string | undefined;
  if (typeof appointmentsJson !== 'string') {
    throw new Error('No appointments found');
  }
  appointmentsJson = appointmentsJson.replace(/\\\\/g, '\\');
  appointmentsJson = appointmentsJson.replace(/\\"/g, '"');
  appointmentsJson = appointmentsJson.replace(/\\,/g, ',');

  realAppointments.set(JSON.parse(appointmentsJson));
  return;
};
