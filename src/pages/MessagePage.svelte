<script lang="ts">
	import { router } from '../stores/router';
	import { reportStore } from '../stores/reportStore';

	let reportData: any;
	let excludedCount = 0;

	reportStore.subscribe((data) => {
		reportData = data;
		excludedCount = data.personnel.filter((p: any) => p.excluded).length;
	});

	function generateMessage(): string {
		const totalPersonnel = reportData.personnel.length;
		const excluded = reportData.personnel.filter((p: any) => p.excluded);

		let message = `【대표병 보고】\n`;
		message += `${reportData.unit} ${reportData.barrack}\n`;
		message += `보고일시: ${reportData.date}\n\n`;

		// 총원 및 열외
		message += `[총원 및 열외]\n`;
		message += `총원: ${totalPersonnel}명\n`;
		message += `열외: ${excludedCount}명\n`;
		if (excluded.length > 0) {
			message += `열외자: ${excluded.map((p: any) => `${p.name}(${p.excludeReason})`).join(', ')}\n`;
		}
		message += '\n';

		// 특성
		message += `[특성]\n`;
		reportData.attributes.forEach((attr: any) => {
			message += `${attr.name}: ${attr.subcategories.map((sub: any) => `${sub.name} ${sub.count}명`).join(', ')}\n`;
		});
		message += '\n';

		// 기타 사항
		message += `[기타 사항]\n`;
		if (reportData.otherNotes.assault.exists) {
			message += `구타/가혹행위: ${reportData.otherNotes.assault.details}\n`;
		} else {
			message += `구타/가혹행위: 없음\n`;
		}
		if (reportData.otherNotes.special.exists) {
			message += `특이사항: ${reportData.otherNotes.special.details}\n`;
		} else {
			message += `특이사항: 없음\n`;
		}

		return message;
	}

	function copyMessage() {
		const message = generateMessage();
		navigator.clipboard.writeText(message).then(() => {
			alert('메시지가 복사되었습니다.');
		});
	}
</script>

<div class="min-h-screen bg-gray-50 p-4">
	<div class="max-w-4xl mx-auto">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-800 mb-2">대표병 보고</h1>
			<p class="text-gray-600">{reportData?.unit} - {reportData?.barrack} ({reportData?.date})</p>
		</div>

		<!-- Content Sections -->
		<div class="space-y-6">
			<!-- Section 1: Total Personnel and Exclusions -->
			<div class="bg-white rounded-lg shadow p-6">
				<h2 class="text-xl font-bold text-gray-800 mb-4">총원 및 열외</h2>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<p class="text-sm text-gray-600">총원</p>
						<p class="text-2xl font-bold text-indigo-600">{reportData?.personnel.length || 0}명</p>
					</div>
					<div>
						<p class="text-sm text-gray-600">열외</p>
						<p class="text-2xl font-bold text-red-600">{excludedCount}명</p>
					</div>
				</div>
			</div>

			<!-- Section 2: Characteristics -->
			<div class="bg-white rounded-lg shadow p-6">
				<h2 class="text-xl font-bold text-gray-800 mb-4">특성</h2>
				<div class="space-y-4">
					{#each reportData?.attributes || [] as attr}
						<div class="p-4 bg-gray-50 rounded">
							<p class="font-semibold text-gray-800 mb-2">{attr.name}</p>
							<div class="flex flex-wrap gap-2">
								{#each attr.subcategories as sub}
									<span class="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
										{sub.name}: {sub.count}명
									</span>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Section 3: Other Notes -->
			<div class="bg-white rounded-lg shadow p-6">
				<h2 class="text-xl font-bold text-gray-800 mb-4">기타 사항</h2>
				<div class="space-y-4">
					<div>
						<p class="font-semibold text-gray-800 mb-2">구타/가혹행위</p>
						<p class="text-gray-600">
							{reportData?.otherNotes.assault.exists ? reportData.otherNotes.assault.details : '없음'}
						</p>
					</div>
					<div>
						<p class="font-semibold text-gray-800 mb-2">특이사항</p>
						<p class="text-gray-600">
							{reportData?.otherNotes.special.exists ? reportData.otherNotes.special.details : '없음'}
						</p>
					</div>
				</div>
			</div>

			<!-- Message Preview -->
			<div class="bg-white rounded-lg shadow p-6">
				<h2 class="text-xl font-bold text-gray-800 mb-4">메시지 미리보기</h2>
				<div class="bg-gray-50 p-4 rounded whitespace-pre-wrap text-sm font-mono text-gray-700 overflow-auto max-h-64">
					{generateMessage()}
				</div>
				<button
					on:click={copyMessage}
					class="mt-4 w-full px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
				>
					메시지 복사
				</button>
			</div>
		</div>

		<!-- Navigation Buttons -->
		<div class="flex gap-4 justify-center mt-8">
			<button
				on:click={() => router.goPersonnel()}
				class="px-6 py-2 border border-gray-400 text-gray-700 font-semibold rounded-lg hover:bg-gray-100"
			>
				이전
			</button>
			<button
				on:click={() => router.goLoad()}
				class="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700"
			>
				정보 불러오기
			</button>
		</div>
	</div>
</div>
