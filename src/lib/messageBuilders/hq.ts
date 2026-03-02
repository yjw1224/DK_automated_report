/**
 * 본부포대 메시지 빌더
 */
import type { Soldier } from '../types';
import { MIL_TRAININGS, RELIGIONS, rankIndex } from '../types';
import type { BuildCtx } from './common';
import {
  MIL_CONFIG,
  RELIGION_ICON,
  SECTION_ICONS,
  byDateThenRank,
  formatMembers,
  particle,
  resolve,
  shortDate,
  toDate,
  toBuildCtx,
  type MessageContext,
} from './common';

// ─── 섹션 빌더 ────────────────────────────────────────────────────────────────

function buildHeader(ctx: BuildCtx): string[] {
  const { batteryLabel, room, soldiers } = ctx;
  const total = soldiers.length;
  const absent = soldiers.filter((s) => s.traits.absence.isAbsent);
  const absentCount = absent.length;
  const present = total - absentCount;

  const lines = [`${batteryLabel} ${room}생활관 `];

  if (absentCount > 0) {
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
  return toDate(e.startDate);
}

function buildLeave(ctx: BuildCtx): string[] {
  const items: { soldier: Soldier; entry: { type: string; startDate: string; endDate: string } }[] = [];
  for (const s of ctx.soldiers) {
    for (const e of s.traits.leaves) {
      if (!e.startDate) continue;
      if (leaveEndDate(e) < ctx.today) continue;
      items.push({ soldier: s, entry: e });
    }
  }
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

// ─── 본부포대 메시지 조립 ──────────────────────────────────────────────────────

export function buildHqMessage(msgCtx: MessageContext): string {
  const ctx = toBuildCtx(msgCtx);

  return [
    ...buildHeader(ctx),
    ...buildLeave(ctx),
    ...buildReligion(ctx),
    ...buildOutpatient(ctx),
    ...buildVisit(ctx),
    ...buildHaircut(ctx),
    ...buildMilTraining(ctx),
    ...buildDelivery(ctx),
    '',
    '자살징후, 구타 및 가혹행위, 언어폭력 등 1번 항목 특이사항 없습니다.',
    '',
    '분대원 면담 및 관찰 결과 특이사항 없습니다.',
    '',
    '그 외 특이사항 및 건의사항 없습니다.',
  ].join('\n');
}
