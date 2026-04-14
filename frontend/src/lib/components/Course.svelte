<script lang="ts">
  import Appointments from './AppointmentCollection.svelte';
  import type { CourseWithoutAppointments, CourseWithSmallGroupBackrefs } from '$lib/api';
  import { getCourse, bustCache } from '$lib/api';
  import AppointmentHeadline from './AppointmentHeadline.svelte';

  export let courseInfo: CourseWithoutAppointments | undefined;
  export let courseData: CourseWithSmallGroupBackrefs | undefined = undefined;

  export let open = false;
  let loading = false;
  let stale = false; // true when getCourse failed due to a stale cached CID

  $: (async () => {
    if (open) {
      loading = true;
      stale = false;
      try {
        courseData = courseInfo && (await getCourse(courseInfo?.cid));
      } catch (_err) {
        // The CID in the local cache no longer exists on the server.
        // Bust the cache so the search re-fetches fresh data, then close.
        courseData = undefined;
        stale = true;
        open = false;
        bustCache();
      } finally {
        loading = false;
      }
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
    {:else if stale}
      <span class="stale" title="Kursdaten veraltet – Cache wurde geleert, bitte erneut laden">⚠ veraltet</span>
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
  .stale {
    color: #f59e0b; /* amber */
    font-size: 0.75rem;
    margin-left: 0.5rem;
  }
</style>
