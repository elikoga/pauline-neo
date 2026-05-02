<script lang="ts">
  import { browser } from '$app/environment';

  import { getSemesters, semesterNameStore, type SemesterWithoutCoursesButId } from '$lib/api';
  import { replaceRealAppointments, realAppointments, startDate } from '$lib/appointments';
  import { semesterStartDates } from '$lib/semesterDates';
  import { ensureActiveTimetable } from '$lib/timetables';
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';

  let avaliableSemesters: SemesterWithoutCoursesButId[] = [];

  onMount(async () => {
    avaliableSemesters = await getSemesters();
  });

  let lastSemesterName = $semesterNameStore;


  $: if (browser) {
    const date = semesterStartDates.get($semesterNameStore);
    if (date) {
      $startDate = date;
    }
  }

  $: if (browser && lastSemesterName !== $semesterNameStore) {
    console.log('[Pauline] semester switch:', lastSemesterName, '->', $semesterNameStore, '| realAppointments:', get(realAppointments).length, 'appts');
    const timetable = ensureActiveTimetable($semesterNameStore, []);
    console.log('[Pauline] after ensureActiveTimetable:', timetable.id, timetable.appointments.length, 'appts');
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
