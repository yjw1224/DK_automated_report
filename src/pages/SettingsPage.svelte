<script lang="ts">
  export let onBack: () => void;
</script>

<main
  class="absolute inset-0 z-50 flex flex-col bg-slate-50 overflow-auto"
  aria-label="설정 창">
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-6 border border-slate-200 bg-white p-5 sm:p-8 rounded-b-2xl">
    <header class="flex items-center gap-3 border-b border-slate-200 pb-4">
      <button
        type="button"
        on:click={onBack}
        aria-label="돌아가기"
        class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-5 w-5"
          aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h2 class="text-xl font-bold text-slate-900">설정</h2>
    </header>

    <div class="flex flex-col gap-4">
      <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div class="mb-2 text-sm font-semibold text-slate-700">일반 설정</div>
        <div class="h-16 rounded-lg border border-dashed border-slate-300 bg-white" />
      </div>

      <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div class="mb-2 text-sm font-semibold text-slate-700">데이터 설정</div>
        <div class="h-16 rounded-lg border border-dashed border-slate-300 bg-white" />
      </div>
    </div>
  </div>
</main>
