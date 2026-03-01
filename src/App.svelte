<script lang="ts">
  import { onMount } from 'svelte';
  import LoadPage from './pages/LoadPage.svelte';
  import PersonnelPage from './pages/PersonnelPage.svelte';
  import { buildHash, parseHash, type RouteName } from './lib/router';
    import { CLS_ON_DARK, CLS_TOGGLE } from './lib/styles';

  type Battery = '1' | '2' | '3' | '본부';
  type Room = '1' | '2' | '3';

  const BATTERY_OPTIONS: readonly Battery[] = ['1', '2', '3', '본부'];
  const ROOM_OPTIONS: readonly Room[] = ['1', '2', '3'];
  const MAIN_FORM_STORAGE_KEY = 'dk-main-form';
  
  function getTodayIsoDate(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  let reportDate = getTodayIsoDate();
  let battery: Battery = '1';
  let room: Room = '1';
  let currentRoute: RouteName = 'home';

  const isBattery = (value: string): value is Battery => BATTERY_OPTIONS.includes(value as Battery);
  const isRoom = (value: string): value is Room => ROOM_OPTIONS.includes(value as Room);

  function syncFromHash() {
    const { route, context } = parseHash(window.location.hash);
    currentRoute = route;

    if (context.battery && isBattery(context.battery)) {
      battery = context.battery;
    }

    if (context.room && isRoom(context.room)) {
      room = context.room;
    }

  }

  function loadFromStorage() {
    const raw = localStorage.getItem(MAIN_FORM_STORAGE_KEY);
    if (!raw) return;

    try {
      const saved = JSON.parse(raw) as Partial<{ battery: string; room: string; reportDate: string }>;

      if (saved.battery && isBattery(saved.battery)) {
        battery = saved.battery;
      }

      if (saved.room && isRoom(saved.room)) {
        room = saved.room;
      }

    } catch {
      // 저장값 파싱 실패 시 기본값 유지
    }
  }

  onMount(() => {
    reportDate = getTodayIsoDate();
    loadFromStorage();
    syncFromHash();
    saveMainForm();
    window.addEventListener('hashchange', syncFromHash);

    return () => {
      window.removeEventListener('hashchange', syncFromHash);
    };
  });

  function onBatteryChange(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (isBattery(value)) {
      battery = value;
      saveMainForm();
    }
  }

  function onRoomChange(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (isRoom(value)) {
      room = value;
      saveMainForm();
    }
  }

  function saveMainForm() {
    const payload = {
      battery,
      room,
      reportDate
    };

    localStorage.setItem(MAIN_FORM_STORAGE_KEY, JSON.stringify(payload));

    console.log('입력값 저장: ', payload);
  }

  function goTo(route: Exclude<RouteName, 'home'>) {
    saveMainForm();
    window.location.hash = buildHash(route, { battery, room, reportDate });
  }

  function goHome() {
    window.location.hash = '#/';
  }

  const CLS_INPUT    = 'rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2 bg-white text-slate-700';
  const CLS_LABEL    = 'flex flex-col gap-2 text-sm font-medium';
  const CLS_NAV_BTN  = 'rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100';
  const CLS_BACK_BTN = `w-full bg-white ${CLS_NAV_BTN}`;
</script>

<main class="min-h-screen bg-slate-50 p-6 text-slate-900">
  {#if currentRoute === 'home'}
    <section class="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-2xl bg-white p-8 shadow-sm">
      <header class="flex flex-col gap-2">
        <h1 class="text-2xl font-bold">대표병 카톡 생성기</h1>
        <p class="text-sm text-slate-600">전진! 생활관 정보와 날짜를 입력하고 시작 버튼을 누르세요.</p>
      </header>

      <div class="grid gap-4 sm:grid-cols-3">
        <label class={CLS_LABEL}>
          포대
          <select
            value={battery}
            on:change={onBatteryChange}
            class={CLS_INPUT}
          >
            {#each BATTERY_OPTIONS as value}
              <option value={value}>{`${value}포대`}</option>
            {/each}
          </select>
        </label>

        <label class={CLS_LABEL}>
          생활관
          <select
            value={room}
            on:change={onRoomChange}
            class={CLS_INPUT}
          >
            {#each ROOM_OPTIONS as value}
              <option value={value}>{value}생활관</option>
            {/each}
          </select>
        </label>

        <div class={CLS_LABEL}>
          보고 날짜
          <span class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {new Date(reportDate + 'T00:00:00').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </span>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <button class={`${CLS_TOGGLE} ${CLS_ON_DARK} py-2`} type="button" on:click={() => goTo('personnel')}>
          시작하기
        </button>
        <button class={CLS_NAV_BTN} type="button" on:click={() => goTo('load')}>
          불러오기
        </button>
        <p class="text-sm text-slate-500">Made by 윤진우<br>2026-02-26</p>
      </div>
    </section>
  {:else if currentRoute === 'personnel'}
    <PersonnelPage {battery} {room} {reportDate} />
    <div class="mx-auto mt-4 w-full max-w-3xl">
      <button class={CLS_BACK_BTN} type="button" on:click={goHome}>돌아가기</button>
    </div>
  {:else if currentRoute === 'load'}
    <LoadPage {battery} {room} {reportDate} />
    <div class="mx-auto mt-4 w-full max-w-3xl">
      <button class={CLS_BACK_BTN} type="button" on:click={goHome}>돌아가기</button>
    </div>
  {/if}
</main>
