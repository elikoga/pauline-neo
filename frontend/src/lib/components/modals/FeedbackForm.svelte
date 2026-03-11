<script lang="ts">
  import Button from '$lib/components/Button.svelte';

  // this posts to /sendFeedback with `issueText`
  // and `title`
  // don't redirect!
  let issueText = '';
  let title = '';
  let sent = false;
  let message = '';

  let formElement: HTMLFormElement;
</script>

{#if sent}
  {message}
{:else}
  <form
    action="/sendFeedback"
    method="post"
    target="emptyIframe"
    bind:this={formElement}
    on:submit|preventDefault={async () => {
      const result = await fetch('/sendFeedback', {
        method: 'POST',
        body: new URLSearchParams({
          issueText,
          title
        })
      });
      if (result.ok) {
        message = await result.text();
      } else {
        message = 'There was an error sending your feedback. Please try again later.';
      }
      sent = true;
      return false;
      // items should have full width withing form
    }}
    class="flex items-stretch flex-col pt-3"
  >
    <input
      bind:value={title}
      type="text"
      name="title"
      placeholder="Titel"
      class="border border-gray-400 px-4 py-2 mb-4"
    />
    <textarea
      bind:value={issueText}
      name="issueText"
      rows="10"
      cols="50"
      class="border border-gray-400 px-4 py-2 mb-4"
      placeholder="Dein Feedback"
    />
    <Button
      class="mb-2"
      on:click={() => {
        formElement.dispatchEvent(
          new Event('submit', {
            cancelable: true
          })
        );
        return false;
      }}
    >
      <input type="submit" value="Feedback senden" class="cursor-pointer" />
    </Button>
  </form>
{/if}

<style>
  textarea {
    height: 200px;
    font-family: sans-serif;
  }
</style>
