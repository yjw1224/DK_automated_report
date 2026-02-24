<script lang="ts">
	import { router } from '../stores/router';
	import { reportStore, type Personnel } from '../stores/reportStore';

	let personnel: Personnel[] = [];
	let reportData: any;

	reportStore.subscribe((data) => {
		personnel = data.personnel;
		reportData = data;
	});

	function generateId(): string {
		return `personnel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	function addPersonnel() {
		const newPersonnel: Personnel = {
			id: generateId(),
			name: '',
			position: personnel.length,
			excluded: false,
			excludeReason: '',
			attributes: {},
		};
		reportStore.addPersonnel(newPersonnel);
	}

	function removePersonnel(id: string) {
		reportStore.removePersonnel(id);
	}

	function updatePersonnelName(id: string, name: string) {
		reportStore.updatePersonnel(id, { name });
	}

	function handleNext() {
		if (personnel.length === 0) {
			alert('최소 1명 이상의 인원을 추가해주세요.');
			return;
		}
		router.goMessage();
	}
</script>

<div class="min-h-screen bg-gray-50 p-4">
	<div class="max-w-6xl mx-auto">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-800 mb-2">생활관 인원 관리</h1>
			<p class="text-gray-600">{reportData?.unit} - {reportData?.barrack}</p>
		</div>

		<!-- Personnel Grid -->
		<div class="grid grid-cols-2 gap-4 mb-8 md:grid-cols-5">
			{#each Array(10) as _, index}
				{@const p = personnel.find((item) => item.position === index)}
				<div
					class="aspect-square border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center {p
						? 'bg-indigo-50 border-indigo-300'
						: 'cursor-pointer hover:border-indigo-500 hover:bg-indigo-50'} transition"
					on:click={() => !p && addPersonnel()}
					on:keydown={(e) => {
						if (e.key === 'Enter') !p && addPersonnel();
					}}
					role="button"
					tabindex="0"
				>
					{#if p}
						<div class="w-full h-full flex flex-col justify-between">
							<input
								type="text"
								bind:value={p.name}
								on:change={() => updatePersonnelName(p.id, p.name)}
								placeholder="이름"
								class="text-center font-semibold text-sm border-b border-gray-300 mb-2 focus:outline-none focus:border-indigo-500 bg-transparent"
							/>
							<button
								on:click={() => removePersonnel(p.id)}
								class="text-xs bg-red-100 text-red-600 py-1 px-2 rounded hover:bg-red-200"
							>
								삭제
							</button>
						</div>
					{:else}
						<div class="text-center">
							<p class="text-gray-400 text-2xl mb-2">+</p>
							<p class="text-gray-400 text-sm">클릭하여 추가</p>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Navigation Buttons -->
		<div class="flex gap-4 justify-center">
			<button
				on:click={() => router.goHome()}
				class="px-6 py-2 border border-gray-400 text-gray-700 font-semibold rounded-lg hover:bg-gray-100"
			>
				이전
			</button>
			<button
				on:click={handleNext}
				class="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700"
			>
				다음
			</button>
		</div>
	</div>
</div>
