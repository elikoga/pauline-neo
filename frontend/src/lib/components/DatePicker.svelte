<script lang="ts">
  import { DateTime } from 'luxon';
  import { startDate } from '$lib/appointments';
  import { onMount } from 'svelte';

  export let dates: DateTime[];

  let open = false;
  let dropdownEl: HTMLDivElement;
  let viewMonth = DateTime.now().startOf('month');

  $: selectedMonday = dates[0];
  $: todayISO = DateTime.now().toISODate()!;

  $: monthWeeks = (() => {
    const first = viewMonth.startOf('month');
    const last = first.endOf('month');
    let monday = first.startOf('week');
    const weeks: DateTime[][] = [];
    while (monday <= last) {
      const week: DateTime[] = [];
      for (let i = 0; i < 5; i++) {
        week.push(monday.plus({ days: i }));
      }
      weeks.push(week);
      monday = monday.plus({ weeks: 1 });
    }
    return weeks;
  })();

  const updateDate = (delta: number) => () => {
    dates = dates.map((date) => date.plus({ days: delta }));
  };

  const jumpToWeek = (day: DateTime) => {
    $startDate = day.startOf('week').set({ hour: 0 });
    open = false;
  };

  const jumpToCurrentWeek = () => {
    const now = DateTime.now();
    $startDate = now.startOf('week').set({ hour: 0 });
    viewMonth = now.startOf('month');
    open = false;
  };

  const prevMonth = () => {
    viewMonth = viewMonth.minus({ months: 1 });
  };

  const nextMonth = () => {
    viewMonth = viewMonth.plus({ months: 1 });
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownEl && !dropdownEl.contains(event.target as Node)) {
      open = false;
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') open = false;
  };

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
    };
  });

  const weekLabel = (monday: DateTime) =>
    `${monday.toFormat('d. MMM')} – ${monday.plus({ days: 4 }).toFormat('d. MMM yyyy')}`;

  const dayName = (offset: number) =>
    DateTime.now().startOf('week').plus({ days: offset }).toLocaleString({ weekday: 'short' });
</script>

