<script lang="ts">
  import type { DateTime } from 'luxon';
  export let dates: DateTime[];

  const updateDate = (delta: number) => () => {
    dates = dates.map((date) => date.plus({ days: delta }));
  };
</script>

<div class="datespan">
  <!-- left button -->
  <button
    class="button hover:bg-black/5"
    on:click={updateDate(-7)}
    aria-label="Vorherige Woche"
  >
    <svg viewBox="0 0 24 24">
      <path d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" />
    </svg>
  </button>
  <!-- date span -->
  <span class="date">
    {dates[0].toLocaleString({
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })}
    -
    {dates[4].toLocaleString({
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })}
  </span>
  <!-- right button -->
  <button
    class="button hover:bg-black/5"
    on:click={updateDate(7)}
    aria-label="Nächste Woche"
  >
    <svg viewBox="0 0 24 24">
      <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
    </svg>
  </button>
</div>

<style>
  .datespan {
    display: flex;
    align-items: stretch;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .datespan .date {
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    padding: 0 0.5rem;
    white-space: nowrap;
  }

  .datespan button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.5rem;
  }

  .datespan button svg {
    width: 2rem;
    height: 2rem;
    fill: #6b7280;
  }

  .datespan button:hover svg {
    fill: #374151;
  }
</style>
