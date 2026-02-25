// ─── UI 클래스 상수 ────────────────────────────────────────────────────────────
// 공통으로 사용되는 Tailwind 클래스 조합을 한 곳에서 관리합니다.
// 새 페이지/컴포넌트에서 import해 재사용하세요.

/** 기본 텍스트 입력 / select */
export const CLS_INPUT     = 'rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2';

/** 섹션 구분 타이틀 */
export const CLS_SEC_TITLE = 'border-b border-slate-200 pb-1 text-sm font-bold text-slate-700';

/** 토글(있음/없음) 버튼 기본 — flex-1 포함 */
export const CLS_TOGGLE    = 'flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors';

/** 멤버 칩 버튼 기본 */
export const CLS_CHIP      = 'rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors';

/** 활성 상태: 파랑 (있음 / 선택됨) */
export const CLS_ON_BLUE   = 'border-blue-400 bg-blue-100 text-blue-700';

/** 활성 상태: 주황 (열외) */
export const CLS_ON_ORANGE = 'border-orange-400 bg-orange-100 text-orange-700';

/** 활성 상태: 다크 (없음 / 정상) */
export const CLS_ON_DARK   = 'border-slate-700 bg-slate-800 text-white';

/** 비활성 상태 */
export const CLS_OFF       = 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50';

/** 유효성 통과 field border+ring */
export const CLS_FIELD_OK  = 'border-slate-300 ring-blue-500';

/** 유효성 실패 field border+ring */
export const CLS_FIELD_ERR = 'border-red-400 bg-red-50 ring-red-400';
