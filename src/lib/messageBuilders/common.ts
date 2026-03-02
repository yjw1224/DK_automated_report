/**
 * 포대 공통 — 인터페이스, 상수, 유틸리티
 */
import type { MilTraining, Rank, Religion, Slot, Soldier } from '../types';
import { MIL_TRAININGS, RELIGIONS, rankIndex, sortByRank } from '../types';

// ─── 포대 식별 ────────────────────────────────────────────────────────────────

export const BATTERY_KEYS = ['본부', '1', '2', '3'] as const;
export type BatteryKey = (typeof BATTERY_KEYS)[number];

// ─── 단체 설정 인터페이스 ──────────────────────────────────────────────────────

export interface GroupSettings {
  civHaircut: { enabled: boolean; members: string[] };
  religion: Record<Religion, string[]>;
  milTrainingEnabled: boolean;
  milTraining: Record<MilTraining, string[]>;
  deliveryEnabled: boolean;
  deliveryOrders: { date: string; type: string; members: string[] }[];
}

export interface MessageContext {
  battery: string;
  room: string;
  reportDate: string;
  slots: Slot[];
  group: GroupSettings;
}

// ─── 상수 ──────────────────────────────────────────────────────────────────────

export const SECTION_ICONS: Record<string, string> = {
  '출타':     '🏠',
  '종교':     '⛪️',
  '외진':     '🏥',
  '면회':     '👥',
  '민간이발': '💈',
  '병기본':   '⬆️',
  '배달 음식':'🍜',
};

export const MIL_CONFIG: Record<MilTraining, { icon: string; label: string }> = {
  '사격':     { icon: '🔫', label: '사격' },
  'TCCC':     { icon: '🚑', label: 'TCCC' },
  '화생방':   { icon: '☣️', label: '화생방' },
  '정신전력': { icon: '📖', label: '정신전력' },
  '체력 측정': { icon: '🏃', label: '체력측정' },
};

export const RELIGION_ICON: Record<Religion, string> = {
  '기독교': '✝️',
  '천주교': '⛪️',
  '불교':   '🧘',
};

/** 받침이 있는 한 자리 숫자 (을/를 조사 판별) */
const BATCHIM_DIGITS = new Set([1, 3, 6, 7, 8]);

// ─── 내부 빌더용 컨텍스트 ─────────────────────────────────────────────────────

export interface BuildCtx {
  batteryLabel: string;
  room: string;
  today: Date;
  soldiers: Soldier[];
  /** 이름 → Soldier O(1) 조회 */
  byName: Map<string, Soldier>;
  group: GroupSettings;
}

// ─── 유틸 ──────────────────────────────────────────────────────────────────────

/** YYYY-MM-DD → M/D */
export function shortDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** YYYY-MM-DD → Date (시간 제거) */
export function toDate(iso: string): Date {
  return new Date(iso + 'T00:00:00');
}

/** 날짜 우선, 같으면 계급순 비교 함수 생성 */
export function byDateThenRank<T extends { rank: Rank }>(getDate: (item: T) => string) {
  return (a: T, b: T): number => {
    const da = getDate(a);
    const db = getDate(b);
    if (da !== db) return da < db ? -1 : 1;
    return rankIndex(a.rank) - rankIndex(b.rank);
  };
}

/**
 * 관등성명 목록 포맷: 같은 계급이 연속이면 계급 생략.
 * 예: "상병 나트륨, 이리듐"
 */
export function formatMembers(soldiers: Soldier[]): string {
  if (soldiers.length === 0) return '';
  const parts: string[] = [];
  let prevRank = '';
  for (const s of soldiers) {
    parts.push(s.rank === prevRank ? s.name : `${s.rank} ${s.name}`);
    prevRank = s.rank;
  }
  return parts.join(', ');
}

/** 한국어 숫자 발음의 받침 유무 → "을" / "를" */
export function particle(n: number): string {
  const last = n % 10;
  if (n >= 10 && last === 0) return '을'; // 십, 이십 …
  return BATCHIM_DIGITS.has(last) ? '을' : '를';
}

/** 이름 배열 → 계급순 정렬된 Soldier[] (Map 이용 O(n)) */
export function resolve(names: string[], ctx: BuildCtx): Soldier[] {
  return sortByRank(
    names.reduce<Soldier[]>((acc, n) => {
      const s = ctx.byName.get(n);
      if (s) acc.push(s);
      return acc;
    }, []),
  );
}

/** MessageContext → BuildCtx 변환 */
export function toBuildCtx(msgCtx: MessageContext): BuildCtx {
  const { battery, room, reportDate, slots, group } = msgCtx;
  const soldiers = sortByRank(slots.filter((s): s is Soldier => s !== null));
  return {
    batteryLabel: battery === '본부' ? '본부포대' : `${battery}포대`,
    room,
    today: toDate(reportDate),
    soldiers,
    byName: new Map(soldiers.map((s) => [s.name, s])),
    group,
  };
}
