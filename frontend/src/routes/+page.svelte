<script lang="ts">
  import Timetable from '$lib/components/Timetable.svelte';
  import Search from '$lib/components/Search.svelte';
  import { writable } from 'svelte/store';
  import { setContext } from 'svelte';
  import Button from '$lib/components/Button.svelte';
  import { modalStore } from '$lib/modal';
  import Modal from 'svelte-simple-modal';
  import OverviewModal from '$lib/components/modals/OverviewModal.svelte';
  import FeedbackForm from '$lib/components/modals/FeedbackForm.svelte';
  import Header from '$lib/components/ui/Header.svelte';
  import { exportCalendar, importCalendar } from '$lib/calendar';
  import { undo, redo } from '$lib/appointments';
  import SemesterSelector from '$lib/components/SemesterSelector.svelte';

  const appointments = writable([]);
  setContext('appointments', appointments);

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
      <div class="timetableheader grid grid-cols-2 gap-6 md:grid-cols-1 md:flex">
        <div
          class="grid grid-rows-2 gap-2 md:flex md:flex-row md:flex-wrap md:justify-end md:space-x-2"
        >
          <Button
            on:click={() => {
              $modalStore = OverviewModal;
            }}>Übersicht über die gewählten Termine</Button
          >
          <SemesterSelector />
        </div>
        <div
          class="grid grid-rows-3 gap-2 md:flex md:flex-row md:flex-wrap md:justify-end md:space-x-2"
        >
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
</style>
