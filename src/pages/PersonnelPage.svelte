<script lang="ts">
  import { onMount, tick } from 'svelte';
  import {
    ABSENCE_PRESET_REASONS,
    MIL_TRAININGS,
    RANKS,
    RELIGIONS,
    defaultTraits,
    type AbsencePresetReason,
    type DeliveryOrder,
    type MilTraining,
    type PersonnelTraits,
    type Rank,
    type Religion,
    type Slot,
    type Soldier,
    sortByRank
  } from '../lib/types';
  import {
    CLS_CHIP,
    CLS_FIELD_ERR,
    CLS_FIELD_OK,
    CLS_INPUT,
    CLS_OFF,
    CLS_ON_BLUE,
    CLS_ON_DARK,
    CLS_ON_ORANGE,
    CLS_SEC_TITLE,
    CLS_TOGGLE
  } from '../lib/styles';
  import MessagePreview from '../components/MessagePreview.svelte';

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
  let newRank: Rank = '이병';
  let nameInputEl: HTMLInputElement | null = null;

  // 채워진 자리용 - 드래프트 (저장 전 임시 편집값)
  let draft: Soldier | null = null;
  // 열외 사유 직접 입력 여부
  let useCustomReason = false;
  // 저장 시도 여부 (유효성 표시용)
  let saveAttempted = false;

  // 메시지 미리보기 모달
  let showMessagePreview = false;

  // ── 단체 설정 ────────────────────────────────────────────────────────────────
  let civHaircut: { enabled: boolean; members: string[] } = { enabled: false, members: [] };
  let religion: Record<Religion, string[]> = { '기독교': [], '천주교': [], '불교': [] };
  let milTrainingEnabled = false;
  let milTraining: Record<MilTraining, string[]> = { '사격': [], '체력 측정': [], 'TCCC': [], '화생방': [], '정신전력': [] };
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
      newRank = '이병';
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
    slots[selectedIndex] = { rank: newRank, name: trimmed, traits: defaultTraits() };
    slots = [...slots];
    persist();
    // 추가 후 바로 특성 편집 패널로 전환
    draft = structuredClone(slots[selectedIndex] as Soldier);
    useCustomReason = false;
    newName = '';
    newRank = '이병';
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
    const s = slots[selectedIndex];
    const label = s ? `${s.rank} ${s.name}` : '이 인원';
    if (!confirm(`${label}을(를) 삭제할까요?`)) return;
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
    newRank = '이병';
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
  $: soldiers = sortByRank(slots.filter((s): s is NonNullable<typeof s> => s !== null));
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

  // 배달 주문 날짜순 정렬 (원본 인덱스 유지)
  $: sortedDeliveryOrders = deliveryOrders
    .map((order, idx) => ({ order, idx }))
    .sort((a, b) => (a.order.date < b.order.date ? -1 : a.order.date > b.order.date ? 1 : a.idx - b.idx));

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
          <span>{slot.rank} {slot.name}</span>
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
      <div class="flex gap-2">
        <select
          bind:value={newRank}
          class="w-20 shrink-0 rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
        >
          {#each RANKS as rank}
            <option value={rank}>{rank}</option>
          {/each}
        </select>
        <input
          bind:this={nameInputEl}
          class="min-w-0 flex-1 {CLS_INPUT}"
          type="text"
          placeholder="이름 입력"
          bind:value={newName}
          on:keydown={(e) => e.key === 'Enter' && addSoldier()}
        />
      </div>
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
        {selectedIndex + 1}번 자리 — {draft.rank} {draft.name}
      </p>

      <!-- 계급 -->
      <div class="flex flex-col gap-1.5">
        <label for="draft-rank" class="text-xs font-semibold text-slate-600">계급</label>
        <select
          id="draft-rank"
          bind:value={draft.rank}
          class={CLS_INPUT}
        >
          {#each RANKS as rank}
            <option value={rank}>{rank}</option>
          {/each}
        </select>
      </div>

      <!-- 이름 -->
      <div class="flex flex-col gap-1.5">
        <label for="draft-name" class="text-xs font-semibold text-slate-600">이름</label>
        <input
          id="draft-name"
          class={CLS_INPUT}
          type="text"
          bind:value={draft.name}
        />
      </div>

      <!-- 특성 1: 열외 여부 -->
      <div class="flex flex-col gap-2.5">
        <span class={CLS_SEC_TITLE}>열외</span>

        <!-- Y / N 토글 -->
        <div class="flex gap-2">
          <button
            type="button"
            on:click={() => { if (draft) draft.traits.absence.isAbsent = true; }}
            class="{CLS_TOGGLE} {draft.traits.absence.isAbsent ? CLS_ON_ORANGE : CLS_OFF}"
          >
            열외
          </button>
          <button
            type="button"
            on:click={() => { if (draft) { draft.traits.absence.isAbsent = false; draft.traits.absence.reason = null; draft.traits.absence.customReason = ''; useCustomReason = false; } }}
            class="{CLS_TOGGLE} {!draft.traits.absence.isAbsent ? CLS_ON_DARK : CLS_OFF}"
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
              class={CLS_INPUT}
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
                    ? CLS_FIELD_ERR
                    : CLS_FIELD_OK}"
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
        <span class={CLS_SEC_TITLE}>휴가</span>

        <!-- 있음 / 없음 토글 -->
        <div class="flex gap-2">
          <button
            type="button"
            on:click={() => { if (draft) draft.traits.vacation.hasVacation = true; }}
            class="{CLS_TOGGLE} {draft.traits.vacation.hasVacation ? CLS_ON_BLUE : CLS_OFF}"
          >
            있음
          </button>
          <button
            type="button"
            on:click={() => { if (draft) { draft.traits.vacation.hasVacation = false; draft.traits.vacation.startDate = ''; draft.traits.vacation.endDate = ''; } }}
            class="{CLS_TOGGLE} {!draft.traits.vacation.hasVacation ? CLS_ON_DARK : CLS_OFF}"
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
                    ? CLS_FIELD_ERR
                    : CLS_FIELD_OK}"
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
                    ? CLS_FIELD_ERR
                    : CLS_FIELD_OK}"
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
        <span class={CLS_SEC_TITLE}>외진</span>

        <!-- Y / N 토글 -->
        <div class="flex gap-2">
          <button
            type="button"
            on:click={() => { if (draft) draft.traits.outpatient.hasOutpatient = true; }}
            class="{CLS_TOGGLE} {draft.traits.outpatient.hasOutpatient ? CLS_ON_BLUE : CLS_OFF}"
          >
            있음
          </button>
          <button
            type="button"
            on:click={() => { if (draft) { draft.traits.outpatient.hasOutpatient = false; draft.traits.outpatient.date = ''; draft.traits.outpatient.place = ''; } }}
            class="{CLS_TOGGLE} {!draft.traits.outpatient.hasOutpatient ? CLS_ON_DARK : CLS_OFF}"
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
                    ? CLS_FIELD_ERR
                    : CLS_FIELD_OK}"
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
                    ? CLS_FIELD_ERR
                    : CLS_FIELD_OK}"
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
        <span class={CLS_SEC_TITLE}>면회</span>

        <!-- Y / N 토글 -->
        <div class="flex gap-2">
          <button
            type="button"
            on:click={() => { if (draft) draft.traits.visit.hasVisit = true; }}
            class="{CLS_TOGGLE} {draft.traits.visit.hasVisit ? CLS_ON_BLUE : CLS_OFF}"
          >
            있음
          </button>
          <button
            type="button"
            on:click={() => { if (draft) { draft.traits.visit.hasVisit = false; draft.traits.visit.date = ''; draft.traits.visit.visitor = ''; } }}
            class="{CLS_TOGGLE} {!draft.traits.visit.hasVisit ? CLS_ON_DARK : CLS_OFF}"
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
                    ? CLS_FIELD_ERR
                    : CLS_FIELD_OK}"
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
                    ? CLS_FIELD_ERR
                    : CLS_FIELD_OK}"
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
      <span class={CLS_SEC_TITLE}>민간 이발</span>
      <div class="flex gap-2">
        <button
          type="button"
          on:click={() => { civHaircut.enabled = true; persistGroup(); }}
          class="{CLS_TOGGLE} {civHaircut.enabled ? CLS_ON_BLUE : CLS_OFF}"
        >
          있음
        </button>
        <button
          type="button"
          on:click={() => { civHaircut.enabled = false; civHaircut.members = []; persistGroup(); }}
          class="{CLS_TOGGLE} {!civHaircut.enabled ? CLS_ON_DARK : CLS_OFF}"
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
                  class="{CLS_CHIP} {civHaircut.members.includes(soldier.name) ? CLS_ON_BLUE : CLS_OFF}"
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
      <span class={CLS_SEC_TITLE}>종교</span>
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
                  class="{CLS_CHIP} {religion[rel].includes(soldier.name)
                      ? CLS_ON_BLUE
                      : assigned
                        ? 'border-slate-200 bg-slate-100 text-slate-300'
                        : CLS_OFF}"
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
      <span class={CLS_SEC_TITLE}>병기본</span>
      <div class="flex gap-2">
        <button
          type="button"
          on:click={() => { milTrainingEnabled = true; persistGroup(); }}
          class="{CLS_TOGGLE} {milTrainingEnabled ? CLS_ON_BLUE : CLS_OFF}"
        >
          있음
        </button>
        <button
          type="button"
          on:click={() => { milTrainingEnabled = false; for (const c of MIL_TRAININGS) milTraining[c] = []; milTraining = { ...milTraining }; persistGroup(); }}
          class="{CLS_TOGGLE} {!milTrainingEnabled ? CLS_ON_DARK : CLS_OFF}"
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
                    class="{CLS_CHIP} {milTraining[cat].includes(soldier.name) ? CLS_ON_BLUE : CLS_OFF}"
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
      <span class={CLS_SEC_TITLE}>배달 음식</span>
      <div class="flex gap-2">
        <button
          type="button"
          on:click={() => { deliveryEnabled = true; if (deliveryOrders.length === 0) deliveryOrders = [{ date: reportDate, type: '', members: [] }]; persistGroup(); }}
          class="{CLS_TOGGLE} {deliveryEnabled ? CLS_ON_BLUE : CLS_OFF}"
        >
          있음
        </button>
        <button
          type="button"
          on:click={() => { deliveryEnabled = false; deliveryOrders = []; persistGroup(); }}
          class="{CLS_TOGGLE} {!deliveryEnabled ? CLS_ON_DARK : CLS_OFF}"
        >
          없음
        </button>
      </div>

      {#if deliveryEnabled}
        <div class="flex flex-col gap-3">
          {#each sortedDeliveryOrders as { order, idx: origIdx }}
            <div class="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-500">주문 {origIdx + 1}</span>
                <button
                  type="button"
                  on:click={() => removeDeliveryOrder(origIdx)}
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
                  required
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
                        on:click={() => toggleDeliveryMember(origIdx, soldier.name)}
                        class="{CLS_CHIP} {order.members.includes(soldier.name) ? CLS_ON_BLUE : CLS_OFF}"
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

  <!-- ── 메시지 생성하기 버튼 ── -->
  <button
    type="button"
    on:click={() => (showMessagePreview = true)}
    class="w-full rounded-xl bg-blue-600 px-4 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-blue-500 active:bg-blue-700"
  >
    📋 메시지 생성하기
  </button>
</section>

<MessagePreview
  bind:visible={showMessagePreview}
  {battery}
  {room}
  {reportDate}
  {slots}
  {civHaircut}
  {religion}
  {milTrainingEnabled}
  {milTraining}
  {deliveryEnabled}
  {deliveryOrders}
/>