<div class="datespan">
  <!-- left button -->
  <button class="button" on:click={updateDate(-7)} aria-label="Vorherige Woche">
    <svg viewBox="0 0 24 24">
      <path d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" />
    </svg>
  </button>

  <!-- week picker -->
  <div class="week-picker" bind:this={dropdownEl}>
    <button class="week-trigger" on:click={() => (open = !open)}>
      <span class="trigger-text">{weekLabel(selectedMonday)}</span>
      <svg class="trigger-chevron" class:open viewBox="0 0 24 24">
        <path d="M7 10l5 5 5-5z" />
      </svg>
    </button>

    {#if open}
      <div class="week-dropdown">
        <!-- month header -->
        <div class="month-header">
          <span class="month-label"
            >{viewMonth.toLocaleString({ month: 'long', year: 'numeric' })}</span
          >
          <button class="today-btn" on:click={jumpToCurrentWeek}>Heute</button>
        </div>

        <!-- calendar body with aside nav -->
        <div class="calendar-body">
          <!-- left aside -->
          <button class="aside-btn" on:click={prevMonth} aria-label="Vorheriger Monat">
            <svg viewBox="0 0 24 24">
              <path d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" />
            </svg>
          </button>

          <!-- center: day names + grid -->
          <div class="calendar-center">
            <div class="day-names">
              {#each Array(5) as _, i}
                <span>{dayName(i)}</span>
              {/each}
            </div>

            <div class="calendar-grid">
              {#each monthWeeks as week}
                {#each week as day}
                  {@const inMonth = day.month === viewMonth.month}
                  {@const isToday = day.toISODate() === todayISO}
                  {@const isSelWeek =
                    inMonth && day.startOf('week').toISODate() === selectedMonday.toISODate()}
                  <button
                    class="day-cell"
                    class:other-month={!inMonth}
                    class:today={isToday}
                    class:selected-week={isSelWeek}
                    disabled={!inMonth}
                    on:click={() => inMonth && jumpToWeek(day)}
                  >
                    {day.day}
                  </button>
                {/each}
              {/each}
            </div>
          </div>

          <!-- right aside -->
          <button class="aside-btn" on:click={nextMonth} aria-label="Nächster Monat">
            <svg viewBox="0 0 24 24">
              <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
            </svg>
          </button>
        </div>
      </div>
    {/if}
  </div>

  <!-- right button -->
  <button class="button" on:click={updateDate(7)} aria-label="Nächste Woche">
    <svg viewBox="0 0 24 24">
      <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
    </svg>
  </button>
</div>

<style>
  /* ── outer row: prev | trigger | next ── */
  .datespan {
    display: flex;
    align-items: stretch;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .datespan > button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.5rem;
    border: 1px solid var(--secondary);
    background: transparent;
    transition: background-color 0.15s;
  }

  .datespan > button svg {
    width: 2rem;
    height: 2rem;
    fill: var(--secondary);
  }

  .datespan > button:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .datespan > button:hover svg {
    filter: brightness(1.3);
  }

  /* ── trigger ── */
  .week-picker {
    position: relative;
    flex: 1;
    display: flex;
  }

  .week-trigger {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    border-radius: 0.5rem;
    border: 1px solid var(--secondary);
    background: transparent;
    cursor: pointer;
    transition: background-color 0.15s;
    font-size: 1.5rem;
    color: inherit;
    padding: 0 0.5rem;
    white-space: nowrap;
  }

  .week-trigger:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .trigger-chevron {
    width: 1.5rem;
    height: 1.5rem;
    fill: var(--secondary);
    transition: transform 0.2s;
    flex-shrink: 0;
  }

  .trigger-chevron.open {
    transform: rotate(180deg);
  }

  /* ── dropdown ── */
  .week-dropdown {
    position: absolute;
    top: calc(100% + 0.25rem);
    left: 0;
    right: 0;
    background: var(--background, #1a1a1a);
    border: 1px solid var(--secondary);
    border-radius: 0.5rem;
    z-index: 10;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  }

  /* ── month header ── */
  .month-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid var(--secondary);
  }

  .month-label {
    font-weight: 600;
    font-size: 0.95rem;
    text-transform: capitalize;
  }

  .today-btn {
    background: none;
    border: 1px solid var(--secondary);
    border-radius: 0.25rem;
    color: inherit;
    cursor: pointer;
    padding: 0.2rem 0.6rem;
    font: inherit;
    font-size: 0.75rem;
    transition: background-color 0.15s;
  }

  .today-btn:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  /* ── calendar body: aside | center | aside ── */
  .calendar-body {
    display: grid;
    grid-template-columns: 2rem 1fr 2rem;
    align-items: stretch;
  }

  .aside-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--secondary);
    transition: color 0.15s;
    padding: 0;
  }

  .aside-btn svg {
    width: 1.25rem;
    height: 1.25rem;
    fill: currentColor;
  }

  .aside-btn:hover {
    color: white;
  }

  /* ── center ── */
  .calendar-center {
    padding: 0.25rem 0;
  }

  .day-names {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    padding: 0 0.25rem 0.25rem;
  }

  .day-names span {
    text-align: center;
    font-size: 0.7rem;
    color: var(--secondary);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    padding: 0 0.25rem;
  }

  .day-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 2.1rem;
    font-size: 0.85rem;
    cursor: pointer;
    border: none;
    background: transparent;
    color: inherit;
    border-radius: 0.25rem;
    transition: background-color 0.1s;
  }

  .day-cell:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
  }

  .day-cell.other-month {
    color: rgba(255, 255, 255, 0.15);
    cursor: default;
  }

  .day-cell.today {
    font-weight: 700;
    color: var(--primary);
  }

  .day-cell.selected-week:not(.today) {
    background: rgba(255, 255, 255, 0.1);
  }

  .day-cell.selected-week.today {
    color: var(--primary);
    background: rgba(255, 255, 255, 0.1);
  }
</style>
