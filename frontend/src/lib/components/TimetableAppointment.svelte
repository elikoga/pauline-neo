<script lang="ts">
  import type { ComponentType } from 'svelte';
  import { bind as bindT } from 'svelte-simple-modal';
  const bind = bindT as unknown as (component: unknown, props: Record<string, unknown>) => unknown;
  import AppointmentModal from './modals/AppointmentModal.svelte';
  import { modalStore } from '$lib/modal';
  import type { AnnotatedAppointment } from '$lib/appointments';

  import { realAppointments, getAppointmentsColor } from '$lib/appointments';
  import { appointmentCollectionEquals } from '$lib/appointmentCollection';

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
  class="coursefield text-xs text-center break-words"
  rowspan={timetableSlot.rowSpan}
  style="--dark-color: {color[0]}; --light-color: {color[1]};"
>
  <button class="button remove-button inline lg:hidden" on:click|stopPropagation={removeAppointment}
    >x</button
  >
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
</style>
