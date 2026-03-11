<script lang="ts">
  import { realAppointments } from '$lib/appointments';
  import { derived } from 'svelte/store';
  import type { Course as CourseType } from '$lib/api';
  import Course from '$lib/components/Course.svelte';
  import { getCourse } from '$lib/api';

  const courses = derived<typeof realAppointments, CourseType[]>(
    realAppointments,
    ($appointments, set) => {
      (async () => {
        const courses = new Set<CourseType>();
        for (const appointment of $appointments) {
          courses.add(
            'description' in appointment ? appointment : await getCourse(appointment.cid)
          );
        }
        set([...courses]);
      })();
    }
  );
</script>

{#if $courses}
  {#each $courses as course}
    <Course courseInfo={course} />
  {:else}
    <p>Nichts gewählt</p>
  {/each}
{/if}
