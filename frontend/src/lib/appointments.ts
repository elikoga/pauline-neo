import { writable, derived, readonly } from 'svelte/store';
import type { Appointment, AppointmentCollection } from './api';
import { DateTime } from 'luxon';
import { colorCount, colors } from '$lib/colors';
import { writableLocalStorageStore } from './localStorageStore';
import { fromISO } from './fromISOcache';
import type { Interval } from 'luxon';

// toISODate() returns string|null in Luxon 3; all dates here are constructed from
// known-valid ISO strings so the non-null assertion is always safe.
const isoDate = (dt: ReturnType<typeof fromISO>): string => dt.toISODate()!;

export const realAppointments = writableLocalStorageStore<AppointmentCollection[]>(
  'appointments',
  0,
  []
);

let realAppointmentsHistory: AppointmentCollection[][] = [];
let redoHistory: AppointmentCollection[][] = [];

const UNDOHISTORYLIMIT = 50;

const canUndoWritable = writable(false);
const canRedoWritable = writable(false);
export const canUndo = readonly(canUndoWritable);
export const canRedo = readonly(canRedoWritable);

const updateUndoRedoState = (): void => {
  canUndoWritable.set(realAppointmentsHistory.length > 1);
  canRedoWritable.set(redoHistory.length > 0);
};

realAppointments.subscribe(($realAppointments) => {
  realAppointmentsHistory = [...realAppointmentsHistory, $realAppointments].slice(
    -UNDOHISTORYLIMIT
  );
  redoHistory = [];
  updateUndoRedoState();
});

export const undo = (): void => {
  const current = realAppointmentsHistory.pop();
  const last = realAppointmentsHistory.pop();
  if (current && last) {
    const oldRedoHistory = redoHistory;
    realAppointments.set(last);
    redoHistory = [...oldRedoHistory, current];
  } else {
    last && realAppointmentsHistory.push(last);
    current && realAppointmentsHistory.push(current);
  }
  updateUndoRedoState();
};

export const redo = (): void => {
  const last = redoHistory.pop();
  if (last) {
    const oldRedoHistory = redoHistory;
    realAppointments.set(last);
    redoHistory = oldRedoHistory;
  }
  updateUndoRedoState();
};

export const previewAppointments = writable<AppointmentCollection[]>([]);

const appointments = derived<
  [typeof realAppointments, typeof previewAppointments],
  AppointmentCollection[]
>([realAppointments, previewAppointments], ([$realAppointments, $previewAppointments]) => [
  ...$realAppointments,
  ...$previewAppointments
]);

export const startDate = writable<DateTime>(fromISO('2022-10-17T07:00'));

export const dates = writable<DateTime[]>([]);

export type AnnotatedAppointment = Appointment & {
  name: string;
  collection: AppointmentCollection;
};

const appointmentsFilteredByDate = derived<
  [typeof appointments, typeof dates],
  AnnotatedAppointment[]
>([appointments, dates], ([$appointments, $dates]) => {
  return $appointments.flatMap((appointmentCollection) => {
    return appointmentCollection.appointments
      .filter((appointment) => {
        // appointment.start_time is a string in the format "2020-09-01T12:00:00.000Z"
        // it should be converted to a Date object
        // then check if the day of the appointment is the same as the day of any of the dates
        const appointmentDate = fromISO(appointment.start_time);
        return $dates.some(
          (date) =>
            // same year, same month, same day
            date.year === appointmentDate.year &&
            date.month === appointmentDate.month &&
            date.day === appointmentDate.day
        );
      })
      .map((appointment) => ({
        name: appointmentCollection.name,
        collection: appointmentCollection,
        ...appointment
      }));
  });
});

const permanentTimes = [
  '09:00', // usual start time
  '13:00', // start time for lunch
  '14:00', // end time for lunch
  '18:00' // usual end time
];

const relevantTimes = derived<typeof appointmentsFilteredByDate, string[]>(
  appointmentsFilteredByDate,
  (appointments) =>
    [
      ...new Set(
        appointments
          .flatMap((appointment) =>
            [appointment.start_time, appointment.end_time].map((time) => {
              const date = fromISO(time);
              return date.toLocaleString(DateTime.TIME_24_SIMPLE);
            })
          )
          .concat(permanentTimes)
      )
    ].sort()
);

export const relevantTimeSlots = derived<typeof relevantTimes, string[]>(relevantTimes, (times) => {
  // from [08:00, 09:00, 10:00, ...]
  // generate [08:00-09:00, 09:00-10:00, 10:00-...]
  return times.reduce((acc, time, index) => {
    const nextTime = times[index + 1];
    if (nextTime) {
      acc.push(`${time}-${nextTime}`);
    }
    return acc;
  }, [] as string[]);
});

export const howManyAppointmentsOverlap = derived<
  [typeof dates, typeof appointmentsFilteredByDate, typeof relevantTimeSlots],
  Record<string /* dates */, number /* appointments that overlap */>
