<script lang="ts">
  import Hamburger from '$lib/components/ui/Hamburger.svelte';
  import { modalStore } from '$lib/modal';
  import InfoModal from '../modals/InfoModal.svelte';

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
    <div class="bar-content max-w-screen-xl flex items-center">
      <img class="w-8 h-8 ml-3" src="https://fsmi.uni-paderborn.de/images/pi_taste.png" alt="" />
      <h1 class="text-4xl font-bold text-white ml-3">Pauline</h1>
    </div>
    <button
      type="button"
      class="question-circle bar-content ml-auto rounded-full border-2"
      on:click={() => ($modalStore = InfoModal)}
      aria-label="Informationen zu Pauline"
    >
      ?
    </button>
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
