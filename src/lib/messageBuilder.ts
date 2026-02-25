import type { MilTraining, Rank, Religion, Slot, Soldier } from './types';
import { MIL_TRAININGS, RELIGIONS, rankIndex, sortByRank } from './types';

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

const SECTION_ICONS: Record<string, string> = {
  '출타':     '🏠',
  '종교':     '⛪️',
  '외진':     '🏥',
  '면회':     '👥',
  '민간이발': '💈',
  '병기본':   '⬆️',
  '배달 음식':'🍜',
};

const MIL_CONFIG: Record<MilTraining, { icon: string; label: string }> = {
  '사격':     { icon: '🔫', label: '사격' },
  'TCCC':     { icon: '🚑', label: 'TCCC' },
  '화생방':   { icon: '☣️', label: '화생방' },
  '정신전력': { icon: '📖', label: '정신전력' },
  '체력 측정': { icon: '🏃', label: '체력측정' },
};

const RELIGION_ICON: Record<Religion, string> = {
  '기독교': '✝️',
  '천주교': '⛪️',
  '불교':   '🧘',
};

/** 받침이 있는 한 자리 숫자 (을/를 조사 판별) */
const BATCHIM_DIGITS = new Set([1, 3, 6, 7, 8]);

// ─── 유틸 ──────────────────────────────────────────────────────────────────────

/** YYYY-MM-DD → M/D */
function shortDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** YYYY-MM-DD → Date (시간 제거) */
function toDate(iso: string): Date {
  return new Date(iso + 'T00:00:00');
}

