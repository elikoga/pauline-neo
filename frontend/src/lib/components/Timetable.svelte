<script lang="ts">
  import type { DateTime } from 'luxon';
  import DatePicker from './DatePicker.svelte';
  import {
    startDate,
    dates,
    relevantTimeSlots,
    howManyAppointmentsOverlap,
    timeTable
  } from '$lib/appointments';
  import TimetableAppointment from './TimetableAppointment.svelte';
  import { fromISO } from '$lib/fromISOcache';

  // let timeSlices = [...Array(21 - 7 + 1).keys()] // One entry for each hour
  //   .map((i) => ('0' + (i + 7).toString()).slice(-2)) // Move to 07:00 to 21:00 and pad with 0
  //   .flatMap((hour) => [hour + ':00', hour + ':15', hour + ':30', hour + ':45']); // Add 15 minute intervals

  $startDate.set({ hour: 0 });
  $startDate = $startDate;
  $: $dates = [...Array(5).keys()].map((i) => $startDate.plus({ days: i }));

  // slotKey gives Svelte a stable identity for each slot so components are
  // properly destroyed/created instead of being reused by position.
  // Empty/filler slots have no meaningful identity so they use their index.
  const slotKey = (slot: { empty: boolean; filler?: boolean; appointment?: unknown }, i: number): string => {
    if (slot.empty) return `e:${i}`;
    const c = (slot as { empty: false; appointment: { collection: { cid: string; name: string }; start_time: string } }).appointment.collection;
    const s = (slot as { empty: false; appointment: { start_time: string } }).appointment.start_time;
    return `a:${c.cid}:${c.name}:${s}`;
  };

  let theTable: HTMLTableElement;
  let topscroll: HTMLDivElement;
  let topscrollWrapper: HTMLDivElement;
  let tableWrapper: HTMLDivElement;

  $: theTable &&
    (() => {
      const resizeObserver = new ResizeObserver((entries) => {
        const { width } = entries[0].contentRect;
        topscroll.style.width = `${width}px`;
      });
      resizeObserver.observe(theTable);
    })();
</script>

<DatePicker bind:dates={$dates} />
<div
  class="overflow-x-scroll"
  bind:this={topscrollWrapper}
  on:scroll={(evt) => (tableWrapper.scrollLeft = topscrollWrapper.scrollLeft)}
>
  <div bind:this={topscroll} class="topscroll" />
</div>
<div
  class="overflow-x-scroll"
  bind:this={tableWrapper}
  on:scroll={(evt) => (topscrollWrapper.scrollLeft = tableWrapper.scrollLeft)}
>
  <table bind:this={theTable}>
    <thead>
      <tr>
        <th class="timefield">Uhrzeit</th>
        {#each $dates as date}
          <th colspan={$howManyAppointmentsOverlap[date.toISODate()!]}>
            {date.toLocaleString({ weekday: 'short', day: 'numeric', month: 'numeric' })}
            <!-- {$howManyAppointmentsOverlap[date.toISODate()]} -->
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each $relevantTimeSlots as timeSlot}
        <tr>
          <td class="timefield">{timeSlot.replace('-', ' - ')}</td>
          {#each $dates as date}
            {#each ($timeTable[date.toISODate()!]?.[timeSlot] ?? []) as slot, _slotIdx (slotKey(slot, _slotIdx))}
              {#if slot.empty}
                {#if slot.filler}
                  <td class="placeholder" rowspan="1"><!--1--></td>
                {/if}
              {:else}
                <TimetableAppointment timetableSlot={slot} />
              {/if}
            {:else}
              <td class="placeholder" rowspan="1"><!--2--></td>
            {/each}
          {/each}
        </tr>
      {:else}
        <tr>
          <td class="timefield">Frei :D</td>
          {#each $dates as _}
            <td class="placeholder" rowspan="1"><!--3--></td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  table {
    border-collapse: collapse;
    border: 1px solid black;
    width: 100%;
  }

  .topscroll {
    height: 1px;
  }

  .timefield {
    text-align: center;
    width: 20px;
    line-break: loose;
  }

  .placeholder {
    border: 1px solid black;
    align-items: center;
    justify-content: center;
    font-size: 1.5em;
    text-align: center;
  }

  .placeholder:hover {
    background-color: #3a3a3a;
  }

  td,
  th {
    border: 1px solid black;
  }

  th.timefield {
    width: 8%;
  }

  th:not(.timefield) {
    width: calc((100% - 8%) / 5);
  }

  td {
    height: 100px;
  }
</style>
