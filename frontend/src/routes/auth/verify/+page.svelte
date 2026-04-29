<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
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
      const session = await verifyAccount(token);
      message = `Angemeldet als ${session.account.email}.`;
      setTimeout(() => goto('/'), 1000);
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
