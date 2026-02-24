<script lang="ts">
	import { router } from '../stores/router';
	import { reportStore } from '../stores/reportStore';

	let messageText = '';
	let parseStatus = '';

	function parseMessage() {
		try {
			// 간단한 파싱 로직 (실제로는 더 복잡한 파싱이 필요할 수 있음)
			const lines = messageText.split('\n');

			let unit = '';
			let barrack = '';
			let date = '';

			// 기본 정보 파싱
			for (let i = 0; i < Math.min(5, lines.length); i++) {
				if (lines[i].includes('총원')) {
					const parts = lines[i - 1]?.split('-') || [];
					if (parts.length >= 2) {
						unit = parts[0].trim();
						barrack = parts[1].trim();
					}
				}
				if (lines[i].includes('보고일시')) {
					date = lines[i].split(':')[1]?.trim() || '';
				}
			}

			if (!unit || !barrack) {
				throw new Error('요구되는 정보를 찾을 수 없습니다.');
			}

			reportStore.setBasicInfo({
				unit,
				barrack,
				date,
			});

			parseStatus = 'success';
			setTimeout(() => {
				router.goPersonnel();
			}, 1500);
		} catch (error) {
			parseStatus = `error: ${(error as Error).message}`;
		}
	}

	function handlePaste(e: ClipboardEvent) {
		const text = e.clipboardData?.getData('text/plain');
		if (text) {
			messageText = text;
		}
	}
</script>

<div class="min-h-screen bg-gray-50 p-4">
	<div class="max-w-4xl mx-auto">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-800 mb-2">정보 불러오기</h1>
			<p class="text-gray-600">
				이전에 작성한 대표병 보고 메시지를 입력하여 자동으로 정보를 불러올 수 있습니다.
			</p>
		</div>

		<!-- Content -->
		<div class="space-y-6">
			<div class="bg-white rounded-lg shadow p-6">
				<label for="message" class="block text-sm font-medium text-gray-700 mb-3">메시지 입력</label>
				<textarea
					id="message"
					bind:value={messageText}
					on:paste={handlePaste}
					rows={10}
					placeholder="대표병 보고 메시지를 여기에 입력하거나 붙여넣기하세요..."
					class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
				/>
			</div>

			<!-- Status Messages -->
			{#if parseStatus === 'success'}
				<div class="bg-green-50 border border-green-200 rounded-lg p-4">
					<p class="text-green-800 font-semibold">✓ 정보를 성공적으로 불러왔습니다!</p>
				</div>
			{:else if parseStatus.startsWith('error')}
				<div class="bg-red-50 border border-red-200 rounded-lg p-4">
					<p class="text-red-800 font-semibold">{parseStatus}</p>
				</div>
			{/if}

			<!-- Help Section -->
			<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
				<p class="text-blue-900 text-sm">
					💡 대표병 보고 페이지에서 생성된 메시지를 복사하여 붙여넣으세요.
				</p>
			</div>
		</div>

		<!-- Navigation Buttons -->
		<div class="flex gap-4 justify-center mt-8">
			<button
				on:click={() => router.goHome()}
				class="px-6 py-2 border border-gray-400 text-gray-700 font-semibold rounded-lg hover:bg-gray-100"
			>
				돌아가기
			</button>
			<button
				on:click={parseMessage}
				disabled={!messageText}
				class="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
			>
				정보 불러오기
			</button>
		</div>
	</div>
</div>
