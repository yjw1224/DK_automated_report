/**
 * 본부포대 메시지 빌더
 */
import type { Soldier } from '../types';
import { MIL_TRAININGS, RELIGIONS, rankIndex, LeaveEntry } from '../types';
import type { BuildCtx } from './common';
import {
  MIL_CONFIG,
  RELIGION_ICON,
  SECTION_ICONS,
  buildNote,
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

  const lines = [`[${batteryLabel} ${room}생활관]`];

  if (absentCount > 0) {
    const map = new Map<string, number>();
    for (const s of absent) {
      const a = s.traits.absence;
      const label = (a.reason ?? a.customReason) || '열외';
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    const breakdown = [...map.entries()].map(([l, c]) => `${l} ${c}`).join(' ');
    lines.push(`총원 ${total} 열외 ${absentCount}`);
    lines.push(`열외내용 ${breakdown}`);
    lines.push(`현재원 ${present}`);
  } else {
    lines.push(`총원 ${total}`);
    lines.push(`현재원 ${present}`);
  }

  return lines;
}

/** 출타 항목의 종료일 계산 (외박은 시작일+1, 외출은 당일) */
function leaveEndDate(e: { type: string; startDate: string; endDate: string }): Date {
  if (e.type === '휴가') return toDate(e.endDate || e.startDate);
  if (e.type === '주말외박' || e.type === '면회외박') {
    const d = toDate(e.startDate);
    d.setDate(d.getDate() + 1);
    return d;
  }
  return toDate(e.startDate);
}

function buildLeave(ctx: BuildCtx): string[] {
  const vacations: { soldier: Soldier; leave: LeaveEntry }[] = [];
  const outings: { soldier: Soldier; leave: LeaveEntry }[] = [];
  const overnights: { soldier: Soldier; leave: LeaveEntry }[] = [];

  // 출타 수집
  for (const soldier of ctx.soldiers) {
    for (const leave of soldier.traits.leaves) {
      if (!leave.startDate) continue;
      if (leaveEndDate(leave) < ctx.today) continue;

      switch (leave.type) {
        case '휴가':
          vacations.push({ soldier, leave });
          break;

        case '평일외출':
        case '주말외출':
          outings.push({ soldier, leave });
          break;

        case '평일외박':
        case '주말외박':
        case '면회외박':
          overnights.push({ soldier, leave });
          break;
      }
    }
  }

  // 시작일 → 계급 순 정렬
  const sorter = (
    a: { soldier: Soldier; leave: LeaveEntry },
    b: { soldier: Soldier; leave: LeaveEntry }
  ) => {
    if (a.leave.startDate !== b.leave.startDate) {
      return a.leave.startDate < b.leave.startDate ? -1 : 1;
    }
    return rankIndex(a.soldier.rank) - rankIndex(b.soldier.rank);
  };

  vacations.sort(sorter);
  outings.sort(sorter);
  overnights.sort(sorter);

  const lines: string[] = [
    '',
    `${SECTION_ICONS['출타']} 출타`,
    '',
    '○ 휴가'
  ];

  if (vacations.length === 0) {
    lines.push('없음');
  } else {
    for (const { soldier, leave } of vacations) {
      lines.push(
        `${shortDate(leave.startDate)} / ${soldier.rank} ${soldier.name} / ${shortDate(leave.endDate)}(${leave.leaveType}) / ${leave.destination}`
      );
    }
  }

  lines.push('', '○ 외출');

  if (outings.length === 0) {
    lines.push('없음');
  } else {
    for (const { soldier, leave } of outings) {
      lines.push(
        `${shortDate(leave.startDate)} / ${soldier.rank} ${soldier.name} / ${leave.destination}`
      );
    }
  }

  lines.push('', '○ 외박');

  if (overnights.length === 0) {
    lines.push('없음');
  } else {
    for (const { soldier, leave } of overnights) {
      lines.push(
        `${shortDate(leave.startDate)} / ${soldier.rank} ${soldier.name} / ${leave.destination}`
      );
    }
  }

  return lines;
}

function buildReligion(ctx: BuildCtx): string[] {
  if(ctx.today.getDay() !== 4) return [];

  const lines: string[] = [];
  const active = RELIGIONS.filter((r) => resolve(ctx.group.religion[r], ctx).length > 0);
  if (active.length === 0) return lines;

  lines.push('', `${SECTION_ICONS['종교']} 종교`);
  for (const rel of active) {
    const members = resolve(ctx.group.religion[rel], ctx);
    lines.push('', `${RELIGION_ICON[rel]} ${rel}`, `${formatMembers(members)}`);
  }
  return lines;
}

function buildOutpatient(ctx: BuildCtx): string[] {
  const list = ctx.soldiers
    .filter((s) => s.traits.outpatient.hasOutpatient && s.traits.outpatient.date)
    .filter((s) => toDate(s.traits.outpatient.date) >= ctx.today)
    .sort(byDateThenRank((s) => s.traits.outpatient.date));

  const lines = ['', `${SECTION_ICONS['외진']} 외진`];
  if (list.length === 0) return [...lines, '없음'];

  for (const s of list) {
    const d = shortDate(s.traits.outpatient.date);
    const place = s.traits.outpatient.place ? ` ${s.traits.outpatient.place}` : '';
    const part = s.traits.outpatient.part;
    const vehicle = s.traits.outpatient.vehicle;
    const time = s.traits.outpatient.time.split(':');
    lines.push(`${d} / ${s.rank} ${s.name} / ${place} / ${part} / ${vehicle} / ${time[0]}${time[1]}`);
  }
  return lines;
}

function buildVisit(ctx: BuildCtx): string[] {
  const list = ctx.soldiers
    .filter((s) => s.traits.visit.hasVisit && s.traits.visit.date && s.traits.visit.visitor)
    .filter((s) => toDate(s.traits.visit.date) >= ctx.today)
    .sort(byDateThenRank((s) => s.traits.visit.date));

  if (list.length === 0) return ['', `${SECTION_ICONS['면회']} 면회`, '없음'];

  return ['', `${SECTION_ICONS['면회']} 면회`, ...list.map((s) => {
    const d = shortDate(s.traits.visit.date);
    const hour_minute = s.traits.visit.time ? ` ${s.traits.visit.time}` : '';
    return `${d} / ${hour_minute} / ${s.rank} ${s.name} / ${s.traits.visit.visitType} / ${s.traits.visit.visitor}`;
  })];
}

function buildHaircut(ctx: BuildCtx): string[] {
  if(ctx.today.getDay() !== 1) return [];

  if (!ctx.group.civHaircut.enabled) return [];
  const members = resolve(ctx.group.civHaircut.members, ctx);
  if(members.length == 0) return [];
  return [
    '', `${SECTION_ICONS['민간이발']} 민간이발`,
    `- 총원 ${members.length} 명`,
    `- ${formatMembers(members)}`
  ];
}

function buildMilTraining(ctx: BuildCtx): string[] {
  const { group, room } = ctx;
  const active = group.milTrainingEnabled
    ? MIL_TRAININGS.filter((cat) => resolve(group.milTraining[cat], ctx).length > 0)
    : [];

  if (active.length === 0) return [];

  const lines = ['', `${SECTION_ICONS['병기본']} 병기본`];

  for (const cat of active) {
    const { icon, label } = MIL_CONFIG[cat];
    const members = resolve(group.milTraining[cat], ctx);
    lines.push('', `${icon} ${label}`, `${formatMembers(members)}`);
  }
  return lines;
}

function buildDelivery(ctx: BuildCtx): string[] {
  const { group } = ctx;
  if (!group.deliveryEnabled || group.deliveryOrders.length === 0) return [];

  const valid = [...group.deliveryOrders]
    .filter((o) => o.date && o.type && o.members.length > 0 && toDate(o.date) >= ctx.today)
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
    ...buildOutpatient(ctx),
    ...buildVisit(ctx),
    ...buildReligion(ctx),
    ...buildHaircut(ctx),
    ...buildMilTraining(ctx),
    ...buildDelivery(ctx),
    ...buildNote(ctx),
    '',
    '⚠️ 병력 특이사항 확인',
    '자살징후, 구타 및 가혹행위, 언어폭력 등 1번 항목 특이사항 없습니다.',
    '',
    '분대원 면담 및 관찰 결과 특이사항 없습니다.'
  ].join('\n');
}
