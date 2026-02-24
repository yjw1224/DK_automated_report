<script lang="ts">
	import { router, type PageType } from './stores/router';
	import HomePage from './pages/HomePage.svelte';
	import PersonnelPage from './pages/PersonnelPage.svelte';
	import MessagePage from './pages/MessagePage.svelte';
	import LoadPage from './pages/LoadPage.svelte';

	let currentPage: PageType = 'home';

	router.subscribe((page) => {
		currentPage = page;
	});
</script>

<main>
	{#if currentPage === 'home'}
		<HomePage />
	{:else if currentPage === 'personnel'}
		<PersonnelPage />
	{:else if currentPage === 'message'}
		<MessagePage />
	{:else if currentPage === 'load'}
		<LoadPage />
	{/if}
</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: system-ui, -apple-system, sans-serif;
	}
</style>
