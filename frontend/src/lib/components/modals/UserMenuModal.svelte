<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import { modalStore } from '$lib/modal';
  import TimetablesModal from './TimetablesModal.svelte';
  import { authState, logoutAccount } from '$lib/auth';
  import { sidebarAutoHide } from '$lib/preferences';
</script>

<h1 class="text-3xl">Menü</h1>

{#if $authState.account}
  <p class="account-email">{$authState.account.email}</p>
{/if}

<div class="settings-section">
  <label class="toggle-row">
    <span>Sidebar verbergen erlauben</span>
    <input type="checkbox" bind:checked={$sidebarAutoHide} />
    <span class="toggle-slider"></span>
  </label>
</div>

<div class="actions">
  <Button on:click={() => { $modalStore = TimetablesModal; }}>Stundenpläne</Button>
  {#if $authState.account}
    <Button on:click={() => { logoutAccount(); }}>Abmelden</Button>
  {/if}
</div>

<style>
  .account-email {
    color: #64748b;
    font-size: 0.85em;
    margin: 0.5em 0 1em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .settings-section {
    margin: 1em 0;
  }

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    font-size: 0.9em;
    padding: 0.25em 0;
  }

  .toggle-row input[type="checkbox"] {
    display: none;
  }

  .toggle-slider {
    position: relative;
    width: 2rem;
    height: 1.1rem;
    background: #cbd5e1;
    border-radius: 0.55rem;
    transition: background 0.15s ease-in-out;
    flex-shrink: 0;
  }

  .toggle-slider::after {
    content: '';
    position: absolute;
    top: 0.1rem;
    left: 0.1rem;
    width: 0.9rem;
    height: 0.9rem;
    background: white;
    border-radius: 50%;
    transition: transform 0.15s ease-in-out;
  }

  .toggle-row input:checked + .toggle-slider {
    background: var(--primary);
  }

  .toggle-row input:checked + .toggle-slider::after {
    transform: translateX(0.9rem);
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    margin: 1em 0;
  }
</style>
