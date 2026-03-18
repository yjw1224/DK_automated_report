<script lang="ts">
  export let visible = false;
  export let dontShowAgain = false;
  export let version = "";
  export let date = "";
  export let message = "";

  function close() {
    visible = false;
  }

  function handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }
</script>

{#if visible}
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <div
    role="dialog"
    aria-modal="true"
    aria-label="업데이트 로그"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    on:click={handleOverlayClick}
    on:keydown={handleKeydown}
  >
    <div class="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
      <div class="border-b border-slate-200 px-5 py-3">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-base font-bold text-slate-800">업데이트 로그</h3>
          {#if version}
            <span class="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
              v{version}
            </span>
          {/if}
        </div>
        {#if date}
          <p class="text-xs text-slate-500">{date}</p>
        {/if}
      </div>

      <div class="h-[320px] overflow-y-auto px-5 py-4 sm:h-[360px]">
        <div class="min-h-[180px] rounded-xl bg-slate-50 p-4">
          {#if message.trim()}
            <pre class="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 font-sans">{message}</pre>
          {:else}
            <p class="text-sm text-slate-400">추후 작성 예정</p>
          {/if}
        </div>
      </div>

      <div class="flex items-center justify-between border-t border-slate-200 px-5 py-3">
        <label class="inline-flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            bind:checked={dontShowAgain}
            class="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
          />
          다시 보지 않기
        </label>
        <button
          type="button"
          on:click={close}
          class="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          닫기
        </button>
      </div>
    </div>
  </div>
{/if}
