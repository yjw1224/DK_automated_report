/**
 * 3포대 메시지 빌더
 *
 * TODO: 3포대 고유 메시지 형식을 구현하세요.
 *       현재는 기본 스텁만 제공됩니다.
 */
import { toBuildCtx, type MessageContext } from './common';

export function buildBattery3Message(msgCtx: MessageContext): string {
  const ctx = toBuildCtx(msgCtx);

  return [
    `${ctx.batteryLabel} ${ctx.room}생활관`,
    '',
    '// TODO: 3포대 메시지 형식을 구현하세요.',
  ].join('\n');
}
