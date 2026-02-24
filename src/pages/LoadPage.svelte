<script lang="ts">
  export let battery: string;
  export let room: string;
  export let reportDate: string;
</script>

<section class="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-2xl bg-white p-8 shadow-sm">
  <h2 class="text-xl font-bold">정보 불러오기 페이지 (LOAD)</h2>
  <p class="text-sm text-slate-600">포대: {battery} / 생활관: {room} / 날짜: {reportDate}</p>
</section>
