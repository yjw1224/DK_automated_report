<script lang="ts">
  import { onDestroy } from 'svelte';
  import { buildMessage, type GroupSettings } from '../lib/messageBuilder';
  import type { Slot } from '../lib/types';

  export let battery: string;
  export let room: string;
  export let reportDate: string;
  export let slots: Slot[];
  export let group: GroupSettings;
  export let visible = false;

  let copied = false;
  let copyTimeout: ReturnType<typeof setTimeout> | null = null;

  $: message = visible
    ? buildMessage({ battery, room, reportDate, slots, group })
    : '';

  function close() {
    visible = false;
    copied = false;
  }

  /** 복사 성공 피드백 (2초간 체크 표시) */
  function showCopiedFeedback() {
    copied = true;
    if (copyTimeout) clearTimeout(copyTimeout);
    copyTimeout = setTimeout(() => { copied = false; }, 2000);
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      // fallback: 구형 브라우저 대응
      const ta = Object.assign(document.createElement('textarea'), {
        value: message,
        style: 'position:fixed;opacity:0',
      });
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    showCopiedFeedback();
  }

  async function shareMessage() {
    // Web Share API 지원 시 (모바일 크롬 등)
    if (navigator.share) {
      try {
        await navigator.share({ text: message });
        return;
      } catch (e: any) {
        // 사용자가 공유 취소한 경우 무시
        if (e?.name === 'AbortError') return;
      }
    }
    // 미지원 브라우저: 클립보드 복사 fallback
    await copyToClipboard();
  }

  function handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  onDestroy(() => { if (copyTimeout) clearTimeout(copyTimeout); });
</script>

{#if visible}
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <div
    role="dialog"
    aria-modal="true"
    aria-label="메시지 미리보기"
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
    on:click={handleOverlayClick}
    on:keydown={handleKeydown}
  >
    <div
      class="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl"
    >
      <!-- 헤더 -->
      <div class="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <h3 class="text-base font-bold text-slate-800">메시지 미리보기</h3>
        <button
          type="button"
          on:click={close}
          class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="닫기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <!-- 메시지 본문 -->
      <div class="flex-1 overflow-y-auto px-5 py-4">
        <pre class="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 font-sans">{message}</pre>
      </div>

      <!-- 하단 버튼 -->
      <div class="flex gap-2 border-t border-slate-200 px-5 py-3">
        <button
          type="button"
          on:click={shareMessage}
          class="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors
            {copied
              ? 'bg-green-600 text-white'
              : 'bg-slate-900 text-white hover:bg-slate-700'}"
        >
          {copied ? '✓ 복사 완료' : '공유하기'}
        </button>
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