/** 날짜 우선, 같으면 계급순 비교 함수 생성 */
function byDateThenRank<T extends { rank: Rank }>(getDate: (item: T) => string) {
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
function formatMembers(soldiers: Soldier[]): string {
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
function particle(n: number): string {
  const last = n % 10;
  if (n >= 10 && last === 0) return '을'; // 십, 이십 …
  return BATCHIM_DIGITS.has(last) ? '을' : '를';
}

// ─── 내부 빌더용 컨텍스트 ─────────────────────────────────────────────────────

interface BuildCtx {
  batteryLabel: string;
  room: string;
  today: Date;
  soldiers: Soldier[];
  /** 이름 → Soldier O(1) 조회 */
  byName: Map<string, Soldier>;
  group: GroupSettings;
}

/** 이름 배열 → 계급순 정렬된 Soldier[] (Map 이용 O(n)) */
function resolve(names: string[], ctx: BuildCtx): Soldier[] {
  return sortByRank(
    names.reduce<Soldier[]>((acc, n) => {
      const s = ctx.byName.get(n);
      if (s) acc.push(s);
      return acc;
    }, []),
  );
}

// ─── 섹션 빌더 ────────────────────────────────────────────────────────────────

function buildHeader(ctx: BuildCtx): string[] {
  const { batteryLabel, room, soldiers } = ctx;
  const total = soldiers.length;
  const absent = soldiers.filter((s) => s.traits.absence.isAbsent);
  const absentCount = absent.length;
  const present = total - absentCount;

  const lines = [`${batteryLabel} ${room}생활관 `];

  if (absentCount > 0) {
    // 열외 사유 집계
    const map = new Map<string, number>();
    for (const s of absent) {
      const a = s.traits.absence;
      const label = (a.reason ?? a.customReason) || '열외';
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    const breakdown = [...map.entries()].map(([l, c]) => `${l} ${c}`).join(' ');
    lines.push(`총원 ${total} 열외 ${absentCount}`);
    lines.push(`열외내용 ${breakdown}${particle(present)} 제외한 현재원 ${present}입니다.`);
  } else {
    lines.push(`총원 ${total} 현재원 ${present}입니다.`);
  }

  return lines;
}

/** 출타 항목의 종료일 계산 (외박은 시작일+1, 외출은 당일) */
function leaveEndDate(e: { type: string; startDate: string; endDate: string }): Date {
  if (e.type === '휴가') return toDate(e.endDate || e.startDate);
  if (e.type === '외박') {
    const d = toDate(e.startDate);
    d.setDate(d.getDate() + 1);
    return d;
  }
  // 평일외출 / 주말외출: 당일 종료
  return toDate(e.startDate);
}

function buildLeave(ctx: BuildCtx): string[] {
  // 모든 병사의 출타 항목을 (soldier, entry) 쌍으로 풀어냄
  const items: { soldier: Soldier; entry: { type: string; startDate: string; endDate: string } }[] = [];
  for (const s of ctx.soldiers) {
    for (const e of s.traits.leaves) {
      if (!e.startDate) continue;
      // 종료일이 오늘 이전이면 메시지에서 제외
      if (leaveEndDate(e) < ctx.today) continue;
      items.push({ soldier: s, entry: e });
    }
  }
  // 시작일 우선, 같으면 계급순
  items.sort((a, b) => {
    if (a.entry.startDate !== b.entry.startDate) return a.entry.startDate < b.entry.startDate ? -1 : 1;
    return rankIndex(a.soldier.rank) - rankIndex(b.soldier.rank);
  });

  const lines = ['', `${SECTION_ICONS['출타']} 출타 `, ''];
  if (items.length === 0) return [...lines, '-'];

  for (const { soldier: s, entry: l } of items) {
    if (l.type === '휴가') {
      if (!l.endDate) continue;
      const start = shortDate(l.startDate);
      const end = shortDate(l.endDate);
      const startD = toDate(l.startDate);
      const endD = toDate(l.endDate);
      const suffix = startD <= ctx.today && ctx.today <= endD ? '중입니다.' : '예정입니다.';
      lines.push(`${start}~${end} ${s.rank} ${s.name} 휴가 ${suffix}`);
    } else if (l.type === '외박') {
      const startD = toDate(l.startDate);
      const endD = new Date(startD);
      endD.setDate(endD.getDate() + 1);
      const start = shortDate(l.startDate);
      const end = `${endD.getMonth() + 1}/${endD.getDate()}`;
      const suffix = startD <= ctx.today && ctx.today <= endD ? '중입니다.' : '예정입니다.';
      lines.push(`${start}~${end} ${s.rank} ${s.name} 외박 ${suffix}`);
    } else {
      const d = shortDate(l.startDate);
      const dateD = toDate(l.startDate);
      const suffix = dateD <= ctx.today ? '중입니다.' : '예정입니다.';
      lines.push(`${d} ${s.rank} ${s.name} ${l.type} ${suffix}`);
    }
  }
  return lines;
}

function buildReligion(ctx: BuildCtx): string[] {
  const lines: string[] = [];
  const active = RELIGIONS.filter((r) => resolve(ctx.group.religion[r], ctx).length > 0);
  if (active.length === 0) return lines;

  lines.push('', `${SECTION_ICONS['종교']} 종교`);
  for (const rel of active) {
    const members = resolve(ctx.group.religion[rel], ctx);
    lines.push('', `${RELIGION_ICON[rel]} ${rel}`, `${formatMembers(members)} 희망합니다.`);
  }
  return lines;
}

function buildOutpatient(ctx: BuildCtx): string[] {
  const list = ctx.soldiers
    .filter((s) => s.traits.outpatient.hasOutpatient && s.traits.outpatient.date)
    .filter((s) => toDate(s.traits.outpatient.date) >= ctx.today)
    .sort(byDateThenRank((s) => s.traits.outpatient.date));

  const lines = ['', `${SECTION_ICONS['외진']} 외진`, ''];
  if (list.length === 0) return [...lines, '-'];

  for (const s of list) {
    const d = shortDate(s.traits.outpatient.date);
    const place = s.traits.outpatient.place ? ` ${s.traits.outpatient.place}` : '';
    lines.push(`${d} ${s.rank} ${s.name}${place} 외진 예정입니다.`);
  }
  return lines;
}

function buildVisit(ctx: BuildCtx): string[] {
  const list = ctx.soldiers
    .filter((s) => s.traits.visit.hasVisit && s.traits.visit.date && s.traits.visit.visitor)
    .filter((s) => toDate(s.traits.visit.date) >= ctx.today)
    .sort(byDateThenRank((s) => s.traits.visit.date));

  if (list.length === 0) return [];

  return ['', `${SECTION_ICONS['면회']} 면회`, '', ...list.map((s) => {
    const d = shortDate(s.traits.visit.date);
    return `${d} ${s.rank} ${s.name} 면회 (${s.traits.visit.visitor}) 희망합니다.`;
  })];
}

function buildHaircut(ctx: BuildCtx): string[] {
  if (!ctx.group.civHaircut.enabled) return [];
  const members = resolve(ctx.group.civHaircut.members, ctx);
  return [
    '', `${SECTION_ICONS['민간이발']} 민간이발`,
    members.length > 0 ? `${formatMembers(members)} 희망합니다.` : '-',
  ];
}

function buildMilTraining(ctx: BuildCtx): string[] {
  const { group, room } = ctx;
  const active = group.milTrainingEnabled
    ? MIL_TRAININGS.filter((cat) => resolve(group.milTraining[cat], ctx).length > 0)
    : [];

  const lines = ['', `${SECTION_ICONS['병기본']} 병기본`];
  if (active.length === 0) return [...lines, '', `${room}생활관 병기본 희망자 없습니다.`];

  for (const cat of active) {
    const { icon, label } = MIL_CONFIG[cat];
    const members = resolve(group.milTraining[cat], ctx);
    lines.push('', `${icon} ${label}`, `${formatMembers(members)} 희망합니다.`);
  }
  return lines;
}

function buildDelivery(ctx: BuildCtx): string[] {
  const { group } = ctx;
  if (!group.deliveryEnabled || group.deliveryOrders.length === 0) return [];

  const valid = [...group.deliveryOrders]
    .filter((o) => o.date && o.type && o.members.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (valid.length === 0) return [];

  const lines = ['', `${SECTION_ICONS['배달 음식']} 배달 음식`, ''];
  for (const order of valid) {
    const members = resolve(order.members, ctx);
    if (members.length > 0) {
      lines.push(`${shortDate(order.date)} ${formatMembers(members)} ${order.type} 배달 신청합니다.`);
    }
  }
  return lines;
}

// ─── 메시지 생성 (퍼사드) ─────────────────────────────────────────────────────

export function buildMessage(msgCtx: MessageContext): string {
  const { battery, room, reportDate, slots, group } = msgCtx;
  const soldiers = sortByRank(slots.filter((s): s is Soldier => s !== null));

  const ctx: BuildCtx = {
    batteryLabel: battery === '본부' ? '본부포대' : `${battery}포대`,
    room,
    today: toDate(reportDate),
    soldiers,
    byName: new Map(soldiers.map((s) => [s.name, s])),
    group,
  };

  return [
    ...buildHeader(ctx),
    ...buildLeave(ctx),
    ...buildReligion(ctx),
    ...buildOutpatient(ctx),
    ...buildVisit(ctx),
    ...buildHaircut(ctx),
    ...buildMilTraining(ctx),
    ...buildDelivery(ctx),
  ].join('\n');
}
