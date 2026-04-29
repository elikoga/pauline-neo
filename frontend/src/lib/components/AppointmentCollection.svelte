<script lang="ts">
  import { realAppointments, previewAppointments, getAppointmentsColor } from '$lib/appointments';

  import type { Appointment, AppointmentCollection } from '$lib/api';
  import { appointmentCollectionEquals } from '$lib/appointmentCollection';

  import { DateTime } from 'luxon';
  import { fromISO } from '$lib/fromISOcache';

  export let data: AppointmentCollection;

  $: locked = $realAppointments.some((a) => appointmentCollectionEquals(a, data));
  $: previewed = $previewAppointments.some((a) => appointmentCollectionEquals(a, data));

  const previewShowAppointments = () => {
    if (locked) return;
    $previewAppointments = [...$previewAppointments, data];
  };

  const previewHideAppointments = () => {
    if (locked) return;

    $previewAppointments = $previewAppointments.filter(
      (a) => !appointmentCollectionEquals(a, data)
    );
  };

  const toggleAppointments = () => {
    if (locked) {
      // remove from realAppointments
      $realAppointments = $realAppointments.filter((a) => !appointmentCollectionEquals(a, data));
    } else {
      // insert into realAppointments
      $realAppointments = [...$realAppointments, data];
      // remove from previewAppointments
      $previewAppointments = $previewAppointments.filter(
        (a) => !appointmentCollectionEquals(a, data)
      );
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleAppointments();
    }
  };

  $: color = $getAppointmentsColor(data);

  $: times = [
    ...data.appointments
      .map((a) => {
        const start = fromISO(a.start_time);
        const times = [start, fromISO(a.end_time)].map((t) =>
          t.toLocaleString(DateTime.TIME_24_SIMPLE)
        );
        const weekday = start.toLocaleString({ weekday: 'short' });
        return { timeString: `${weekday} ${times.join(' - ')}`, start };
      })
      .reduce(
        (acc, { timeString, start }) =>
          acc.set(timeString, [...(acc.get(timeString) ?? []), start]),
        new Map<string, DateTime[]>()
      )
  ]
    .map(([timeString, startTimes]) => {
      // check if all weeks are even or odd
      const parities = startTimes.map((t) => t.weekNumber % 2);
      const same = parities.every((w, _, arr) => w === arr[0]);
      return same ? `${timeString} (${parities[0] === 0 ? 'ger.' : 'ung.'} KW)` : timeString;
    })
    .join(', ');
</script>

<div
  class:shown={locked || previewed}
  class:locked
  class="container"
  role="button"
  tabindex="0"
  on:mouseenter={previewShowAppointments}
  on:mouseleave={previewHideAppointments}
  on:click={toggleAppointments}
  on:keydown={handleKeydown}
  style="--dark-color: {color[0]}; --light-color: {color[1]};"
  aria-pressed={locked}
>
  {data.name} | {times || 'ohne Termine'}
</div>

<style>
  .container {
    /* make pretty */
    padding: 10px;
  }

  .container:hover {
    /* box-shadow: inset 0 0 100px 100px var(--dark-color, rgba(255, 255, 255, 0.1)); */
    cursor: pointer;
  }

  .shown {
    box-shadow: inset 0 0 100px 100px var(--dark-color, rgba(255, 255, 255, 0.1));
  }

  /* .shown:hover {
    box-shadow: inset 0 0 100px 100px var(--light-color, rgba(255, 255, 255, 0.1));
  } */

  .locked:hover {
    box-shadow: inset 0 0 100px 100px var(--light-color, rgba(255, 255, 255, 0.1));
  }
</style>
