<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  let cls = '';
  export { cls as class };
</script>

<button type="button" class={cls} on:click={(evt) => dispatch('click', evt)}>
  <span><slot>Click me!</slot></span>
</button>

<style>
  button {
    /* button */
    /* fallback to primary blue */
    background-color: var(--primary);
    /* fallback to white */
    color: white;
    /* style like a button */
    border: none;
    border-radius: 0;
    padding: 0.5rem 1rem;
    cursor: pointer;
    transition: background-color 0.1s ease-in-out;
    display: inline-block;
    /* light shadow */
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  button:hover {
    filter: brightness(85%);
  }
  span {
    /* style like a button */
    display: inline-block;
    vertical-align: middle;
  }
</style>
