<script lang="ts">
  import { onMount } from "svelte";
  import {
    defaultAppSettings,
    getAppSettings,
    setAppSettings,
  } from "../lib/settings";

  export let onBack: () => void;

  let settings = defaultAppSettings();

  onMount(() => {
    settings = getAppSettings();
  });

  function onAutoDeletePastLeavesChange(event: Event) {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    settings = setAppSettings({
      ...settings,
      autoDeletePastLeaves: checked,
    });
  }

  function onPromotionAlertEnabledChange(event: Event) {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    settings = setAppSettings({
      ...settings,
      promotionAlertEnabled: checked,
    });
  }
</script>

<main
  class="absolute inset-0 z-50 flex flex-col bg-slate-50 overflow-auto"
  aria-label="설정 창">
  <div class="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 border border-slate-200 bg-white p-5 sm:p-8">
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
        <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">인원 관리</div>
        <label
          class="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
          <span class="flex min-w-0 flex-col gap-1 pr-3">
            <span class="text-sm font-medium text-slate-800">지난 이벤트 자동 삭제</span>
            <span class="text-xs text-slate-500">오늘 날짜 이전의 출타 및 면회는 자동으로 삭제됩니다.</span>
          </span>
          <input
            type="checkbox"
            bind:checked={settings.autoDeletePastLeaves}
            on:change={onAutoDeletePastLeavesChange}
            class="h-4 w-4 self-center rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
        </label>

        <label
          class="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
          <span class="flex min-w-0 flex-col gap-1 pr-3">
            <span class="text-sm font-medium text-slate-800">빠른 진급 반영</span>
            <span class="text-xs text-slate-500">매월 1일마다 사용자가 선택한 진급자의 계급을 변경합니다.</span>
          </span>
          <input
            type="checkbox"
            bind:checked={settings.promotionAlertEnabled}
            on:change={onPromotionAlertEnabledChange}
            class="h-4 w-4 self-center rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
        </label>
      </div>
    </div>
  </div>
</main>
