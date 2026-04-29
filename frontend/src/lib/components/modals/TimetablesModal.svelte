<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import { semesterNameStore } from '$lib/api';
  import {
    activeTimetableIds,
    createTimetable,
    deleteTimetable,
    duplicateActiveTimetable,
    ensureActiveTimetable,
    renameTimetable,
    savedTimetables,
    switchTimetable
  } from '$lib/timetables';

  $: semesterName = $semesterNameStore;
  $: timetables = $savedTimetables;
  $: activeTimetableId = $activeTimetableIds[semesterName];

  $: if (semesterName) {
    ensureActiveTimetable(semesterName);
  }

  const createNew = () => {
    createTimetable();
  };

  const duplicate = () => {
    duplicateActiveTimetable();
  };

  const rename = (timetableId: string, name: string) => {
    renameTimetable(timetableId, name);
  };

  const remove = (timetableId: string) => {
    if (timetables.length <= 1) return;
    deleteTimetable(timetableId);
  };
</script>

<h1 class="text-3xl">Stundenpläne</h1>

<p>
  Du kannst für jedes Semester mehrere Stundenpläne behalten. Der aktive Stundenplan ist der, den du
  gerade bearbeitest und exportierst.
</p>

<div class="actions">
  <Button on:click={createNew}>Neuen Stundenplan anfangen</Button>
  <Button on:click={duplicate}>Aktuellen Stundenplan kopieren</Button>
</div>

<p class="save-status">Änderungen werden automatisch gespeichert.</p>

<ul aria-label="Gespeicherte Stundenpläne">
  {#each timetables as timetable (timetable.id)}
    <li class:active={timetable.id === activeTimetableId}>
      <div class="details">
        <input
          value={timetable.name}
          aria-label="Stundenplan umbenennen"
          on:change={(event) => rename(timetable.id, event.currentTarget.value)}
        />
        <span>
          {timetable.appointments.length}
          {timetable.appointments.length === 1 ? 'Termin' : 'Termine'} · {timetable.semesterName}
        </span>
      </div>
      <div class="row-actions">
        <Button on:click={() => switchTimetable(timetable.id)}>
          {timetable.id === activeTimetableId ? 'Aktiv' : 'Öffnen'}
        </Button>
        {#if timetables.length > 1}
          <Button on:click={() => remove(timetable.id)}>Löschen</Button>
        {/if}
      </div>
    </li>
  {:else}
    <li>Es gibt noch keinen gespeicherten Stundenplan.</li>
  {/each}
</ul>

<style>
  p {
    margin: 1em 0;
  }

  .actions {
    display: grid;
    gap: 0.5rem;
    margin: 1em 0;
  }

  input {
    border: 1px solid #94a3b8;
    padding: 0.5rem;
    width: 100%;
  }

  ul {
    display: grid;
    gap: 0.5rem;
  }

  li {
    align-items: center;
    border: 1px solid #cbd5e1;
    display: grid;
    gap: 0.75rem;
    grid-template-columns: minmax(12rem, 1fr) auto;
    padding: 0.75rem;
  }

  li.active {
    border-color: var(--primary);
    box-shadow: inset 0 0 0 2px var(--primary);
  }

  .details,
  .row-actions {
    display: grid;
    gap: 0.5rem;
  }

  .details span {
    color: #475569;
  }

  .row-actions {
    grid-auto-flow: column;
  }

  @media screen and (max-width: 640px) {
    li {
      grid-template-columns: 1fr;
    }

    .row-actions {
      grid-auto-flow: row;
    }
  }
</style>
