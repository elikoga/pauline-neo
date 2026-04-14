<script lang="ts">
  import type { ComponentType } from 'svelte';
  import { bind as bindT } from 'svelte-simple-modal';
  const bind = bindT as unknown as (component: unknown, props: Record<string, unknown>) => unknown;
  import AppointmentModal from './modals/AppointmentModal.svelte';
  import { modalStore } from '$lib/modal';
  import type { AnnotatedAppointment } from '$lib/appointments';

  import { realAppointments, getAppointmentsColor } from '$lib/appointments';
  import { appointmentCollectionEquals } from '$lib/appointmentCollection';
  import { freshCourseCids } from '$lib/api';

  // True when at least one semester's fresh data has been loaded AND the
  // appointment's CID is absent from every semester we've fetched.
  // Checking all fetched semesters prevents false positives when the user
  // switches semesters — an appointment from semester A stays valid even
  // after semester B's courses are loaded.
  $: broken =
    Object.keys($freshCourseCids).length > 0 &&
    !Object.values($freshCourseCids).some((s) =>
      s.has(timetableSlot.appointment.collection.cid)
    );

  $: color = $getAppointmentsColor(timetableSlot.appointment.collection);

  const removeAppointment = () => {
    // realAppointments.update(($realAppointments) =>
    //   $realAppointments.filter(
    //     (a) => !appointmentCollectionEquals(a, timetableSlot.appointment.collection)
    //   )
    // );

    // with svelte syntax
    $realAppointments = $realAppointments.filter(
      (a) => !appointmentCollectionEquals(a, timetableSlot.appointment.collection)
    );
  };

  export let timetableSlot: {
    empty: false;
    appointment: AnnotatedAppointment;
    rowSpan: number;
  };
  const openModal = () => {
    $modalStore = bind(AppointmentModal, { appointment: timetableSlot.appointment }) as ComponentType;
  };
</script>

<td
  on:click={openModal}
  class="coursefield text-xs text-center break-words {broken ? 'broken' : ''}"
  rowspan={timetableSlot.rowSpan}
  style="--dark-color: {color[0]}; --light-color: {color[1]};"
>
  <button class="button remove-button inline lg:hidden" on:click|stopPropagation={removeAppointment}
    >x</button
  >
  {#if broken}
    <span class="broken-icon" title="Termindaten veraltet – dieser Kurs wurde vom System aktualisiert und konnte nicht automatisch ersetzt werden">⚠</span>
  {/if}
  {timetableSlot.appointment.name}
</td>

<style>
  td {
    border: 1px solid black;
    height: 100px;
    position: relative;
  }

  .coursefield {
    max-width: 7rem;
    background-color: var(--dark-color, rgba(255, 255, 255, 0.1));
  }

  .coursefield:hover {
    background-color: var(--light-color, #3a3a3a);
    cursor: pointer;
  }

  .coursefield:hover button {
    display: inline;
  }

  .remove-button {
    position: absolute;
    width: 28px;
    height: 28px;
    background-color: rgba(70, 70, 70, 0.7);
    right: 0;
    top: 0;
  }
  .broken {
    outline: 2px solid #f59e0b;
    outline-offset: -2px;
  }

  .broken-icon {
    display: block;
    font-size: 1rem;
    color: #f59e0b;
    line-height: 1;
    margin-bottom: 2px;
  }
</style>
