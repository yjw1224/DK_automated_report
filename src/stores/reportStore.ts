import { writable } from 'svelte/store';

export interface PersonnelAttribute {
	id: string;
	name: string;
	subcategories: {
		name: string;
		count: number;
	}[];
}

export interface Personnel {
	id: string;
	name: string;
	position: number;
	excluded: boolean;
	excludeReason?: string;
	attributes: Record<string, string>;
}

export interface ReportData {
	unit: string;
	barrack: string;
	date: string;
	personnel: Personnel[];
	attributes: PersonnelAttribute[];
	otherNotes: {
		assault: {
			exists: boolean;
			details: string;
		};
		special: {
			exists: boolean;
			details: string;
		};
	};
}

const defaultReportData: ReportData = {
	unit: '',
	barrack: '',
	date: new Date().toISOString().split('T')[0],
	personnel: [],
	attributes: [
		{
			id: 'exclusion',
			name: '열외',
			subcategories: [{ name: '열외', count: 0 }],
		},
		{
			id: 'outside',
			name: '외진',
			subcategories: [{ name: '외진', count: 0 }],
		},
		{
			id: 'religion',
			name: '종교',
			subcategories: [
				{ name: '기독교', count: 0 },
				{ name: '천주교', count: 0 },
				{ name: '불교', count: 0 },
			],
		},
		{
			id: 'haircut',
			name: '민간 이발',
			subcategories: [{ name: '이발', count: 0 }],
		},
		{
			id: 'military_basic',
			name: '병기본',
			subcategories: [
				{ name: '체력 측정', count: 0 },
				{ name: '화생방', count: 0 },
				{ name: 'TCCC', count: 0 },
				{ name: '정신전력', count: 0 },
			],
		},
		{
			id: 'shooting',
			name: '사격',
			subcategories: [{ name: '사격', count: 0 }],
		},
	],
	otherNotes: {
		assault: {
			exists: false,
			details: '',
		},
		special: {
			exists: false,
			details: '',
		},
	},
};

function createReportStore() {
	const { subscribe, set, update } = writable<ReportData>(defaultReportData);

	return {
		subscribe,
		setBasicInfo: (info: { unit: string; barrack: string; date: string }) => {
			update((data) => ({
				...data,
				unit: info.unit,
				barrack: info.barrack,
				date: info.date,
			}));
		},
		addPersonnel: (personnel: Personnel) => {
			update((data) => ({
				...data,
				personnel: [...data.personnel, personnel],
			}));
		},
		updatePersonnel: (id: string, personnel: Partial<Personnel>) => {
			update((data) => ({
				...data,
				personnel: data.personnel.map((p) => (p.id === id ? { ...p, ...personnel } : p)),
			}));
		},
		removePersonnel: (id: string) => {
			update((data) => ({
				...data,
				personnel: data.personnel.filter((p) => p.id !== id),
			}));
		},
		addAttribute: (attribute: PersonnelAttribute) => {
			update((data) => ({
				...data,
				attributes: [...data.attributes, attribute],
			}));
		},
		updateAttribute: (id: string, attribute: Partial<PersonnelAttribute>) => {
			update((data) => ({
				...data,
				attributes: data.attributes.map((a) =>
					a.id === id ? { ...a, ...attribute } : a
				),
			}));
		},
		setOtherNotes: (notes: ReportData['otherNotes']) => {
			update((data) => ({
				...data,
				otherNotes: notes,
			}));
		},
		reset: () => {
			set(defaultReportData);
		},
	};
}

export const reportStore = createReportStore();
