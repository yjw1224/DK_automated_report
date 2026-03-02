/**
 * 메시지 빌더 — 포대별 디스패처
 *
 * battery 값에 따라 해당 포대 빌더를 호출합니다.
 *   '본부' → hq.ts
 *   '1'    → battery1.ts
 *   '2'    → battery2.ts
 *   '3'    → battery3.ts
 */
export type { GroupSettings, MessageContext, BatteryKey } from './common';

import type { MessageContext } from './common';
import { buildHqMessage } from './hq';
import { buildBattery1Message } from './battery1';
import { buildBattery2Message } from './battery2';
import { buildBattery3Message } from './battery3';

const builders: Record<string, (ctx: MessageContext) => string> = {
  '본부': buildHqMessage,
  '1':    buildBattery1Message,
  '2':    buildBattery2Message,
  '3':    buildBattery3Message,
};

export function buildMessage(msgCtx: MessageContext): string {
  const builder = builders[msgCtx.battery];
  if (!builder) {
    throw new Error(`Unknown battery: "${msgCtx.battery}"`);
  }
  return builder(msgCtx);
}
