import type { MilTraining, Rank, Religion, Slot, Soldier } from './types';
import { MIL_TRAININGS, RELIGIONS, rankIndex, sortByRank } from './types';

/** 날짜 우선, 같으면 계급순 비교 함수 생성 */
function byDateThenRank<T extends { rank: Rank }>(getDate: (item: T) => string) {
  return (a: T, b: T): number => {
    const da = getDate(a);
    const db = getDate(b);
    if (da !== db) return da < db ? -1 : 1;
    return rankIndex(a.rank) - rankIndex(b.rank);
  };
}

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

// ─── 유틸 ──────────────────────────────────────────────────────────────────────

/** 날짜 문자열(YYYY-MM-DD)을 M/D 형식으로 변환 */
function shortDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** YYYY-MM-DD → Date (시간 제거) */
function toDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/**
 * 관등성명 목록을 같은 계급이 연속일 때 계급 생략 형식으로 포맷.
 * 예: [{rank:'상병',name:'나트륨'}, {rank:'상병',name:'이리듐'}]
 * → "상병 나트륨, 이리듐"
 */
function formatMembers(soldiers: Soldier[]): string {
  if (soldiers.length === 0) return '';
  const parts: string[] = [];
  let prevRank = '';
  for (const s of soldiers) {
    if (s.rank === prevRank) {
      parts.push(s.name);
    } else {
      parts.push(`${s.rank} ${s.name}`);
      prevRank = s.rank;
    }
  }
  return parts.join(', ');
}

/** 이름 목록 → Soldier 배열 (슬롯에 등록된 인원 기준) */
function namesToSoldiers(names: string[], allSoldiers: Soldier[]): Soldier[] {
  return sortByRank(
    names
      .map((name) => allSoldiers.find((s) => s.name === name))
      .filter((s): s is Soldier => s !== undefined)
  );
}

/**
 * 열외 사유별 집계 문자열 생성.
 * 예: "당직 1 근무 1"
 */
function buildAbsenceBreakdown(absentSoldiers: Soldier[]): string {
  const map = new Map<string, number>();
  for (const s of absentSoldiers) {
    const a = s.traits.absence;
    const label = (a.reason ?? a.customReason) || '열외';
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, count]) => `${label} ${count}`).join(' ');
}

/**
 * 숫자의 한국어 발음에 받침이 있는지 여부.
 * "을/를" 조사 선택에 사용.
 */
function numHasBatchim(n: number): boolean {
  // 0: 영(X), 1: 일(O), 2: 이(X), 3: 삼(O), 4: 사(X), 5: 오(X),
  // 6: 육(O), 7: 칠(O), 8: 팔(O), 9: 구(X), 10: 십(O)
  const lastDigit = n % 10;
  if (n >= 10 && lastDigit === 0) return true; // 십, 이십, ...
  return [1, 3, 6, 7, 8].includes(lastDigit);
}

// ─── 병기본 아이콘/라벨 매핑 ──────────────────────────────────────────────────
const MIL_ICON: Record<MilTraining, string> = {
  '사격': '🔫',
  'TCCC': '🩹',
  '화생방': '🥽',
  '정신전력': '📖',
  '체력 측정': '🏃'
};

const MIL_LABEL: Record<MilTraining, string> = {
  '사격': '사격',
  'TCCC': 'TCCC',
  '화생방': '화생방',
  '정신전력': '정신전력',
  '체력 측정': '체력측정'
};

// ─── 종교 아이콘 매핑 ─────────────────────────────────────────────────────────
const RELIGION_ICON: Record<Religion, string> = {
  '기독교': '✝️',
  '천주교': '⛪️',
  '불교': '🪷'
};

// ─── 메시지 생성 ──────────────────────────────────────────────────────────────

