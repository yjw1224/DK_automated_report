/**
 * 메시지 빌더 — 하위 호환 래퍼
 *
 * 실제 구현은 messageBuilders/ 디렉토리에 포대별로 분리되어 있습니다.
 * 기존 import 경로를 그대로 사용할 수 있도록 re-export합니다.
 */
export { buildMessage } from './messageBuilders';
export type { GroupSettings, MessageContext } from './messageBuilders';
