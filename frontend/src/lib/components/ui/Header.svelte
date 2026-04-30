<script lang="ts">
  import Hamburger from '$lib/components/ui/Hamburger.svelte';
  import { modalStore } from '$lib/modal';
  import InfoModal from '../modals/InfoModal.svelte';
  import AuthModal from '../modals/AuthModal.svelte';
  import TimetablesModal from '../modals/TimetablesModal.svelte';
  import { canRedo, canUndo, redo, undo } from '$lib/appointments';
  import { authState, logoutAccount } from '$lib/auth';
  import { onMount, onDestroy } from 'svelte';

  export let sidebarOpen: boolean;
  export let sidebarLocked: boolean;

  let cls = '';
  let menuOpen = false;
  let menuEl: HTMLElement;

  export { cls as class };

  const closeMenu = (e: MouseEvent) => {
    if (menuEl && !menuEl.contains(e.target as Node)) {
      menuOpen = false;
    }
  };

  onMount(() => document.addEventListener('click', closeMenu));
  onDestroy(() => document.removeEventListener('click', closeMenu));
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
      <div class="app-menu" bind:this={menuEl}>
        <button
          type="button"
          class="menu-icon-button"
          on:click={() => ($authState.account ? (menuOpen = !menuOpen) : ($modalStore = AuthModal))}
          aria-label={$authState.account ? 'Menü' : 'Anmelden'}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        {#if menuOpen && $authState.account}
          <div class="menu-dropdown">
            <div class="dropdown-email">{$authState.account.email}</div>
            <button
              type="button"
              class="dropdown-item"
              on:click={() => { menuOpen = false; $modalStore = TimetablesModal; }}
            >
              Stundenpläne
            </button>
            <button
              type="button"
              class="dropdown-item dropdown-item-danger"
              on:click={() => { menuOpen = false; logoutAccount(); }}
            >
              Abmelden
            </button>
          </div>
        {/if}
      </div>
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
    overflow: hidden;
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

  .app-menu {
    position: relative;
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

  .menu-dropdown {
    position: absolute;
    top: calc(100% + 0.25rem);
    right: 0;
    min-width: 14rem;
    background: var(--background);
    border: 1px solid var(--secondary);
    border-radius: 0.375rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 50;
    overflow: hidden;
  }

  .dropdown-email {
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
    color: #64748b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    border-bottom: 1px solid var(--secondary);
  }

  .dropdown-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
    color: var(--text);
    background: none;
    border: none;
    cursor: pointer;
  }

  .dropdown-item:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }

  .dropdown-item-danger {
    color: #dc2626;
  }
</style>
