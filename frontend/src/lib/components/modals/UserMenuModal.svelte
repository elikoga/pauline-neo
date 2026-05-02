<script lang="ts">
  import { getContext } from 'svelte';
  import { onMount } from 'svelte';
  import Button from '$lib/components/Button.svelte';
  import { modalStore } from '$lib/modal';
  import TimetablesModal from './TimetablesModal.svelte';
  import {
    authState,
    logoutAccount,
    getAuthChallenge,
    isPreferredUpbEmail,
    isStaffUpbEmail,
    isUpbEmail,
    requestAuthLink
  } from '$lib/auth';
  import { sidebarAutoHide } from '$lib/preferences';

  const { close } = getContext<{ close: () => void }>('simple-modal');

  const openTimetables = () => {
    close();
    setTimeout(() => { $modalStore = TimetablesModal; }, 150);
  };

  // --- Login form state (inlined from AuthModal) ---
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
    if (!$authState.account) {
      loadChallenge().catch((caught) => {
        error = caught instanceof Error ? caught.message : 'Sicherheitsfrage konnte nicht geladen werden.';
      });
    }
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

<h1 class="text-3xl">Menü</h1>

<!-- ── Account / Login ─────────────────────────── -->
{#if $authState.account}
  <div class="section">
    <p class="section-label">Konto</p>
    <p class="account-email">{$authState.account.email}</p>
    <Button on:click={() => { logoutAccount(); }}>Abmelden</Button>
  </div>
{:else}
  <div class="section">
    <p class="section-label">Anmelden</p>
    <p class="login-hint">
      Mit einem Konto kannst du deinen Stundenplan auf dem Server speichern und auf mehreren Geräten
      nutzen.
    </p>

    <form on:submit|preventDefault={submit} class="login-form">
      <label for="email">E-Mail-Adresse</label>
      <input
        id="email"
        bind:value={email}
        type="email"
        name="email"
        autocomplete="email"
        placeholder="benutzername@mail.uni-paderborn.de"
        class:upb={isUpbMail}
        class="login-input"
        required
      />
      {#if normalizedEmail && !isUpbMail}
        <p class="hint">Okay — eine Uni-Adresse wäre aber besser.</p>
      {:else if isPreferredUniMail}
        <p class="hint success">Empfohlene Uni-Adresse.</p>
      {:else if isStaffMail}
        <p class="hint success">Angestellten-Adresse der Uni Paderborn.</p>
      {/if}

      <label for="challengeAnswer">Sicherheitsfrage: {challengeQuestion || 'wird geladen…'}</label>
      <input
        id="challengeAnswer"
        bind:value={challengeAnswer}
        type="text"
        name="challengeAnswer"
        autocomplete="off"
        class="login-input"
        required
      />

      {#if error}
        <p class="error">{error}</p>
      {/if}
      {#if message}
        <p class="success">{message}</p>
      {/if}

      <Button type="submit">{loading ? 'Bitte warten…' : 'Anmeldelink senden'}</Button>
    </form>
  </div>
{/if}

<hr class="divider" />

<!-- ── Stundenpläne ───────────────────────────── -->
<div class="section">
  <p class="section-label">Stundenpläne</p>
  <Button on:click={openTimetables}>Stundenpläne öffnen</Button>
</div>

<hr class="divider" />

<!-- ── Einstellungen ──────────────────────────── -->
<div class="section">
  <p class="section-label">Einstellungen</p>
  <label class="toggle-row">
    <span>Sidebar verbergen erlauben <span class="preference-note">(nur auf breiten Bildschirmen)</span></span>
    <input type="checkbox" bind:checked={$sidebarAutoHide} />
    <span class="toggle-slider"></span>
  </label>
</div>

<style>
  .section {
    margin: 0.75em 0;
  }

  .section-label {
    font-size: 0.75em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
    margin: 0 0 0.5em;
  }

  .divider {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 0.5em 0;
  }

  /* ── Account ── */
  .account-email {
    color: #64748b;
    font-size: 0.85em;
    margin: 0 0 0.75em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ── Login form ── */
  .login-hint {
    font-size: 0.85em;
    color: #64748b;
    margin: 0 0 0.75em;
  }

  .login-form {
    display: flex;
    flex-direction: column;
  }

  .login-form label {
    font-weight: 600;
    font-size: 0.85em;
    margin-top: 0.5em;
  }

  .login-input {
    border: 1px solid #94a3b8;
    padding: 0.4rem 0.5rem;
    font-size: 0.9em;
  }

  .login-input.upb {
    border-color: #047857;
  }

  .hint {
    font-size: 0.8em;
    color: #475569;
    margin: 0.25em 0 0;
  }

  .success {
    color: #047857;
    font-size: 0.85em;
  }

  .error {
    color: #b91c1c;
    font-size: 0.85em;
  }

  /* ── Toggle ── */
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

  .preference-note {
    font-weight: 400;
    font-size: 0.8em;
    color: #94a3b8;
  }
</style>
