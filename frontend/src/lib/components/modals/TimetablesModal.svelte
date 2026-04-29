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
    const sorted = [...$savedTimetables.filter(t => !t.deleted)];
    const withOrder = sorted.filter(t => t.order !== undefined) as (SavedTimetable & { order: number })[];
    const withoutOrder = sorted.filter(t => t.order === undefined);
    // Sort by order (ascending), put items without order at the end
    withOrder.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
    // For items without order, append them (they'll get order assigned on next migration)
    return [...withOrder, ...withoutOrder];
  })();

  const moveUp = (timetableId: string) => {
    const nonDeleted = $savedTimetables.filter(t => !t.deleted);
    const sorted = [...nonDeleted].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
    const idx = sorted.findIndex(t => t.id === timetableId);
    if (idx <= 0) return;
    const current = sorted[idx];
    const above = sorted[idx - 1];
    if (current.order === undefined || above.order === undefined) return;
    const newCurrentOrder = above.order;
    const newAboveOrder = current.order;
    savedTimetables.update(timetables =>
      timetables.map(t => {
        if (t.id === current.id) return { ...t, order: newCurrentOrder, updatedAt: new Date().toISOString() };
        if (t.id === above.id) return { ...t, order: newAboveOrder, updatedAt: new Date().toISOString() };
        return t;
      })
    );
  };

  const moveDown = (timetableId: string) => {
    const nonDeleted = $savedTimetables.filter(t => !t.deleted);
    const sorted = [...nonDeleted].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
    const idx = sorted.findIndex(t => t.id === timetableId);
    if (idx === -1 || idx >= sorted.length - 1) return;
    const current = sorted[idx];
    const below = sorted[idx + 1];
    if (current.order === undefined || below.order === undefined) return;
    const newCurrentOrder = below.order;
    const newBelowOrder = current.order;
    savedTimetables.update(timetables =>
      timetables.map(t => {
        if (t.id === current.id) return { ...t, order: newCurrentOrder, updatedAt: new Date().toISOString() };
        if (t.id === below.id) return { ...t, order: newBelowOrder, updatedAt: new Date().toISOString() };
        return t;
      })
    );
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
          <button class="icon-btn" on:click={() => moveUp(timetable.id)} disabled={timetable.order === 0 || timetable.order === undefined} aria-label="Nach oben">↑</button>
          <button class="icon-btn" on:click={() => moveDown(timetable.id)} disabled={timetable.order === undefined || timetable.order >= timetables.length - 1} aria-label="Nach unten">↓</button>
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
    gap: 0.5rem;
    grid-template-columns: minmax(10rem, 1fr) auto;
    padding: 0.5rem;
  }

  li.active {
    border-color: var(--primary);
    box-shadow: inset 0 0 0 1px var(--primary);
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

  .icon-btn {
    background: none;
    border: 1px solid #94a3b8;
    border-radius: 0;
    color: inherit;
    cursor: pointer;
    font: inherit;
    line-height: 1;
    min-height: 2rem;
    min-width: 2rem;
    padding: 0.25rem;
  }

  .icon-btn:hover:not(:disabled) {
    background: #e2e8f0;
  }

  .icon-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
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
