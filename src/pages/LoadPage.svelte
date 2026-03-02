<script lang="ts">
  import { decodeTransferData, applyTransferData, type TransferData } from '../lib/transfer';
  import { CLS_INPUT, CLS_ON_DARK, CLS_TOGGLE, CLS_OFF } from '../lib/styles';

  export let battery: string;
  export let room: string;
  export let reportDate: string;

  let inputCode = '';
  let errorMsg = '';
  let preview: TransferData | null = null;
  let importSuccess = false;

  async function parseCode() {
    errorMsg = '';
    preview = null;
    importSuccess = false;

    const result = await decodeTransferData(inputCode);
    if (!result.ok) {
      errorMsg = result.error;
      return;
    }
    preview = result.data;
  }

  function confirmImport() {
    if (!preview) return;
    applyTransferData(preview);
    importSuccess = true;
  }

  function reset() {
    inputCode = '';
    errorMsg = '';
    preview = null;
    importSuccess = false;
  }

  /** 활성 인원 수 세기 */
  function countSoldiers(data: TransferData): number {
    return data.slots.filter((s) => s !== null).length;
  }

  /** 인원 이름 목록 */
  function soldierNames(data: TransferData): string[] {
    return data.slots.filter((s): s is NonNullable<typeof s> => s !== null).map((s) => `${s.rank} ${s.name}`);
  }
</script>

<section class="mx-auto flex w-full max-w-3xl flex-col gap-5 rounded-2xl bg-white p-8 shadow-sm">
  <header class="flex flex-col gap-1">
    <h2 class="text-xl font-bold">인수인계 불러오기</h2>
    <p class="text-sm text-slate-500">
      전임자가 공유한 인수인계 코드를 아래에 붙여넣으면 인원 정보를 자동으로 불러옵니다.
    </p>
  </header>

  {#if importSuccess && preview}
    <!-- 성공 화면 -->
    <div class="flex flex-col items-center gap-4 rounded-xl border border-green-300 bg-green-50 p-6 text-center">
      <svg class="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <p class="text-lg font-bold text-green-700">불러오기 완료!</p>
        <p class="mt-1 text-sm text-green-600">
          {preview.bat}포대 {preview.rm}생활관 · {countSoldiers(preview)}명의 정보가 저장되었습니다.
        </p>
      </div>
      <p class="text-xs text-slate-500">
        돌아가기 → 해당 포대/생활관 선택 → 시작하기를 누르면 불러온 데이터가 반영됩니다.
      </p>
      <button
        class={`${CLS_TOGGLE} ${CLS_OFF} mt-2 max-w-xs`}
        type="button"
        on:click={reset}
      >
        다른 코드 불러오기
      </button>
    </div>
  {:else}
    <!-- 입력 영역 -->
    <div class="flex flex-col gap-2">
      <label for="transfer-code" class="text-sm font-medium text-slate-700">인수인계 코드</label>
      <textarea
        id="transfer-code"
        class="{CLS_INPUT} min-h-[120px] resize-y font-mono text-xs"
        placeholder="여기에 코드를 붙여넣으세요..."
        bind:value={inputCode}
        on:input={() => { errorMsg = ''; preview = null; }}
      ></textarea>
    </div>

    {#if errorMsg}
      <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
        {errorMsg}
      </div>
    {/if}

    <!-- 분석 버튼 -->
    {#if !preview}
      <button
        class={`${CLS_TOGGLE} ${inputCode.trim() ? CLS_ON_DARK : CLS_OFF} py-2 cursor-pointer`}
        type="button"
        disabled={!inputCode.trim()}
        on:click={parseCode}
      >
        미리 보기
      </button>
    {/if}

    <!-- 미리보기 -->
    {#if preview}
      <div class="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-5">
        <h3 class="text-sm font-bold text-blue-700">미리보기</h3>

        <div class="grid grid-cols-2 gap-2 text-sm">
          <div class="text-slate-500">포대</div>
          <div class="font-medium">{preview.bat}포대</div>
          <div class="text-slate-500">생활관</div>
          <div class="font-medium">{preview.rm}생활관</div>
          <div class="text-slate-500">인원 수</div>
          <div class="font-medium">{countSoldiers(preview)}명</div>
        </div>

        {#if soldierNames(preview).length > 0}
          <div class="flex flex-wrap gap-1.5 pt-1">
            {#each soldierNames(preview) as name}
              <span class="rounded-md border border-blue-300 bg-white px-2 py-0.5 text-xs font-medium text-blue-700">
                {name}
              </span>
            {/each}
          </div>
        {/if}

        {#if preview.bat !== battery || preview.rm !== room}
          <div class="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            현재 선택: {battery}포대 {room}생활관 → 코드 내 정보: {preview.bat}포대 {preview.rm}생활관.
            코드의 포대/생활관에 저장됩니다.
          </div>
        {/if}

        <div class="flex gap-2 pt-1">
          <button
            class={`${CLS_TOGGLE} ${CLS_ON_DARK} py-2`}
            type="button"
            on:click={confirmImport}
          >
            불러오기 확정
          </button>
          <button
            class={`${CLS_TOGGLE} ${CLS_OFF} py-2`}
            type="button"
            on:click={reset}
          >
            취소
          </button>
        </div>
      </div>
    {/if}
  {/if}
</section>
