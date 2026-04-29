<script lang="ts">
  import Timetable from '$lib/components/Timetable.svelte';
  import Search from '$lib/components/Search.svelte';
  import { writable, get } from 'svelte/store';
  import { setContext, onMount } from 'svelte';
  import Button from '$lib/components/Button.svelte';
  import { modalStore } from '$lib/modal';
  import Modal from 'svelte-simple-modal';
  import OverviewModal from '$lib/components/modals/OverviewModal.svelte';
  import FeedbackForm from '$lib/components/modals/FeedbackForm.svelte';
  import ChangelogModal from '$lib/components/modals/ChangelogModal.svelte';
  import AuthModal from '$lib/components/modals/AuthModal.svelte';
  import TimetablesModal from '$lib/components/modals/TimetablesModal.svelte';
  import Header from '$lib/components/ui/Header.svelte';
  import { exportCalendar, importCalendar } from '$lib/calendar';
  import { registerAppointmentPersistence, undo, redo, realAppointments } from '$lib/appointments';
  import { cacheVersion, semesterNameStore, tryAutoReplaceAppointments } from '$lib/api';
  import type { AppointmentCollection } from '$lib/api';
  import { browser } from '$app/environment';
  import SemesterSelector from '$lib/components/SemesterSelector.svelte';
  import { ensureActiveTimetable, persistActiveTimetableAppointments } from '$lib/timetables';

  const appointments = writable([]);
  setContext('appointments', appointments);
  if (browser) {
    ensureActiveTimetable(get(semesterNameStore));
    registerAppointmentPersistence(persistActiveTimetableAppointments);
  }

  // Heal stale appointments (CID changed due to scraper hash updates) by finding
  // the unambiguous replacement.  Runs once on mount (to fix data from localStorage)
  // and again after every cache bust (so freshly scraped data is used).
  const runAutoReplace = async () => {
    if (!browser) return;
    const snapshot = get(realAppointments);
    if (snapshot.length === 0) return;
    const updated = await tryAutoReplaceAppointments(snapshot);
    // Build a map of identity-key -> replacement for items that actually changed.
    // We key by cid+name (same as appointmentCollectionEquals) so the lookup is
    // consistent with how the store identifies collections.
    const replacements = new Map<string, AppointmentCollection>();
    for (let i = 0; i < snapshot.length; i++) {
      if (updated[i] !== snapshot[i]) {
        replacements.set(`${snapshot[i].cid}\x00${snapshot[i].name}`, updated[i]);
      }
    }
    if (replacements.size === 0) return; // nothing changed, don't touch the store
    // Apply only the replacements to the CURRENT store state so that any
    // add/remove the user did while we were awaiting is preserved.
    realAppointments.update((current) =>
      current.map((a) => replacements.get(`${a.cid}\x00${a.name}`) ?? a)
    );
  };

  onMount(runAutoReplace);

  // Re-run after each cache bust so newly fetched data can heal any remaining
  // stale appointments that weren't replaced on the initial load.
  cacheVersion.subscribe((version) => {
    if (!browser || version === 0) return;
    runAutoReplace();
  });

  let sidebarOpen = false;
  let sidebarLocked = false;
  let scrollY: number | null | undefined;
</script>

<svelte:head>
  <title>Pauline - Dein Stundenplaner</title>
  <meta property="og:title" content="Pauline - Dein Stundenplaner" />
  <meta
    property="og:description"
    content="Pauline - Dein einfacher Stundenplaner für die Universität Paderborn."
  />
</svelte:head>

<Modal
  show={$modalStore}
  styleWindow={{ backgroundColor: 'var(--background) !important' }}
  classWindow="p-5"
  styleCloseButton={{ backgroundColor: 'var(--primary) !important' }}
/>
<!-- we want the container to fill the screen horizontally -->
<!-- we want some padding so this isn't disgusting on the eyes -->

<svelte:window
  bind:scrollY
  on:keydown={(evt) => {
    if (evt.ctrlKey) {
      switch (evt.key) {
        case 'z':
          evt.preventDefault();
          evt.stopPropagation();
          undo();
          break;
        case 'y':
          evt.preventDefault();
          evt.stopPropagation();
          redo();
          break;
      }
    }
  }}
/>

<aside
  class="search fixed w-full lg:w-1/4 shadow-2xl {sidebarOpen ? 'sidebarOpen' : ''}"
  style="--scroll-y: {scrollY}px"
  on:mouseenter={() => {
    if (window.matchMedia('screen and (min-width: 976px)').matches) {
      sidebarOpen = true;
    }
  }}
  on:mouseleave={() => {
    if (window.matchMedia('screen and (min-width: 976px)').matches) {
      if (!sidebarLocked) {
        sidebarOpen = false;
      }
    }
  }}
>
  <div class="bg-background h-full">
    <Search />
  </div>
</aside>

<div class="flex flex-col min-h-screen">
  <Header bind:sidebarOpen bind:sidebarLocked class="shrink-0 w-full z-40 drop-shadow-md" />
  <div class="flex gap-6 flex-row relative">
    <div class="timetable w-full m-2">
      <div class="timetableheader grid grid-cols-2 gap-3">
        <div class="toolbar-group">
          <Button
            on:click={() => {
              $modalStore = AuthModal;
            }}>Konto / Anmeldelink</Button
          >
          <Button
            on:click={() => {
              $modalStore = TimetablesModal;
            }}>Stundenpläne</Button
          >
          <Button
            on:click={() => {
              $modalStore = ChangelogModal;
            }}>Neu in Pauline</Button
          >
          <Button
            on:click={() => {
              $modalStore = OverviewModal;
            }}>Übersicht über die gewählten Termine</Button
          >
          <SemesterSelector />
        </div>
        <div class="toolbar-group toolbar-group-right">
          <Button on:click={$exportCalendar}>Kalender Exportieren</Button>
          <Button on:click={importCalendar}>Kalender Importieren</Button>
          <Button
            on:click={() => {
              $modalStore = FeedbackForm;
            }}
            >Feedback geben!
          </Button>
        </div>
      </div>

      <Timetable />
    </div>
  </div>
</div>

<style>
  aside {
    left: -100%;
    transition: left 0.3s ease-in-out;
    height: calc(100% - (max(var(--header-height) - var(--scroll-y), 0px)));
    top: calc(max(var(--header-height) - var(--scroll-y), 0px));
    z-index: 1;
  }

  .sidebarOpen {
    left: 0;
  }

  .timetable {
    max-width: calc(100% - (2 * 0.5rem));
  }

  /* media query for 976px */
  @media screen and (min-width: 976px) {
    aside {
      /* usually, only show 5rem of the sidebar */
      left: calc(5rem - 25%);
    }
    /* aside:hover {
      left: 0;
    } */
    .timetable {
      margin-left: calc(5rem + 0.5rem);
      max-width: calc(100% - (0.5rem + (5rem + 0.5rem)));
    }
  }

  .timetableheader {
    margin-bottom: 1rem;
    justify-content: space-between;
  }

  .toolbar-group {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.5rem;
    justify-items: stretch;
    align-content: start;
  }

  .toolbar-group-right {
    justify-content: end;
  }

  .toolbar-group :global(*) {
    width: 100%;
  }

  @media screen and (min-width: 768px) {
    .toolbar-group {
      display: flex;
      flex-flow: row wrap;
      justify-content: flex-start;
    }

    .toolbar-group-right {
      justify-content: flex-end;
    }

    .toolbar-group :global(*) {
      width: auto;
    }
  }
</style>
