<script lang="ts">
  import { onMount } from 'svelte';
  import {
    ABSENCE_PRESET_REASONS,
    defaultTraits,
    type AbsencePresetReason,
    type PersonnelTraits,
    type Slot,
    type Soldier
  } from '../lib/types';

  export let battery: string;
  export let room: string;
  export let reportDate: string;

  const SLOT_COUNT = 10;

  let slots: Slot[] = Array(SLOT_COUNT).fill(null);
  let selectedIndex: number | null = null;

  // 빈 자리용 - 신규 이름 입력
  let newName = '';

  // 채워진 자리용 - 드래프트 (저장 전 임시 편집값)
  let draft: Soldier | null = null;
  // 열외 사유 직접 입력 여부
  let useCustomReason = false;

  // ── storage ─────────────────────────────────────────────────────────────────
  function storageKey(): string {
    return `dk-personnel-${battery}-${room}`;
  }

  function load() {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Slot[];
      if (Array.isArray(parsed) && parsed.length === SLOT_COUNT) {
        slots = parsed;
      }
    } catch {
      // 파싱 실패 시 기본값 유지
    }
  }

  function persist() {
    localStorage.setItem(storageKey(), JSON.stringify(slots));
  }

  // ── slot 선택 ───────────────────────────────────────────────────────────────
  function selectSlot(index: number) {
    selectedIndex = index;
    const slot = slots[index];
    if (slot) {
      // 채워진 자리: draft 초기화
      draft = structuredClone(slot);
      useCustomReason = draft.traits.absence.reason === null && draft.traits.absence.isAbsent;
    } else {
      // 빈 자리: 이름 입력 초기화
      draft = null;
      newName = '';
    }
  }

  // ── 신규 인원 추가 ──────────────────────────────────────────────────────────
  function addSoldier() {
    if (selectedIndex === null) return;
    const trimmed = newName.trim();
    if (!trimmed) return;
    slots[selectedIndex] = { name: trimmed, traits: defaultTraits() };
    slots = [...slots];
    persist();
    // 추가 후 바로 특성 편집 패널로 전환
    draft = structuredClone(slots[selectedIndex] as Soldier);
    useCustomReason = false;
    newName = '';
  }

  // ── 드래프트 저장 ────────────────────────────────────────────────────────────
  function saveDraft() {
    if (selectedIndex === null || !draft) return;
    // 커스텀 사유 모드인데 추가로 reason이 남아 있으면 null 처리
    if (!draft.traits.absence.isAbsent) {
      draft.traits.absence.reason = null;
      draft.traits.absence.customReason = '';
    } else if (useCustomReason) {
      draft.traits.absence.reason = null;
    } else {
      draft.traits.absence.customReason = '';
    }
    slots[selectedIndex] = structuredClone(draft);
    slots = [...slots];
    persist();
    cancel();
  }

  // ── 인원 삭제 ───────────────────────────────────────────────────────────────
  function removeSlot() {
    if (selectedIndex === null) return;
    if (!confirm(`${slots[selectedIndex]?.name ?? '이 인원'}을(를) 삭제할까요?`)) return;
    slots[selectedIndex] = null;
    slots = [...slots];
    persist();
    cancel();
  }

  // ── 취소 ────────────────────────────────────────────────────────────────────
  function cancel() {
    selectedIndex = null;
    draft = null;
    newName = '';
    useCustomReason = false;
  }

  // ── 열외 사유 셀렉트 변경 ─────────────────────────────────────────────────────
  function onAbsenceReasonChange(event: Event) {
    if (!draft) return;
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (value === '__custom__') {
      useCustomReason = true;
      draft.traits.absence.reason = null;
    } else {
      useCustomReason = false;
      draft.traits.absence.customReason = '';
      draft.traits.absence.reason = (value as AbsencePresetReason) || null;
    }
  }

  // ── 반응형 헬퍼 ─────────────────────────────────────────────────────────────
  function absenceLabel(traits: PersonnelTraits): string {
    const a = traits.absence;
    if (!a.isAbsent) return '';
    if (a.reason) return a.reason;
    if (a.customReason) return a.customReason;
    return '열외';
  }

  // ── 반응형 집계 ─────────────────────────────────────────────────────────────
  $: soldiers = slots.filter((s): s is NonNullable<typeof s> => s !== null);
  $: total = soldiers.length;
  $: absentSoldiers = soldiers.filter((s) => s.traits.absence.isAbsent);
  $: absentCount = absentSoldiers.length;
  $: presentCount = total - absentCount;
  $: absenceBreakdown = (() => {
    const map = new Map<string, number>();
    for (const s of absentSoldiers) {
      const label = absenceLabel(s.traits) || '열외';
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return [...map.entries()].map(([label, count]) => `${label} ${count}`);
  })();

  onMount(load);
</script>

<section class="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-2xl bg-white p-8 shadow-sm">
  <header class="flex flex-col gap-1">
    <h2 class="text-xl font-bold">생활관 인원 관리</h2>
    <p class="text-sm text-slate-500">
      {battery === '본부' ? '본부' : `${battery}포대`} {room}생활관 · {reportDate}
    </p>
    <p class="text-sm text-slate-700">
      총원 {total}
      {#if absenceBreakdown.length > 0}
        열외 {absentCount}<br>
        열외내용 {absenceBreakdown.join(', ')}{absenceBreakdown.length === 1 || absenceBreakdown.length === 10 ? '를' : '을'} 제외한
      {/if}
      현재원 {presentCount}
    </p>
  </header>

  <!-- 2열 × 5행 그리드 -->
  <div class="grid grid-cols-2 gap-3">
    {#each slots as slot, i}
      <button
        type="button"
        on:click={() => selectSlot(i)}
        class="flex h-16 flex-col items-center justify-center rounded-xl border text-sm font-medium transition-colors
          {selectedIndex === i
            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-400'
            : slot
              ? slot.traits.absence.isAbsent
                ? 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100'
                : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              : 'border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:bg-slate-100'}"
      >
        {#if slot}
          <span>{slot.name}</span>
          {#if slot.traits.absence.isAbsent}
            <span class="mt-0.5 text-xs font-normal opacity-75">
              {absenceLabel(slot.traits)}
            </span>
          {/if}
        {:else}
          <span class="text-xl leading-none">+</span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- ── 패널: 빈 자리 → 이름 입력 ── -->
  {#if selectedIndex !== null && slots[selectedIndex] === null}
    <div class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
        신규 인원 추가 — {selectedIndex + 1}번 자리
      </p>
      <input
        class="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
        type="text"
        placeholder="이름 입력"
        bind:value={newName}
        on:keydown={(e) => e.key === 'Enter' && addSoldier()}
      />
      <div class="flex gap-2">
        <button
          type="button"
          on:click={addSoldier}
          class="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          추가
        </button>
        <button
          type="button"
          on:click={cancel}
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          취소
        </button>
      </div>
    </div>
  {/if}

  <!-- ── 패널: 채워진 자리 → 이름 + 특성 편집 ── -->
  {#if selectedIndex !== null && draft !== null}
    <div class="flex flex-col gap-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {selectedIndex + 1}번 자리 — {draft.name}
      </p>

      <!-- 이름 -->
      <div class="flex flex-col gap-1.5">
        <label for="draft-name" class="text-xs font-semibold text-slate-600">이름</label>
        <input
          id="draft-name"
          class="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
          type="text"
          bind:value={draft.name}
        />
      </div>

      <!-- 특성 1: 열외 여부 -->
      <div class="flex flex-col gap-2.5">
        <span class="text-xs font-semibold text-slate-600">① 열외 여부</span>

        <!-- Y / N 토글 -->
        <div class="flex gap-2">
          <button
            type="button"
            on:click={() => { if (draft) draft.traits.absence.isAbsent = true; }}
            class="flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors
              {draft.traits.absence.isAbsent
                ? 'border-orange-400 bg-orange-100 text-orange-700'
                : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50'}"
          >
            열외
          </button>
          <button
            type="button"
            on:click={() => { if (draft) { draft.traits.absence.isAbsent = false; draft.traits.absence.reason = null; draft.traits.absence.customReason = ''; useCustomReason = false; } }}
            class="flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors
              {!draft.traits.absence.isAbsent
                ? 'border-slate-700 bg-slate-800 text-white'
                : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50'}"
          >
            정상
          </button>
        </div>

        <!-- 열외 사유 (열외일 때만) -->
        {#if draft.traits.absence.isAbsent}
          <div class="flex flex-col gap-2">
            <span class="text-xs text-slate-500">열외 사유</span>
            <select
              value={useCustomReason ? '__custom__' : (draft.traits.absence.reason ?? ABSENCE_PRESET_REASONS[0])}
              on:change={onAbsenceReasonChange}
              class="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            >
              <option value="__custom__">직접 입력</option>
              {#each ABSENCE_PRESET_REASONS as reason}
                <option value={reason}>{reason}</option>
              {/each}
            </select>

            {#if useCustomReason}
              <input
                class="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                type="text"
                placeholder="사유 직접 입력"
                bind:value={draft.traits.absence.customReason}
              />
            {/if}
          </div>
        {/if}
      </div>

      <!-- 하단 버튼 -->
      <div class="flex gap-2 pt-1">
        <button
          type="button"
          on:click={saveDraft}
          class="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          저장
        </button>
        <button
          type="button"
          on:click={removeSlot}
          class="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          삭제
        </button>
        <button
          type="button"
          on:click={cancel}
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          취소
        </button>
      </div>
    </div>
  {/if}
</section>
