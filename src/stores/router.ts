import { writable } from 'svelte/store';

export type PageType = 'home' | 'personnel' | 'message' | 'load';

function createRouter() {
	const { subscribe, set } = writable<PageType>('home');

	return {
		subscribe,
		goTo: (page: PageType) => set(page),
		goHome: () => set('home'),
		goPersonnel: () => set('personnel'),
		goMessage: () => set('message'),
		goLoad: () => set('load'),
	};
}

export const router = createRouter();
