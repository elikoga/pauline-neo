<script lang="ts">
  import Appointments from './AppointmentCollection.svelte';
  import type { CourseWithoutAppointments, CourseWithSmallGroupBackrefs } from '$lib/api';
  import { getCourse } from '$lib/api';
  import AppointmentHeadline from './AppointmentHeadline.svelte';

  export let courseInfo: CourseWithoutAppointments | undefined;
  export let courseData: CourseWithSmallGroupBackrefs | undefined = undefined;

  export let open = false;
  let loading = false;

  $: (async () => {
    if (open) {
      // console.log('current course:', courseInfo);

      loading = true;
      courseData = courseInfo && (await getCourse(courseInfo?.cid));
      loading = false;
    }
  })();

  $: if (courseData && courseData.cid !== courseInfo?.cid) {
    courseData = undefined;
    open = false;
  }

  $: instructors = courseData?.appointments?.length ? courseData.appointments[0].instructors : '';

  const splitStuff = (str: string | undefined) => {
    if (str === undefined) return undefined;
    const split = str.split('|');
    return split[0];
  };
</script>

<details class="info-parent {open ? 'ring ring-primary ring-inset' : ''}" bind:open>
  <summary class="info">
    <span class="title text-link">{splitStuff(courseInfo?.cid)}: {courseInfo?.name}</span>
    {#if loading}
      <span class="loading">Loading...</span>
    {/if}
  </summary>
  {#if open && courseData}
    <div class="data">
      <div class="mb-5">
        <p>
          <span class="text-link">Kurs ID:</span>
          {splitStuff(courseData.cid)}
        </p>
        <p>
          <span class="text-link">Professor/Dozent:</span>
          {instructors}
        </p>
        {#if courseInfo?.ou}
          <p>
            <span class="text-link">Einheit:</span>
            {courseInfo.ou}
          </p>
        {/if}
      </div>
      <AppointmentHeadline title="Termine" targetAppointments={[courseData]} />
      <Appointments data={courseData} />
      {#if courseData.small_groups.length > 0}
        <AppointmentHeadline title="Kleingruppen" targetAppointments={courseData.small_groups} />
        <div>
          {#each courseData.small_groups as group}
            <Appointments data={group} />
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</details>

<style>
  .info {
    /* clickable */
    cursor: pointer;
    padding: 10px;
    /* no borders on left and right */
  }

  .info:hover {
    box-shadow: inset 0 0 100px 100px rgba(255, 255, 255, 0.1);
  }

  .data {
    padding: 10px;
  }
</style>