export function buildMessage(ctx: MessageContext): string {
  const { battery, room, reportDate, slots, group } = ctx;
  const soldiers = slots.filter((s): s is Soldier => s !== null);
  const total = soldiers.length;
  const absentSoldiers = soldiers.filter((s) => s.traits.absence.isAbsent);
  const absentCount = absentSoldiers.length;
  const present = total - absentCount;
  const today = toDate(reportDate);

  const lines: string[] = [];

  // ── 헤더 ──
  const batteryLabel = battery === '본부' ? '본부포대' : `${battery}포대`;
  if (absentCount > 0) {
    const breakdown = buildAbsenceBreakdown(absentSoldiers);
    const particle = numHasBatchim(present) ? '을' : '를';
    lines.push(`${batteryLabel} ${room}생활관 `);
    lines.push(`총원 ${total} 열외 ${absentCount}`);
    lines.push(`열외내용 ${breakdown}${particle} 제외한 현재원 ${present}입니다.`);
  } else {
    lines.push(`${batteryLabel} ${room}생활관 `);
    lines.push(`총원 ${total} 현재원 ${present}입니다.`);
  }

  // ── 🏠 출타 (휴가 일정) ──
  const vacSoldiers = soldiers
    .filter((s) => s.traits.vacation.hasVacation && s.traits.vacation.startDate && s.traits.vacation.endDate)
    .sort(byDateThenRank((s) => s.traits.vacation.startDate));
  lines.push('');
  lines.push('🏠 출타 ');
  lines.push('');
  if (vacSoldiers.length > 0) {
    for (const s of vacSoldiers) {
      const start = shortDate(s.traits.vacation.startDate);
      const end = shortDate(s.traits.vacation.endDate);
      const startD = toDate(s.traits.vacation.startDate);
      const endD = toDate(s.traits.vacation.endDate);
      // 현재 진행 중이면 "중입니다", 아직 시작 전이면 "예정입니다"
      const suffix = startD <= today && today <= endD ? '중입니다.' : '예정입니다.';
      lines.push(`${start}~${end} ${s.rank} ${s.name} 휴가 ${suffix}`);
    }
  } else {
    lines.push('-');
  }

  // ── ⛪️ 종교 ──
  const activeReligions = RELIGIONS.filter((r) => {
    const members = namesToSoldiers(group.religion[r], soldiers);
    return members.length > 0;
  });
  if (activeReligions.length > 0) {
    lines.push('');
    lines.push('⛪️ 종교');
    for (const rel of activeReligions) {
      const members = namesToSoldiers(group.religion[rel], soldiers);
      lines.push('');
      lines.push(`[${rel}]`);
      lines.push(`${formatMembers(members)} 희망합니다.`);
    }
  }

  // ── 🏥 외진 ──
  const outSoldiers = soldiers
    .filter((s) => s.traits.outpatient.hasOutpatient && s.traits.outpatient.date)
    .sort(byDateThenRank((s) => s.traits.outpatient.date));
  lines.push('');
  lines.push('🏥 외진');
  lines.push('');
  if (outSoldiers.length > 0) {
    for (const s of outSoldiers) {
      const d = shortDate(s.traits.outpatient.date);
      const place = s.traits.outpatient.place ? ` ${s.traits.outpatient.place}` : '';
      lines.push(`${d} ${s.rank} ${s.name}${place} 외진 예정입니다.`);
    }
  } else {
    lines.push('-');
  }

  // ── 면회 ──
  const visitSoldiers = soldiers
    .filter((s) => s.traits.visit.hasVisit && s.traits.visit.date && s.traits.visit.visitor)
    .sort(byDateThenRank((s) => s.traits.visit.date));
  if (visitSoldiers.length > 0) {
    lines.push('');
    for (const s of visitSoldiers) {
      const d = shortDate(s.traits.visit.date);
      lines.push(`${d} ${s.rank} ${s.name} 면회 (${s.traits.visit.visitor}) 희망합니다.`);
    }
  }

  // ── 💈 민간이발 ──
  if (group.civHaircut.enabled) {
    const members = namesToSoldiers(group.civHaircut.members, soldiers);
    lines.push('');
    lines.push('💈 민간이발');
    if (members.length > 0) {
      lines.push(`${formatMembers(members)} 희망합니다.`);
    } else {
      lines.push('-');
    }
  }

  // ── ⬆️ 병기본 ──
  const activeCats = group.milTrainingEnabled
    ? MIL_TRAININGS.filter((cat) => {
        const names = group.milTraining[cat];
        return names.length > 0 && namesToSoldiers(names, soldiers).length > 0;
      })
    : [];

  lines.push('');
  lines.push('⬆️ 병기본');
  if (activeCats.length > 0) {
    for (const cat of activeCats) {
      const members = namesToSoldiers(group.milTraining[cat], soldiers);
      lines.push('');
      lines.push(`${MIL_ICON[cat]} ${MIL_LABEL[cat]}`);
      lines.push(`${formatMembers(members)} 희망합니다.`);
    }
  } else {
    lines.push('');
    lines.push(`${room}생활관 병기본 희망자 없습니다.`);
  }

  // ── 🍜 배달 음식 ──
  if (group.deliveryEnabled && group.deliveryOrders.length > 0) {
    const validOrders = [...group.deliveryOrders]
      .filter((o) => o.date && o.type && o.members.length > 0)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    if (validOrders.length > 0) {
      lines.push('');
      lines.push('🍜 배달 음식');
      lines.push('');
      for (const order of validOrders) {
        const d = shortDate(order.date);
        const members = namesToSoldiers(order.members, soldiers);
        if (members.length > 0) {
          lines.push(`${d} ${formatMembers(members)} ${order.type} 배달 신청합니다.`);
        }
      }
    }
  }

  return lines.join('\n');
}
