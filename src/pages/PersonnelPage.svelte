<script lang="ts">
  import { onMount, tick } from 'svelte';
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

  /**
   * 인원 슬롯 배열: 2열 × 5행 = 최대 10명
   * 각 슬롯은 Soldier 객체이거나 null (빈 자리)
   */
  let slots: Slot[] = Array(SLOT_COUNT).fill(null);
  let selectedIndex: number | null = null;

  // 빈 자리용 - 신규 이름 입력
  let newName = '';
  let nameInputEl: HTMLInputElement | null = null;

  // 채워진 자리용 - 드래프트 (저장 전 임시 편집값)
  let draft: Soldier | null = null;
  // 열외 사유 직접 입력 여부
  let useCustomReason = false;
  // 저장 시도 여부 (유효성 표시용)
  let saveAttempted = false;

  // ── 단체 설정 ────────────────────────────────────────────────────────────────
  let civHaircut: { enabled: boolean; members: string[] } = { enabled: false, members: [] };

  const RELIGIONS = ['기독교', '천주교', '불교'] as const;
  type Religion = typeof RELIGIONS[number];
  let religion: Record<Religion, string[]> = { '기독교': [], '천주교': [], '불교': [] };

  const MIL_TRAININGS = ['사격', '체력 측정', 'TCCC', '화생방', '정신전력'] as const;
  type MilTraining = typeof MIL_TRAININGS[number];
  let milTrainingEnabled = false;
  let milTraining: Record<MilTraining, string[]> = { '사격': [], '체력 측정': [], 'TCCC': [], '화생방': [], '정신전력': [] };

  type DeliveryOrder = { date: string; type: string; members: string[] };
  let deliveryEnabled = false;
  let deliveryOrders: DeliveryOrder[] = [];

  // ── storage ─────────────────────────────────────────────────────────────────
  function storageKey(): string {
    return `dk-personnel-${battery}-${room}`;
  }

  function groupStorageKey(): string {
    return `dk-group-${battery}-${room}`;
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
    const rawGroup = localStorage.getItem(groupStorageKey());
    if (rawGroup) {
      try {
        const parsedGroup = JSON.parse(rawGroup);
        if (parsedGroup?.civHaircut) civHaircut = parsedGroup.civHaircut;
        if (parsedGroup?.religion) religion = parsedGroup.religion;
        if (parsedGroup?.milTrainingEnabled !== undefined) milTrainingEnabled = parsedGroup.milTrainingEnabled;
        if (parsedGroup?.milTraining) milTraining = parsedGroup.milTraining;
        if (parsedGroup?.deliveryEnabled !== undefined) deliveryEnabled = parsedGroup.deliveryEnabled;
        if (parsedGroup?.deliveryOrders) deliveryOrders = parsedGroup.deliveryOrders;
      } catch {
        // 파싱 실패 시 기본값 유지
      }
    }
  }

  function persist() {
    localStorage.setItem(storageKey(), JSON.stringify(slots));
  }

  function persistGroup() {
    localStorage.setItem(groupStorageKey(), JSON.stringify({ civHaircut, religion, milTrainingEnabled, milTraining, deliveryEnabled, deliveryOrders }));
  }

  function toggleCivHaircutMember(name: string) {
    if (civHaircut.members.includes(name)) {
      civHaircut.members = civHaircut.members.filter((n) => n !== name);
    } else {
      civHaircut.members = [...civHaircut.members, name];
    }
    persistGroup();
  }

  function toggleReligionMember(rel: Religion, name: string) {
    const inThis = religion[rel].includes(name);
    // 모든 종교에서 먼저 제거 (한 명당 최대 하나)
    for (const r of RELIGIONS) {
      religion[r] = religion[r].filter((n) => n !== name);
    }
    // 다른 종교에 있었거나, 같은 종교를 재클릭하지 않은 경우 추가
    if (!inThis) {
      religion[rel] = [...religion[rel], name];
    }
    religion = { ...religion };
    persistGroup();
  }

  function toggleMilTrainingMember(cat: MilTraining, name: string) {
    if (milTraining[cat].includes(name)) {
      milTraining[cat] = milTraining[cat].filter((n) => n !== name);
    } else {
      milTraining[cat] = [...milTraining[cat], name];
    }
    milTraining = { ...milTraining };
    persistGroup();
  }

  function addDeliveryOrder() {
    deliveryOrders = [...deliveryOrders, { date: reportDate, type: '', members: [] }];
    persistGroup();
  }

  function removeDeliveryOrder(idx: number) {
    deliveryOrders = deliveryOrders.filter((_, i) => i !== idx);
    persistGroup();
  }

  function toggleDeliveryMember(idx: number, name: string) {
    const order = deliveryOrders[idx];
    if (order.members.includes(name)) {
      order.members = order.members.filter((n) => n !== name);
    } else {
      order.members = [...order.members, name];
    }
    deliveryOrders = [...deliveryOrders];
    persistGroup();
  }

  // ── slot 선택 ───────────────────────────────────────────────────────────────
  async function selectSlot(index: number) {
    // 이미 선택된 자리 재클릭 시 토글(닫기)
    if (selectedIndex === index) {
      cancel();
      return;
    }
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
      // DOM 업데이트 후 input에 포커스
      await tick();
      nameInputEl?.focus();
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
    saveAttempted = true;
    // 유효성 검사
    if (useCustomReason && draft.traits.absence.isAbsent && !draft.traits.absence.customReason.trim()) return;
    if (draft.traits.vacation.hasVacation && (!draft.traits.vacation.startDate || !draft.traits.vacation.endDate)) return;
    if (draft.traits.outpatient.hasOutpatient && (!draft.traits.outpatient.date || !draft.traits.outpatient.place.trim())) return;
    if (draft.traits.visit.hasVisit && (!draft.traits.visit.date || !draft.traits.visit.visitor.trim())) return;
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
    saveAttempted = false;
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
        bind:this={nameInputEl}
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
        <span class="border-b border-slate-200 pb-1 text-sm font-bold text-slate-700">열외</span>

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
                class="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2
                  {saveAttempted && !draft.traits.absence.customReason.trim()
                    ? 'border-red-400 bg-red-50 ring-red-400'
                    : 'border-slate-300 ring-blue-500'}"
                type="text"
                placeholder="사유 직접 입력"
                bind:value={draft.traits.absence.customReason}
              />
              {#if saveAttempted && !draft.traits.absence.customReason.trim()}
                <p class="text-xs text-red-500">열외 사유를 입력해 주세요.</p>
              {/if}
            {/if}
          </div>
        {/if}
      </div>

      <!-- 특성: 휴가 -->
      <div class="flex flex-col gap-2">
        <span class="border-b border-slate-200 pb-1 text-sm font-bold text-slate-700">휴가</span>

        <!-- 있음 / 없음 토글 -->
        <div class="flex gap-2">
          <button
            type="button"
            on:click={() => { if (draft) draft.traits.vacation.hasVacation = true; }}
            class="flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors
              {draft.traits.vacation.hasVacation
                ? 'border-blue-400 bg-blue-100 text-blue-700'
                : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50'}"
          >
            있음
          </button>
          <button
            type="button"
            on:click={() => { if (draft) { draft.traits.vacation.hasVacation = false; draft.traits.vacation.startDate = ''; draft.traits.vacation.endDate = ''; } }}
            class="flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors
              {!draft.traits.vacation.hasVacation
                ? 'border-slate-700 bg-slate-800 text-white'
                : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50'}"
          >
            없음
          </button>
        </div>

        <!-- 날짜 피커 (있음일 때만) -->
        {#if draft.traits.vacation.hasVacation}
          <div class="flex flex-col gap-2 rounded-lg bg-white p-3 border border-slate-200">
            <div class="flex items-center gap-2">
              <span class="w-10 shrink-0 text-xs text-slate-500">시작</span>
              <input
                type="date"
                bind:value={draft.traits.vacation.startDate}
                class="flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2
                  {saveAttempted && !draft.traits.vacation.startDate
                    ? 'border-red-400 bg-red-50 ring-red-400'
                    : 'border-slate-300 ring-blue-500'}"
              />
            </div>
            <div class="flex items-center gap-2">
              <span class="w-10 shrink-0 text-xs text-slate-500">종료</span>
              <input
                type="date"
                bind:value={draft.traits.vacation.endDate}
                min={draft.traits.vacation.startDate || undefined}
                class="flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2
                  {saveAttempted && !draft.traits.vacation.endDate
                    ? 'border-red-400 bg-red-50 ring-red-400'
                    : 'border-slate-300 ring-blue-500'}"
              />
            </div>
            {#if saveAttempted && (!draft.traits.vacation.startDate || !draft.traits.vacation.endDate)}
              <p class="text-xs text-red-500">시작일과 종료일을 모두 선택해 주세요.</p>
            {/if}
            {#if draft.traits.vacation.startDate && draft.traits.vacation.endDate}
              <p class="text-center text-xs text-slate-600">
                {new Date(draft.traits.vacation.startDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                ~
                {new Date(draft.traits.vacation.endDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
              </p>
            {/if}
          </div>
        {/if}
      </div>

      <!-- 특성: 외진 -->
      <div class="flex flex-col gap-2">
        <span class="border-b border-slate-200 pb-1 text-sm font-bold text-slate-700">외진</span>

        <!-- Y / N 토글 -->
        <div class="flex gap-2">
          <button
            type="button"
            on:click={() => { if (draft) draft.traits.outpatient.hasOutpatient = true; }}
            class="flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors
              {draft.traits.outpatient.hasOutpatient
                ? 'border-blue-400 bg-blue-100 text-blue-700'
                : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50'}"
          >
            있음
          </button>
          <button
            type="button"
            on:click={() => { if (draft) { draft.traits.outpatient.hasOutpatient = false; draft.traits.outpatient.date = ''; draft.traits.outpatient.place = ''; } }}
            class="flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors
              {!draft.traits.outpatient.hasOutpatient
                ? 'border-slate-700 bg-slate-800 text-white'
                : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50'}"
          >
            없음
          </button>
        </div>

        <!-- 날짜 + 장소 (있음일 때만) -->
        {#if draft.traits.outpatient.hasOutpatient}
          <div class="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3">
            <div class="flex items-center gap-2">
              <span class="w-10 shrink-0 text-xs text-slate-500">날짜</span>
              <input
                type="date"
                bind:value={draft.traits.outpatient.date}
                class="flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2
                  {saveAttempted && !draft.traits.outpatient.date
                    ? 'border-red-400 bg-red-50 ring-red-400'
                    : 'border-slate-300 ring-blue-500'}"
              />
            </div>
            <div class="flex items-center gap-2">
              <span class="w-10 shrink-0 text-xs text-slate-500">장소</span>
              <input
                type="text"
                placeholder="외진 장소 입력"
                bind:value={draft.traits.outpatient.place}
                class="min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2
                  {saveAttempted && !draft.traits.outpatient.place.trim()
                    ? 'border-red-400 bg-red-50 ring-red-400'
                    : 'border-slate-300 ring-blue-500'}"
              />
            </div>
            {#if saveAttempted && (!draft.traits.outpatient.date || !draft.traits.outpatient.place.trim())}
              <p class="text-xs text-red-500">날짜와 장소를 모두 입력해 주세요.</p>
            {/if}
          </div>
        {/if}
      </div>

      <!-- 특성: 면회 -->
      <div class="flex flex-col gap-2">
        <span class="border-b border-slate-200 pb-1 text-sm font-bold text-slate-700">면회</span>

        <!-- Y / N 토글 -->
        <div class="flex gap-2">
          <button
            type="button"
            on:click={() => { if (draft) draft.traits.visit.hasVisit = true; }}
            class="flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors
              {draft.traits.visit.hasVisit
                ? 'border-blue-400 bg-blue-100 text-blue-700'
                : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50'}"
          >
            있음
          </button>
          <button
            type="button"
            on:click={() => { if (draft) { draft.traits.visit.hasVisit = false; draft.traits.visit.date = ''; draft.traits.visit.visitor = ''; } }}
            class="flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors
              {!draft.traits.visit.hasVisit
                ? 'border-slate-700 bg-slate-800 text-white'
                : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50'}"
          >
            없음
          </button>
        </div>

        <!-- 날짜 + 면회자 (있음일 때만) -->
        {#if draft.traits.visit.hasVisit}
          <div class="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3">
            <div class="flex items-center gap-2">
              <span class="w-12 shrink-0 text-xs text-slate-500">날짜</span>
              <input
                type="date"
                bind:value={draft.traits.visit.date}
                class="min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2
                  {saveAttempted && !draft.traits.visit.date
                    ? 'border-red-400 bg-red-50 ring-red-400'
                    : 'border-slate-300 ring-blue-500'}"
              />
            </div>
            <div class="flex items-center gap-2">
              <span class="w-12 shrink-0 text-xs text-slate-500">면회자</span>
              <input
                type="text"
                placeholder="면회자 이름 입력"
                bind:value={draft.traits.visit.visitor}
                class="min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2
                  {saveAttempted && !draft.traits.visit.visitor.trim()
                    ? 'border-red-400 bg-red-50 ring-red-400'
                    : 'border-slate-300 ring-blue-500'}"
              />
            </div>
            {#if saveAttempted && (!draft.traits.visit.date || !draft.traits.visit.visitor.trim())}
              <p class="text-xs text-red-500">날짜와 면회자를 모두 입력해 주세요.</p>
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

  <!-- ── 단체 설정 ── -->
  <div class="flex flex-col gap-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">단체 설정</p>

    <!-- 민간 이발 -->
    <div class="flex flex-col gap-2">
      <span class="border-b border-slate-200 pb-1 text-sm font-bold text-slate-700">민간 이발</span>
      <div class="flex gap-2">
        <button
          type="button"
          on:click={() => { civHaircut.enabled = true; persistGroup(); }}
          class="flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors
            {civHaircut.enabled
              ? 'border-blue-400 bg-blue-100 text-blue-700'
              : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50'}"
        >
          있음
        </button>
        <button
          type="button"
          on:click={() => { civHaircut.enabled = false; civHaircut.members = []; persistGroup(); }}
          class="flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors
            {!civHaircut.enabled
              ? 'border-slate-700 bg-slate-800 text-white'
              : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50'}"
        >
          없음
        </button>
      </div>

      {#if civHaircut.enabled}
        <div class="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3">
          <span class="text-xs text-slate-500">해당 인원 선택 (중복 가능)</span>
          {#if soldiers.length === 0}
            <p class="text-xs text-slate-400">등록된 인원이 없습니다.</p>
          {:else}
            <div class="flex flex-wrap gap-2">
              {#each soldiers as soldier}
                <button
                  type="button"
                  on:click={() => toggleCivHaircutMember(soldier.name)}
                  class="rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors
                    {civHaircut.members.includes(soldier.name)
                      ? 'border-blue-400 bg-blue-100 text-blue-700'
                      : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50'}"
                >
                  {soldier.name}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- 종교 -->
    <div class="flex flex-col gap-2">
      <span class="border-b border-slate-200 pb-1 text-sm font-bold text-slate-700">종교</span>
      {#if soldiers.length === 0}
        <p class="text-xs text-slate-400">등록된 인원이 없습니다.</p>
      {:else}
        {#each RELIGIONS as rel}
          <div class="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-3">
            <span class="text-xs font-semibold text-slate-500">{rel}</span>
            <div class="flex flex-wrap gap-2">
              {#each soldiers as soldier}
                {@const assigned = RELIGIONS.find((r) => religion[r].includes(soldier.name))}
                <button
                  type="button"
                  on:click={() => toggleReligionMember(rel, soldier.name)}
                  class="rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors
                    {religion[rel].includes(soldier.name)
                      ? 'border-blue-400 bg-blue-100 text-blue-700'
                      : assigned
                        ? 'border-slate-200 bg-slate-100 text-slate-300'
                        : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50'}"
                >
                  {soldier.name}
                </button>
              {/each}
            </div>
          </div>
        {/each}
      {/if}
    </div>
    <!-- 병기본 -->
    <div class="flex flex-col gap-2">
      <span class="border-b border-slate-200 pb-1 text-sm font-bold text-slate-700">병기본</span>
      <div class="flex gap-2">
        <button
          type="button"
          on:click={() => { milTrainingEnabled = true; persistGroup(); }}
          class="flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors
            {milTrainingEnabled
              ? 'border-blue-400 bg-blue-100 text-blue-700'
              : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50'}"
        >
          있음
        </button>
        <button
          type="button"
          on:click={() => { milTrainingEnabled = false; for (const c of MIL_TRAININGS) milTraining[c] = []; milTraining = { ...milTraining }; persistGroup(); }}
          class="flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors
            {!milTrainingEnabled
              ? 'border-slate-700 bg-slate-800 text-white'
              : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50'}"
        >
          없음
        </button>
      </div>

      {#if milTrainingEnabled}
        {#if soldiers.length === 0}
          <p class="text-xs text-slate-400">등록된 인원이 없습니다.</p>
        {:else}
          {#each MIL_TRAININGS as cat}
            <div class="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-3">
              <span class="text-xs font-semibold text-slate-500">{cat}</span>
              <div class="flex flex-wrap gap-2">
                {#each soldiers as soldier}
                  <button
                    type="button"
                    on:click={() => toggleMilTrainingMember(cat, soldier.name)}
                    class="rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors
                      {milTraining[cat].includes(soldier.name)
                        ? 'border-blue-400 bg-blue-100 text-blue-700'
                        : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50'}"
                  >
                    {soldier.name}
                  </button>
                {/each}
              </div>
            </div>
          {/each}
        {/if}
      {/if}
    </div>
    <!-- 배달 음식 -->
    <div class="flex flex-col gap-2">
      <span class="border-b border-slate-200 pb-1 text-sm font-bold text-slate-700">배달 음식</span>
      <div class="flex gap-2">
        <button
          type="button"
          on:click={() => { deliveryEnabled = true; if (deliveryOrders.length === 0) deliveryOrders = [{ date: reportDate, type: '', members: [] }]; persistGroup(); }}
          class="flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors
            {deliveryEnabled
              ? 'border-blue-400 bg-blue-100 text-blue-700'
              : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50'}"
        >
          있음
        </button>
        <button
          type="button"
          on:click={() => { deliveryEnabled = false; deliveryOrders = []; persistGroup(); }}
          class="flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors
            {!deliveryEnabled
              ? 'border-slate-700 bg-slate-800 text-white'
              : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50'}"
        >
          없음
        </button>
      </div>

      {#if deliveryEnabled}
        <div class="flex flex-col gap-3">
          {#each deliveryOrders as order, idx}
            <div class="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-500">주문 {idx + 1}</span>
                <button
                  type="button"
                  on:click={() => removeDeliveryOrder(idx)}
                  class="text-xs font-semibold text-red-400 hover:text-red-600"
                >
                  삭제
                </button>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-10 shrink-0 text-xs text-slate-500">날짜</span>
                <input
                  type="date"
                  bind:value={order.date}
                  on:change={() => persistGroup()}
                  class="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none ring-blue-500 focus:ring-2"
                />
              </div>
              <div class="flex items-center gap-2">
                <span class="w-10 shrink-0 text-xs text-slate-500">종류</span>
                <input
                  type="text"
                  placeholder="음식 종류 입력"
                  bind:value={order.type}
                  on:input={() => persistGroup()}
                  class="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none ring-blue-500 focus:ring-2"
                />
              </div>
              <div class="flex flex-col gap-1.5">
                <span class="text-xs text-slate-500">인원 선택 (중복 가능)</span>
                {#if soldiers.length === 0}
                  <p class="text-xs text-slate-400">등록된 인원이 없습니다.</p>
                {:else}
                  <div class="flex flex-wrap gap-2">
                    {#each soldiers as soldier}
                      <button
                        type="button"
                        on:click={() => toggleDeliveryMember(idx, soldier.name)}
                        class="rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors
                          {order.members.includes(soldier.name)
                            ? 'border-blue-400 bg-blue-100 text-blue-700'
                            : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50'}"
                      >
                        {soldier.name}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
          <button
            type="button"
            on:click={addDeliveryOrder}
            class="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
          >
            + 주문 추가
          </button>
        </div>
      {/if}
    </div>
  </div>
</section>
