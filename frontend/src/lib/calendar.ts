import icalGenerator, { type ICalEventData } from 'ical-generator';
import ical from 'ical.js';
import { realAppointments } from './appointments';
import { derived } from 'svelte/store';
import { fromISO } from './fromISOcache';

export const exportCalendar = derived<typeof realAppointments, () => void>(
  realAppointments,
  ($appointments) => () => {
    const calendar = icalGenerator({
      name: 'Pauline Export',
      timezone: 'Europe/Berlin',
      events: $appointments.flatMap((appointmentCollection): ICalEventData[] =>
        appointmentCollection.appointments.map((appointment) => ({
          start: fromISO(appointment.start_time).toJSDate(),
          end: fromISO(appointment.end_time).toJSDate(),
          timezone: 'Europe/Berlin',
          summary: `${appointmentCollection.name}`,
          location: appointment.room,
          description: `ID: ${appointmentCollection.cid}
Raum: ${appointment.room}
Name: ${appointmentCollection.name}
Dozenten: ${appointment.instructors}
`
        }))
      ),
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
