<script lang="ts">
  import { getCourse, type CourseWithSmallGroupBackrefs } from '$lib/api';

  import type { AnnotatedAppointment } from '$lib/appointments';
  import { fromISO } from '$lib/fromISOcache';
  export let appointment: AnnotatedAppointment;
  import { DateTime } from 'luxon';
  import { onMount } from 'svelte';
  import Course from '../Course.svelte';

  onMount(async () => {
    course =
      'description' in appointment.collection
        ? appointment.collection
        : await getCourse(appointment.collection.cid);
  });

  let course: CourseWithSmallGroupBackrefs;
  $: (async () => {
    course =
      'description' in appointment.collection
        ? appointment.collection
        : await getCourse(appointment.collection.cid);
  })();
</script>

<div>
  <h1>{appointment.name}</h1>
  <p>Dozenten: {appointment.instructors}</p>
  <p>Tag: {fromISO(appointment.start_time).toLocaleString(DateTime.DATE_FULL)}</p>
  <p>
    Von: {fromISO(appointment.start_time).toLocaleString(DateTime.TIME_24_SIMPLE)}
  </p>
  <p>
    Bis: {fromISO(appointment.end_time).toLocaleString(DateTime.TIME_24_SIMPLE)}
  </p>
  <p>Raum: {appointment.room}</p>
  <Course courseInfo={course} open={true} />
</div>
