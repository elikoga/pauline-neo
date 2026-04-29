<script lang="ts">
  import { browser } from '$app/environment';

  import { getSemesters, semesterNameStore, type SemesterWithoutCoursesButId } from '$lib/api';
  import { replaceRealAppointments, startDate } from '$lib/appointments';
  import { fromISO } from '$lib/fromISOcache';
  import { ensureActiveTimetable, persistActiveTimetableAppointments } from '$lib/timetables';
  import type { DateTime } from 'luxon';
  import { onMount } from 'svelte';

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
    const date = startDates.get($semesterNameStore);
    if (date) {
      $startDate = date;
    }
  }

  $: if (browser && lastSemesterName !== $semesterNameStore) {
    persistActiveTimetableAppointments(lastSemesterName);
    const timetable = ensureActiveTimetable($semesterNameStore);
    replaceRealAppointments(timetable.appointments, { resetHistory: true });
    lastSemesterName = $semesterNameStore;
  }
</script>

<select bind:value={$semesterNameStore} aria-label="Semester auswählen">
  {#each avaliableSemesters as semester}
    <option value={semester.name}>{semester.name}</option>
  {/each}
</select>

<style>
  select {
    background-color: var(--primary);
    border: none;
    border-radius: 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    color: white;
    cursor: pointer;
    display: inline-block;
    font: inherit;
    line-height: 1.5rem;
    min-height: calc(2.5rem + 4px);
    padding: 0.5rem 2rem 0.5rem 1rem;
  }

  select:hover {
    filter: brightness(85%);
  }

  option {
    color: black;
  }
</style>
