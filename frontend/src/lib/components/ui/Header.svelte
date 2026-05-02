<script lang="ts">
  import Hamburger from '$lib/components/ui/Hamburger.svelte';
  import { modalStore } from '$lib/modal';
  import InfoModal from '../modals/InfoModal.svelte';
  import UserMenuModal from '../modals/UserMenuModal.svelte';
  import { canRedo, canUndo, redo, undo } from '$lib/appointments';
  import { authState } from '$lib/auth';

  export let sidebarOpen: boolean;
  export let sidebarLocked: boolean;

  let cls = '';
  export { cls as class };
</script>

<div class={cls}>
  <div class="bar top-0 z-30 flex flex-row">
    <div class="bar-content flex" style="padding: 0 1rem;">
      <Hamburger bind:open={sidebarOpen} on:click={() => (sidebarLocked = !sidebarLocked)} />
    </div>
    <div class="title-area bar-content flex items-center">
      <img class="w-8 h-8 ml-3" src="https://fsmi.uni-paderborn.de/images/pi_taste.png" alt="" />
      <h1 class="text-4xl font-bold text-white ml-3">Pauline</h1>
    </div>
    <div
      class="right-controls bar-content flex items-center gap-1"
      aria-label="Änderungen rückgängig machen oder wiederherstellen"
    >
      <div class="history-controls flex items-center gap-1">
        <button
          type="button"
          class="history-button"
          on:click={undo}
          disabled={!$canUndo}
          aria-label="Letzte Änderung rückgängig machen"
          title="Rückgängig (Ctrl+Z)"
        >
          ↶
          <span class="history-label">Rückgängig</span>
        </button>
        <button
          type="button"
          class="history-button"
          on:click={redo}
          disabled={!$canRedo}
          aria-label="Rückgängig gemachte Änderung wiederherstellen"
          title="Wiederherstellen (Ctrl+Y)"
        >
          ↷
          <span class="history-label">Wiederherstellen</span>
        </button>
      </div>
      <button
        type="button"
        class="menu-icon-button"
        on:click={() => ($modalStore = UserMenuModal)}
        aria-label="Menü"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>
      <button
        type="button"
        class="question-circle bar-content rounded-full border-2"
        on:click={() => ($modalStore = InfoModal)}
        aria-label="Informationen zu Pauline"
      >
        ?
      </button>
    </div>
  </div>
</div>

<style>
  .bar {
    width: 100%;
    height: var(--header-height);
    background-color: var(--primary);
  }

  .bar-content {
    height: 100%;
    color: white;
  }

  .bar-content > h1 {
    color: white;
  }

  .title-area {
    min-width: 0;
    overflow: hidden;
  }

  .right-controls {
    flex-shrink: 0;
    margin-left: auto;
    gap: 0.25rem;
    overflow: visible;
  }


  .history-button {
    min-height: calc(var(--header-height) - 0.5rem);
    min-width: calc(var(--header-height) - 0.5rem);
    color: white;
    border: 1px solid var(--secondary);
    border-radius: 0.25rem;
    padding: 0 0.5rem;
    touch-action: manipulation;
  }

  .history-button:hover:not(:disabled) {
    cursor: pointer;
    background-color: rgba(255, 255, 255, 0.12);
  }

  .history-button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .history-label {
    display: none;
    color: white;
    margin-left: 0.25rem;
  }

  @media screen and (min-width: 768px) {
    .history-label {
      display: inline;
    }
  }

  @media screen and (max-width: 420px) {
    .bar-content > img {
      display: none;
    }
  }


  .menu-icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: calc(var(--header-height) - 0.5rem);
    height: calc(var(--header-height) - 0.5rem);
    color: white;
    border: 1px solid var(--secondary);
    border-radius: 0.25rem;
    background: none;
    cursor: pointer;
    padding: 0;
  }

  .menu-icon-button:hover {
    background-color: rgba(255, 255, 255, 0.12);
  }


  .question-circle {
    width: calc(var(--header-height) - 0.5rem);
    height: calc(var(--header-height) - 0.5rem);
    margin-top: 0.25rem;
    margin-right: 0.25rem;
    text-align: center;
    font-size: 1.5rem;
  }

  .question-circle:hover {
    cursor: pointer;
    transform: scale(1.1);
  }

</style>
