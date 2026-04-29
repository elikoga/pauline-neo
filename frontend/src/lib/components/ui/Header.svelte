<script lang="ts">
  import Hamburger from '$lib/components/ui/Hamburger.svelte';
  import { modalStore } from '$lib/modal';
  import InfoModal from '../modals/InfoModal.svelte';
  import AuthModal from '../modals/AuthModal.svelte';
  import { canRedo, canUndo, redo, undo } from '$lib/appointments';
  import { authState, logoutAccount } from '$lib/auth';

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
      {#if $authState.account}
        <span class="account-info">
          <span class="account-email">{$authState.account.email}</span>
          <button
            type="button"
            class="account-button"
            on:click={logoutAccount}
            aria-label="Abmelden"
          >
            Abmelden
          </button>
        </span>
      {:else}
        <button
          type="button"
          class="account-button"
          on:click={() => ($modalStore = AuthModal)}
          aria-label="Anmelden"
        >
          Anmelden
        </button>
      {/if}
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

  @media screen and (max-width: 768px) {
    .account-email {
      display: none;
    }
  }

  @media screen and (max-width: 420px) {
    .bar-content > img {
      display: none;
    }

    .account-button {
      padding: 0.2rem 0.35rem;
      font-size: 0.75rem;
    }
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

  .account-info {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: white;
    font-size: 0.8rem;
  }

  .account-email {
    max-width: 10rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .account-button {
    color: white;
    border: 1px solid var(--secondary);
    border-radius: 0.25rem;
    padding: 0.2rem 0.5rem;
    font-size: 0.8rem;
    cursor: pointer;
    white-space: nowrap;
    min-height: calc(var(--header-height) - 1rem);
  }

  .account-button:hover {
    background-color: rgba(255, 255, 255, 0.12);
  }
</style>
