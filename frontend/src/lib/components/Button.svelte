<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  let cls = '';
  export { cls as class };
</script>

<div class={cls} on:click={(evt) => dispatch('click', evt)}>
  <span><slot>Click me!</slot></span>
</div>

<style>
  div {
    background-color: var(--primary);
    color: white;
    border: 1px solid var(--border);
    border-radius: 0.25rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
    transition:
      background-color 0.12s ease-in-out,
      border-color 0.12s ease-in-out;
    display: inline-block;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
  }
  div:hover {
    background-color: var(--primary-hover);
    border-color: var(--link);
  }
  span {
    /* style like a button */
    display: inline-block;
    vertical-align: middle;
  }
</style>
