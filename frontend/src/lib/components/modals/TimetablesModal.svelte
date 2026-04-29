<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import { semesterNameStore } from '$lib/api';
  import {
    type SavedTimetable,
    activeTimetableIds,
    createTimetable,
    deleteTimetable,
    duplicateActiveTimetable,
    ensureActiveTimetable,
    renameTimetable,
    savedTimetables,
    switchTimetable
  } from '$lib/timetables';
  import { sortTimetablesBySemester } from '$lib/semesterSort';

  $: semesterName = $semesterNameStore;
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

  $: timetables = (() => {
    const sorted = [...$savedTimetables];
    const withOrder = sorted.filter(t => t.order !== undefined) as (SavedTimetable & { order: number })[];
    const withoutOrder = sorted.filter(t => t.order === undefined);
    // Sort by order (ascending), put items without order at the end
    withOrder.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
    // For items without order, append them (they'll get order assigned on next migration)
    return [...withOrder, ...withoutOrder];
  })();

  const moveUp = (timetableId: string) => {
    const list = $savedTimetables;
    const sorted = [...list].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
    const idx = sorted.findIndex(t => t.id === timetableId);
    if (idx <= 0) return; // already at top
    const current = sorted[idx];
    const above = sorted[idx - 1];
    if (!current.order || !above.order) return;
    // Swap orders
    const temp = current.order;
    current.order = above.order;
    above.order = temp;
    savedTimetables.set(sorted);
  };

  const moveDown = (timetableId: string) => {
    const list = $savedTimetables;
    const sorted = [...list].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
    const idx = sorted.findIndex(t => t.id === timetableId);
    if (idx === -1 || idx >= sorted.length - 1) return; // already at bottom
    const current = sorted[idx];
    const below = sorted[idx + 1];
    if (!current.order || !below.order) return;
    // Swap orders
    const temp = current.order;
    current.order = below.order;
    below.order = temp;
    savedTimetables.set(sorted);
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
          <Button on:click={() => moveUp(timetable.id)} disabled={timetable.order === 0 || timetable.order === undefined}>
            ↑ Nach oben
          </Button>
          <Button on:click={() => moveDown(timetable.id)} disabled={timetable.order === undefined || timetable.order >= timetables.length - 1}>
            ↓ Nach unten
          </Button>
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
