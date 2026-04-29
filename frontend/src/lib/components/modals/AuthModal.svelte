<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import {
    getAuthChallenge,
    isPreferredUpbEmail,
    isStaffUpbEmail,
    isUpbEmail,
    requestAuthLink
  } from '$lib/auth';
  import { onMount } from 'svelte';

  let email = '';
  let loading = false;
  let message = '';
  let error = '';
  let challengeQuestion = '';
  let challengeToken = '';
  let challengeAnswer = '';

  $: normalizedEmail = email.trim().toLowerCase();
  $: isPreferredUniMail = isPreferredUpbEmail(normalizedEmail);
  $: isStaffMail = isStaffUpbEmail(normalizedEmail);
  $: isUpbMail = isUpbEmail(normalizedEmail);
  $: canSubmit =
    normalizedEmail.includes('@') &&
    challengeToken.length > 0 &&
    challengeAnswer.trim().length > 0 &&
    !loading;

  const loadChallenge = async () => {
    const challenge = await getAuthChallenge();
    challengeQuestion = challenge.question;
    challengeToken = challenge.token;
    challengeAnswer = '';
  };

  onMount(() => {
    loadChallenge().catch((caught) => {
      error = caught instanceof Error ? caught.message : 'Sicherheitsfrage konnte nicht geladen werden.';
    });
  });


  const submit = async () => {
    if (!canSubmit) return;

    loading = true;
    message = '';
    error = '';
    try {
      const result = await requestAuthLink(normalizedEmail, challengeToken, challengeAnswer.trim());
      message = `Wir haben einen Anmeldelink an ${result.email} gesendet.`;
      email = result.email;
      await loadChallenge();
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Es ist ein unbekannter Fehler aufgetreten.';
      await loadChallenge().catch(() => undefined);
    } finally {
      loading = false;
    }
  };
</script>

<h1 class="text-3xl">Pauline Konto</h1>

<p>
  Mit einem Konto kannst du deinen Kalender speichern und auf mehreren Geräten nutzen. Gib deine
  E-Mail-Adresse ein und wir schicken dir einen Anmeldelink.
</p>

<div class="notice" class:strong={isPreferredUniMail}>
  <strong>Empfohlen für Uni Paderborn:</strong>
  Nutze am besten deine Uni-Mail wie <code>benutzername@mail.uni-paderborn.de</code> oder
  <code>benutzername@campus.uni-paderborn.de</code>. Kurzformen wie
  <code>benutzername@mail.upb.de</code> und <code>benutzername@campus.upb.de</code> gehen auch.
  Angestellte können außerdem <code>vorname.nachname@uni-paderborn.de</code> oder
  <code>vorname.nachname@upb.de</code> nutzen.
</div>



<form on:submit|preventDefault={submit} class="flex items-stretch flex-col pt-3">
  <label for="email">E-Mail-Adresse</label>
  <input
    id="email"
    bind:value={email}
    type="email"
    name="email"
    autocomplete="email"
    placeholder="benutzername@mail.uni-paderborn.de"
    class:upb={isUpbMail}
    class="border border-gray-400 px-4 py-2 mb-2"
    required
  />
  {#if normalizedEmail && !isUpbMail}
    <p class="hint">
      Diese Adresse ist okay. Für spätere Uni-Funktionen ist eine Uni-Paderborn-Adresse aber die
      beste Wahl.
    </p>
  {:else if isPreferredUniMail}
    <p class="hint success">Sieht nach einer empfohlenen Uni-Adresse aus.</p>
  {:else if isStaffMail}
    <p class="hint success">Sieht nach einer Angestellten-Adresse der Uni Paderborn aus.</p>
  {/if}

  <label for="challengeAnswer">Sicherheitsfrage: {challengeQuestion || 'wird geladen…'}</label>
  <input
    id="challengeAnswer"
    bind:value={challengeAnswer}
    type="text"
    name="challengeAnswer"
    autocomplete="off"
    class="border border-gray-400 px-4 py-2 mb-4"
    required
  />


  <Button
    class="mb-2"
    on:click={() => {
      submit();
    }}
  >
    {loading ? 'Bitte warten…' : 'Anmeldelink senden'}
  </Button>
</form>

{#if error}
  <p class="error">{error}</p>
{/if}
{#if message}
  <p class="success">{message}</p>
{/if}

<style>
  p {
    margin: 1em 0;
  }

  code {
    background: rgba(0, 0, 0, 0.08);
    border-radius: 0.2em;
    padding: 0.1em 0.25em;
  }

  label {
    font-weight: 600;
    margin-top: 0.5em;
  }

  .notice {
    border-left: 0.35rem solid var(--primary);
    background: rgba(0, 0, 0, 0.04);
    margin: 1em 0;
    padding: 0.75em 1em;
  }

  .notice.strong {
    background: rgba(34, 197, 94, 0.12);
  }

  .hint {
    color: #475569;
  }

  .hint {
    font-size: 0.9em;
    margin: 0 0 0.75em;
  }

  .success {
    color: #047857;
  }

  .error {
    color: #b91c1c;
  }

  .upb {
    border-color: #047857;
  }

</style>
