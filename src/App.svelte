<main class="min-h-screen bg-slate-50 p-6 text-slate-900">
  <section class="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-2xl bg-white p-8 shadow-sm">
    <header class="flex flex-col gap-2">
      <h1 class="text-2xl font-bold">대표병 보고 자동화</h1>
      <p class="text-sm text-slate-600">메인 화면 (MVP) - 생활관 정보와 날짜를 입력하고 보고 작성을 시작합니다.</p>
    </header>

    <div class="grid gap-4 sm:grid-cols-2">
      <label class="flex flex-col gap-2 text-sm font-medium">
        포대 / 생활관
        <input
          class="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
          type="text"
          placeholder="예: 1포대 2생활관"
        />
      </label>

      <label class="flex flex-col gap-2 text-sm font-medium">
        보고 날짜
        <input
          class="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
          type="date"
        />
      </label>
    </div>

    <button
      class="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700"
      type="button"
    >
      시작하기
    </button>
  </section>
</main>
