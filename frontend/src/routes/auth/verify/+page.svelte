<script lang="ts">
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import { verifyAccount, authState } from '$lib/auth';

  let message = 'Anmeldelink wird geprüft…';
  let error = '';

  onMount(async () => {
    const token = new URL(window.location.href).searchParams.get('token');
    if (!token) {
      error = 'Der Anmeldelink enthält keinen Token.';
      return;
    }

    try {
      await verifyAccount(token);
      // The store debounces its localStorage write (100ms).
      // Write synchronously so the auth state survives the hard reload.
      localStorage.setItem('authState', JSON.stringify(get(authState)));
      window.location.href = '/';
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Anmeldung fehlgeschlagen.';
    }
  });
</script>

<h1 class="text-3xl">Pauline Anmeldung</h1>

{#if error}
  <p class="error">{error}</p>
{:else}
  <p class="success">{message}</p>
{/if}

<style>
  p {
    margin: 1em 0;
  }

  .success {
    color: #047857;
  }

  .error {
    color: #b91c1c;
  }
</style>
