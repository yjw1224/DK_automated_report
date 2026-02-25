// ─── 계급 ───────────────────────────────────────────────────────────────────
export const RANKS = ['병장', '상병', '일병', '이병'] as const;

export type Rank = (typeof RANKS)[number];

// ─── 열외 사유 ────────────────────────────────────────────────────────────────
export const ABSENCE_PRESET_REASONS = [
  '근무',
  '휴가',
  '외출',
  '외박',
  '상황병',
  '입실',
  '외진'
] as const;

export type AbsencePresetReason = (typeof ABSENCE_PRESET_REASONS)[number];

export interface AbsenceTrait {
  isAbsent: boolean;
  /** 프리셋 사유. null이면 customReason 사용 */
  reason: AbsencePresetReason | null;
  /** 직접 입력 사유 (reason === null 일 때 유효) */
  customReason: string;
}

// ─── 면회 ────────────────────────────────────────────────────────────────────
export interface VisitTrait {
  hasVisit: boolean;
  /** 면회 날짜 (YYYY-MM-DD) */
  date: string;
  /** 면회자 이름 */
  visitor: string;
}

// ─── 외진 ────────────────────────────────────────────────────────────────────
export interface OutpatientTrait {
  /** 외진 여부 */
  hasOutpatient: boolean;
  /** 외진 날짜 (YYYY-MM-DD) */
  date: string;
  /** 외진 장소 */
  place: string;
}

// ─── 출타 일정 ────────────────────────────────────────────────────────────────
export const LEAVE_TYPES = ['휴가', '평일외출', '주말외출', '외박'] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export interface LeaveEntry {
  /** 출타 종류 */
  type: LeaveType;
  /** 시작일 (YYYY-MM-DD) — 휴가·외박은 시작일, 평일외출·주말외출은 당일 */
  startDate: string;
  /** 종료일 (YYYY-MM-DD) — 휴가·외박만 사용 */
  endDate: string;
}

export function defaultLeaveEntry(): LeaveEntry {
  return { type: '휴가', startDate: '', endDate: '' };
}

// ─── 단체 설정 ────────────────────────────────────────────────────────────────
export const RELIGIONS = ['기독교', '천주교', '불교'] as const;
export type Religion = (typeof RELIGIONS)[number];

export const MIL_TRAININGS = ['사격', '체력 측정', 'TCCC', '화생방', '정신전력'] as const;
export type MilTraining = (typeof MIL_TRAININGS)[number];

export interface DeliveryOrder {
  date: string;
  type: string;
  members: string[];
}

// ─── 인원 특성 ─────────────────────────────────────────────────────────────────
// 추후 특성을 추가할 때 이 인터페이스에 필드를 추가하고
// defaultTraits() 함수에 기본값을 추가하면 됩니다.
export interface PersonnelTraits {
  absence: AbsenceTrait;
  leaves: LeaveEntry[];
  outpatient: OutpatientTrait;
  visit: VisitTrait;
  // 5. 종교 — 추후 추가
  // 5. 면회 — 추후 추가
  // 6. 종교 — 추후 추가
  // 7. 병기본 — 추후 추가
  // 8. 사격 — 추후 추가
  // 9. 배달 음식 — 추후 추가
}

export function defaultTraits(): PersonnelTraits {
  return {
    absence: {
      isAbsent: false,
      reason: null,
      customReason: ''
    },
    leaves: [],
    outpatient: {
      hasOutpatient: false,
      date: '',
      place: ''
    },
    visit: {
      hasVisit: false,
      date: '',
      visitor: ''
    }
  };
}

// ─── 인원 (슬롯) ───────────────────────────────────────────────────────────────
export interface Soldier {
  /** 계급: 이병 / 일병 / 상병 / 병장 */
  rank: Rank;
  name: string;
  traits: PersonnelTraits;
}

export type Slot = Soldier | null;

/** 계급 우선순위 인덱스 (병장=0 → 이병=3). 낮을수록 높은 계급. */
export function rankIndex(rank: Rank): number {
  return RANKS.indexOf(rank);
}

/** Soldier 배열을 계급순(병장→이병)으로 정렬한 새 배열 반환 */
export function sortByRank<T extends { rank: Rank }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => rankIndex(a.rank) - rankIndex(b.rank));
}
