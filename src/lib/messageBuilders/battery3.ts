/**
 * 3포대 메시지 빌더
 */
import type { Soldier } from '../types';
import { rankIndex } from '../types';
import type { BuildCtx } from './common';
import {
  buildNote,
  resolve,
  shortDate,
  toDate,
  toBuildCtx,
  type MessageContext,
} from './common';

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

/** HH:MM → "HH시" 또는 "HH시 MM분" (00분이면 생략) */
function formatDeliveryTime(time: string | undefined): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  if (!h) return '';
  const hour = `${parseInt(h, 10)}시`;
  return m && m !== '00' ? `${hour} ${parseInt(m, 10)}분` : hour;
}

/** 관등성명 전체 표시 (계급 생략 없음) */
function fullNames(soldiers: Soldier[]): string {
  return soldiers.map((s) => `${s.rank} ${s.name}`).join(', ');
}

/** 출타 종료일 계산 */
function leaveEndDate(e: { type: string; startDate: string; endDate: string }): Date {
  if (e.type === '휴가') return toDate(e.endDate || e.startDate);
  if (e.type === '주말외박' || e.type === '면회외박') {
    const d = toDate(e.startDate);
    d.setDate(d.getDate() + 1);
    return d;
  }
  return toDate(e.startDate);
}

/** 출타 날짜 범위 문자열 (M/D~M/D 또는 M/D) */
function leaveDateRange(e: { type: string; startDate: string; endDate: string }): string {
  if (e.type === '휴가' && e.endDate) {
    return `${shortDate(e.startDate)}~${shortDate(e.endDate)}`;
  }
  if (e.type === '주말외박' || e.type === '면회외박') {
    const end = toDate(e.startDate);
    end.setDate(end.getDate() + 1);
    return `${shortDate(e.startDate)}~${end.getMonth() + 1}/${end.getDate()}`;
  }
  return shortDate(e.startDate);
}

// ─── 섹션 빌더 ────────────────────────────────────────────────────────────────

function buildHeader(ctx: BuildCtx): string[] {
  const { batteryLabel, room, soldiers } = ctx;
  const total = soldiers.length;
  const absent = soldiers.filter((s) => s.traits.absence.isAbsent);
  const absentCount = absent.length;
  const present = total - absentCount;

  const lines = [
    `전진! ${batteryLabel} ${room}생활관`,
    '상향식 일일결산 보고드립니다.',
    `-총원: ${total}`,
  ];

  if (absentCount > 0) {
    lines.push(`-열외: ${absentCount}`);
    lines.push(`-현재원: ${present}`);
    const map = new Map<string, number>();
    for (const s of absent) {
      const a = s.traits.absence;
      const label = (a.reason ?? a.customReason) || '열외';
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    const breakdown = [...map.entries()].map(([l, c]) => `${l} ${c}`).join(', ');
    lines.push(`-열외내용: ${breakdown}`);
  } else {
    lines.push(`-현재원: ${present}`);
  }

  return lines;
}

interface LeaveItem {
  soldier: Soldier;
  entry: { type: string; startDate: string; endDate: string };
  dateRange: string;
}

/** 같은 type + dateRange를 가진 출타를 그룹화 */
function groupLeaveItems(items: LeaveItem[]): { type: string; members: Soldier[]; dateRange: string }[] {
  const groups: { key: string; type: string; members: Soldier[]; dateRange: string }[] = [];
  for (const item of items) {
    const key = `${item.entry.type}|${item.dateRange}`;
    const existing = groups.find((g) => g.key === key);
    if (existing) {
      existing.members.push(item.soldier);
    } else {
      groups.push({ key, type: item.entry.type, members: [item.soldier], dateRange: item.dateRange });
    }
  }
  return groups;
}

function buildLeaves(ctx: BuildCtx): string[] {
  const allItems: (LeaveItem & { isOngoing: boolean })[] = [];
  for (const s of ctx.soldiers) {
    for (const e of s.traits.leaves) {
      if (!e.startDate) continue;
      const end = leaveEndDate(e);
      if (end < ctx.today) continue;
      const start = toDate(e.startDate);
      const isOngoing = start <= ctx.today;
      allItems.push({ soldier: s, entry: e, dateRange: leaveDateRange(e), isOngoing });
    }
  }

  allItems.sort((a, b) => {
    if (a.entry.startDate !== b.entry.startDate) return a.entry.startDate < b.entry.startDate ? -1 : 1;
    return rankIndex(a.soldier.rank) - rankIndex(b.soldier.rank);
  });

  const ongoing = allItems.filter((i) => i.isOngoing);
  const upcoming = allItems.filter((i) => !i.isOngoing);

  const lines: string[] = [];

  // 출타자현황
  lines.push('', '출타자현황:');
  if (ongoing.length === 0) {
    lines.push('없습니다.');
  } else {
    for (const g of groupLeaveItems(ongoing)) {
      lines.push(`${g.type} - ${fullNames(g.members)} (${g.dateRange})`);
    }
  }

  // 출타예정
  lines.push('', '출타예정:');
  if (upcoming.length === 0) {
    lines.push('없습니다.');
  } else {
    for (const g of groupLeaveItems(upcoming)) {
      lines.push(`${g.type} - ${fullNames(g.members)} (${g.dateRange})`);
    }
  }

  return lines;
}

function buildHaircut(ctx: BuildCtx): string[] {
  const lines = ['', '민간이발:'];
  if (!ctx.group.civHaircut.enabled) {
    lines.push('없습니다.');
    return lines;
  }
  const members = resolve(ctx.group.civHaircut.members, ctx);
  lines.push(members.length > 0 ? fullNames(members) : '없습니다.');
  return lines;
}

function buildDelivery(ctx: BuildCtx): string[] {
  const { group } = ctx;
  const lines = ['', '배달종합:'];

  if (!group.deliveryEnabled || group.deliveryOrders.length === 0) {
    lines.push('없습니다.');
    return lines;
  }

  const valid = [...group.deliveryOrders]
    .filter((o) => o.type && o.members.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (valid.length === 0) {
    lines.push('없습니다.');
    return lines;
  }

  for (const order of valid) {
    const members = resolve(order.members, ctx);
    if (members.length > 0) {
      const timePart = formatDeliveryTime(order.time);
      lines.push(`${order.type} - ${fullNames(members)}${timePart ? ` (${timePart})` : ''}`);
    }
  }
  return lines;
}

function buildPatients(ctx: BuildCtx): string[] {
  const lines = ['', '환자현황:'];
  const patients = ctx.soldiers.filter((s) => s.traits.outpatient.hasOutpatient);
  lines.push(patients.length > 0 ? fullNames(patients) : '없습니다.');
  return lines;
}

// ─── 3포대 메시지 조립 ────────────────────────────────────────────────────────

export function buildBattery3Message(msgCtx: MessageContext): string {
  const ctx = toBuildCtx(msgCtx);

  return [
    ...buildHeader(ctx),
    ...buildLeaves(ctx),
    ...buildHaircut(ctx),
    ...buildDelivery(ctx),
    ...buildPatients(ctx),
    ...buildNote(ctx),
    '',
    '그 외 특이사항 없습니다.',
  ].join('\n');
}
