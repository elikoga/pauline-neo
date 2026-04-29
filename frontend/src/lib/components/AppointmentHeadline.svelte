<script lang="ts">
  import type { AppointmentCollection } from '$lib/api';
  import { realAppointments, previewAppointments } from '../appointments';
  import { appointmentCollectionEquals } from '../appointmentCollection';

  export let title: string;
  export let targetAppointments: AppointmentCollection[];

  $: allAppointmentsActive = targetAppointments.every(isAppointmentActive);

  $: isAppointmentActive = (appointment: AppointmentCollection) =>
    $realAppointments.some((a) => appointmentCollectionEquals(a, appointment));

  const toggleRealAppointments = () => {
    if (allAppointmentsActive) {
      setRealAppointmentsNotActive();
    } else {
      setRealAppointmentsActive();
      setPreviewAppointmentsNotActive();
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleRealAppointments();
    }
  };

  const togglePreviewAppointments = () => {
    if (allAppointmentsActive) {
      setPreviewAppointmentsNotActive();
    } else {
      setPreviewAppointmentsActive();
    }
  };

  const setRealAppointmentsActive = () => {
    realAppointments.update((appointments) => [
      ...new Set([...appointments, ...targetAppointments])
    ]);
  };

  const setRealAppointmentsNotActive = () => {
    $realAppointments = $realAppointments.filter(
      (a) => !targetAppointments.some((b) => appointmentCollectionEquals(a, b))
    );
  };

  const setPreviewAppointmentsActive = () => {
    previewAppointments.update((appointments) => [
      ...new Set([...appointments, ...targetAppointments.filter((a) => !isAppointmentActive(a))])
    ]);
  };

  const setPreviewAppointmentsNotActive = () => {
    $previewAppointments = $previewAppointments.filter(
      (a) => !targetAppointments.some((b) => appointmentCollectionEquals(a, b))
    );
  };
</script>

<div
  class:allAppointmentsActive
  class="text-s font-semibold text-slate-400 uppercase text-link info"
  role="button"
  tabindex="0"
  on:click={toggleRealAppointments}
  on:keydown={handleKeydown}
  on:mouseenter={togglePreviewAppointments}
  on:mouseleave={setPreviewAppointmentsNotActive}
  aria-pressed={allAppointmentsActive}
>
  {title}
</div>

<style>
  .info {
    cursor: pointer;
    padding: 10px;
  }

  .info:hover {
    box-shadow: inset 0 0 100px 100px rgba(255, 255, 255, 0.1);
  }

  .allAppointmentsActive {
    box-shadow: inset 0 0 100px 100px rgba(255, 255, 255, 0.1);
  }

  .allAppointmentsActive:hover {
    box-shadow: inset 0 0 100px 100px rgba(255, 255, 255, 0.2);
  }
</style>