>(
  [dates, appointmentsFilteredByDate, relevantTimeSlots],
  ([$dates, $appointmentsFilteredByDate, $relevantTimeSlots]) => {
    // for each date, for each time slot, count how many appointments overlap
    // return the maximum for each date
    return $dates.reduce((acc, date) => {
      const dateString = isoDate(date);
      const appointments = $appointmentsFilteredByDate.filter((appointment) => {
        // appointment.start_time is a string in the format "2020-09-01T12:00:00.000Z"
        // it should be converted to a Date object
        // then check if the day of the appointment is the same as the day of any of the dates
        const appointmentDate = fromISO(appointment.start_time);
        return isoDate(appointmentDate) === dateString;
      });
      // timeslots may overlap weirdly so:
      // 11-13
      // 12-14
      // overlaps ( from 12-14 ).

      const timeSlotCounts = $relevantTimeSlots.map((timeSlot) => {
        const [startTime, endTime] = timeSlot.split('-');
        const startTimeDate = fromISO(`${dateString}T${startTime}:00.000`);
        const endTimeDate = fromISO(`${dateString}T${endTime}:00.000`);
        const timeslotInterval = startTimeDate.until(endTimeDate);
        const appointmentsOverlappingTimeSlot = appointments.filter((appointment) => {
          const appointmentStartTimeDate = fromISO(appointment.start_time);
          const appointmentEndTimeDate = fromISO(appointment.end_time);
          const appointmentInterval = appointmentStartTimeDate.until(appointmentEndTimeDate);
          return (appointmentInterval as Interval<true>).overlaps(timeslotInterval as Interval<true>);
        });
        return appointmentsOverlappingTimeSlot.length;
      });
      acc[dateString] = Math.max(0, ...timeSlotCounts);
      return acc;
    }, {} as Record<string /* dates */, number /* appointments that overlap */>);
  }
);

type TimeTable = {
  [date: string]: {
    [timeSlot: string]: (
      | {
        empty: false;
        appointment: AnnotatedAppointment;
        rowSpan: number;
      }
      | { empty: true; filler: boolean }
    )[];
  };
};

export const timeTable = derived<
  [typeof dates, typeof appointmentsFilteredByDate, typeof relevantTimeSlots],
  TimeTable
>(
  [dates, appointmentsFilteredByDate, relevantTimeSlots],
  ([$dates, $appointmentsFilteredByDate, $relevantTimeSlots]) => {
    // iteratively build the time table
    // go through each appointment
    // and pop it into the time table
    // update the colSpan and rowSpan of other appointments

    const timeTable: TimeTable = {};
    $dates.forEach((date) => {
      timeTable[isoDate(date)] = {};
    });

    $appointmentsFilteredByDate.forEach((appointment) => {
      const dateString = isoDate(fromISO(appointment.start_time));
      const startTimeStamp = fromISO(appointment.start_time).toLocaleString(
        DateTime.TIME_24_SIMPLE
      );
      const endTimeStamp = fromISO(appointment.end_time).toLocaleString(DateTime.TIME_24_SIMPLE);
      const startTimeSlot = $relevantTimeSlots.find((timeSlot) => {
        const [startTime] = timeSlot.split('-');
        return startTime === startTimeStamp;
      });
      const endTimeSlot = $relevantTimeSlots.find((timeSlot) => {
        const [, endTime] = timeSlot.split('-');
        return endTime === endTimeStamp;
      });
      if (!startTimeSlot || !endTimeSlot) {
        return;
      }
      const startTimeSlotIndex = $relevantTimeSlots.indexOf(startTimeSlot);
      const endTimeSlotIndex = $relevantTimeSlots.indexOf(endTimeSlot);
      const rowSpan = endTimeSlotIndex - startTimeSlotIndex + 1;
      const timeTableCol = timeTable[dateString];
      if (!timeTableCol) {
        return;
      }
      if (!timeTableCol[startTimeSlot]) {
        timeTableCol[startTimeSlot] = [];
      }
      const timeTableRow = timeTableCol[startTimeSlot];
      timeTableRow.push({
        empty: false,
        appointment,
        rowSpan
      });
      // for each other time slot, push with empty
      for (let i = startTimeSlotIndex + 1; i <= endTimeSlotIndex; i++) {
        const timeSlot = $relevantTimeSlots[i];
        if (!timeTableCol[timeSlot]) {
          timeTableCol[timeSlot] = [];
        }
        const timeTableRow = timeTableCol[timeSlot];
        timeTableRow.push({
          empty: true,
          filler: false
        });
      }
    });
    // for each row that is not full, fill it with empty
    $relevantTimeSlots.forEach((timeSlot) => {
      $dates.forEach((date) => {
        const dateString = isoDate(date);
        const timeTableCol = timeTable[dateString];
        if (!timeTableCol) {
          throw new Error('timeTableCol is undefined');
        }
        if (!timeTableCol[timeSlot]) {
          timeTableCol[timeSlot] = [];
        }
        const timeTableRow = timeTableCol[timeSlot];
        // overlaps is max appointments at each timeslot for that date
        const overlaps = Math.max(
          ...$relevantTimeSlots.map((timeSlot) => {
            const appointments = (timeTableCol[timeSlot] ?? []).filter((appointment: TimeTable[string][string][number]) => {
              return appointment;
            });
            return appointments.length;
          })
        );
        const missing = overlaps - timeTableRow.length;
        for (let i = 0; i < missing; i++) {
          timeTableRow.push({
            empty: true,
            filler: true
          });
        }
      });
    });
    return timeTable;
  }
);

export const getAppointmentsColor = derived<
  typeof appointments,
  (appointment: AppointmentCollection) => string[]
>(appointments, ($appointments) => (appointmentCollection: AppointmentCollection) => {
  const uniqueCids = [...new Set($appointments.map((appointment) => appointment.cid))];
  const index = uniqueCids.indexOf(appointmentCollection.cid);
  // indexOf returns -1 when the collection is being removed from the store but the
  // component hasn't been destroyed yet.  Avoid negative modulo (which yields -1 in
  // JS and falls through to the black fallback) by clamping to 0.
  const safeIndex = index >= 0 ? index : 0;
  return colors[safeIndex % colorCount] ?? ['#000', '#000'];
});
