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

// ─── 휴가 일정 ────────────────────────────────────────────────────────────────
export interface VacationTrait {
  /** 휴가 일정 있음 여부 */
  hasVacation: boolean;
  /** 시작일 (YYYY-MM-DD) */
  startDate: string;
  /** 종료일 (YYYY-MM-DD) */
  endDate: string;
}

// ─── 인원 특성 ─────────────────────────────────────────────────────────────────
// 추후 특성을 추가할 때 이 인터페이스에 필드를 추가하고
// defaultTraits() 함수에 기본값을 추가하면 됩니다.
export interface PersonnelTraits {
  absence: AbsenceTrait;
  vacation: VacationTrait;
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
    vacation: {
      hasVacation: false,
      startDate: '',
      endDate: ''
    },
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
  name: string;
  traits: PersonnelTraits;
}

export type Slot = Soldier | null;
