<script lang="ts">
  import { onMount } from 'svelte';
  import { verifyAccount } from '$lib/auth';

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
