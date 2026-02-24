<script lang="ts">
	import { router } from '../stores/router';
	import { reportStore } from '../stores/reportStore';

	let unit = '';
	let barrack = '';
	let selectedDate = new Date().toISOString().split('T')[0];

	function handleStart() {
		if (!unit || !barrack) {
			alert('포대와 생활관을 입력해주세요.');
			return;
		}

		reportStore.setBasicInfo({
			unit,
			barrack,
			date: selectedDate,
		});

		router.goPersonnel();
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
	<div class="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
		<h1 class="text-3xl font-bold text-gray-800 mb-8 text-center">대표병 보고</h1>

		<div class="space-y-6">
			<!-- Unit Input -->
			<div>
				<label for="unit" class="block text-sm font-medium text-gray-700 mb-2">포대</label>
				<input
					id="unit"
					type="text"
					bind:value={unit}
					placeholder="예: 1포대"
					class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
				/>
			</div>

			<!-- Barrack Input -->
			<div>
				<label for="barrack" class="block text-sm font-medium text-gray-700 mb-2">생활관</label>
				<input
					id="barrack"
					type="text"
					bind:value={barrack}
					placeholder="예: 1생활관"
					class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
				/>
			</div>

			<!-- Date Input -->
			<div>
				<label for="date" class="block text-sm font-medium text-gray-700 mb-2">날짜</label>
				<input
					id="date"
					type="date"
					bind:value={selectedDate}
					class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
				/>
			</div>
		</div>

		<!-- Navigation Buttons -->
		<div class="grid grid-cols-1 gap-3 mt-8">
			<button
				on:click={handleStart}
				class="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition duration-200"
			>
				시작하기
			</button>
		</div>

		<!-- Info Section -->
		<div class="mt-8 p-4 bg-indigo-50 rounded-lg">
			<p class="text-sm text-gray-600 text-center">
				아래 버튼을 통해 필요한 페이지로 이동할 수 있습니다.
			</p>
		</div>
	</div>
</div>
