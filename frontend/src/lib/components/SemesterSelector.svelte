<script lang="ts">
  import { browser } from '$app/environment';

  import {
    getSemesters,
    semesterNameStore,
    type AppointmentCollection,
    type SemesterWithoutCoursesButId
  } from '$lib/api';
  import { realAppointments, startDate } from '$lib/appointments';
  import { fromISO } from '$lib/fromISOcache';
  import LocalStorageMap, { makeAvaliableJsonStringifyMap } from '$lib/LocalStorageMap';
  import { writableLocalStorageStore } from '$lib/localStorageStore';
  import type { DateTime } from 'luxon';
  import { onMount } from 'svelte';

  const appointmentsSemesterStore = makeAvaliableJsonStringifyMap<string, AppointmentCollection[]>(
    'appointmentsSemesterStore'
  );

  let avaliableSemesters: SemesterWithoutCoursesButId[] = [];

  onMount(async () => {
    avaliableSemesters = await getSemesters();
  });

  let lastSemesterName = $semesterNameStore;

  const startDates: Map<string, DateTime> = new Map([
    ['Sommer 2022', fromISO('2022-04-25T07:00')],
    ['Winter 2022/23', fromISO('2022-10-17T07:00')],
    ['Sommer 2023', fromISO('2023-04-17T07:00')],
    ['Winter 2023/24', fromISO('2023-10-09T07:00')],
    ['Sommer 2024', fromISO('2024-04-08T07:00')],
    ['Winter 2024/25', fromISO('2024-10-14T07:00')],
    ['Sommer 2025', fromISO('2025-04-07T07:00')],
    ['Winter 2025/26', fromISO('2025-10-13T07:00')],
    ['Sommer 2026', fromISO('2026-04-13T07:00')]
  ]);

  $: if (browser) {
    console.log(`current semester: ${$semesterNameStore}`);
    // set startDate to current semester start date
    const date = startDates.get($semesterNameStore);
    if (date) {
      $startDate = date;
    }
  }
  $: {
    // if lastSemesterName was undefined, set it now:
    if (lastSemesterName === undefined) {
      console.log('sus');
      lastSemesterName = $semesterNameStore;
    } else {
      // if they are equal, something went horribly wrong
      if (lastSemesterName === $semesterNameStore) {
        console.log("same semester, but it shouldn't be");
        console.log('we will just not do anything at the moment');
      } else {
        // assert that we won't override anything:
        if (appointmentsSemesterStore.has(lastSemesterName)) {
          console.log('we will not override anything');
        } else {
          console.log('we will override');
          // save old appointments to local storage
          appointmentsSemesterStore.set(lastSemesterName, $realAppointments);
          // get new appointments from store
          let maybeNewAppointments = appointmentsSemesterStore.get($semesterNameStore);
          // if we have new appointments, use them
          if (maybeNewAppointments) {
            $realAppointments = maybeNewAppointments;
          } else {
            // otherwise, reset
            $realAppointments = [];
          }
          // now delete the old appointments from local storage
          appointmentsSemesterStore.delete($semesterNameStore);
        }
      }
    }
    lastSemesterName = $semesterNameStore;
  }
</script>

<select bind:value={$semesterNameStore}>
  {#each avaliableSemesters as semester}
    <option value={semester.name}>{semester.name}</option>
  {/each}
</select>
