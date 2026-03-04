import { defaultTraits, type PersonnelTraits, type Slot, type Soldier } from './types';

// ─── 인수인계 데이터 전송 포맷 ──────────────────────────────────────────────

export interface GroupSettings {
  civHaircut: { enabled: boolean; members: string[] };
  religion: Record<string, string[]>;
  milTrainingEnabled: boolean;
  milTraining: Record<string, string[]>;
  deliveryEnabled: boolean;
  deliveryOrders: { date: string; time: string; type: string; members: string[] }[];
  groupNote: string;
}

export interface TransferData {
  /** 버전 (향후 호환성용) */
  v: 1;
  /** 포대 */
  bat: string;
  /** 생활관 */
  rm: string;
  /** 인원 슬롯 */
  slots: Slot[];
  /** 단체 설정 */
  group: GroupSettings;
}

// ─── 기본값 제거 / 복원 (직렬화 최적화) ──────────────────────────────────────

/** traits에서 기본값과 동일한 필드를 제거한 경량 객체 반환 */
function stripDefaults(t: PersonnelTraits): Partial<PersonnelTraits> {
  const d = defaultTraits();
  const out: Partial<PersonnelTraits> = {};

  // absence: 기본이 아닐 때만 포함
  if (t.absence.isAbsent || t.absence.reason !== d.absence.reason || t.absence.customReason !== d.absence.customReason) {
    out.absence = t.absence;
  }

  // leaves: 비어있지 않을 때만
  if (t.leaves.length > 0) {
    out.leaves = t.leaves;
  }

  // outpatient: 기본이 아닐 때만
  if (t.outpatient.hasOutpatient || t.outpatient.date || t.outpatient.place) {
    out.outpatient = t.outpatient;
  }

  // visit: 기본이 아닐 때만
  if (t.visit.hasVisit || t.visit.date || t.visit.visitor) {
    out.visit = t.visit;
  }

  return out;
}

/** 경량 객체에서 기본값을 채워 완전한 PersonnelTraits 복원 */
function restoreDefaults(partial: Partial<PersonnelTraits>): PersonnelTraits {
  const d = defaultTraits();
  return {
    absence: partial.absence ?? d.absence,
    leaves: partial.leaves ?? d.leaves,
    outpatient: partial.outpatient ?? d.outpatient,
    visit: partial.visit ?? d.visit
  };
}

/** 슬롯 배열을 경량화 */
function compactSlots(slots: Slot[]): unknown[] {
  return slots.map((s) =>
    s === null ? null : { rank: s.rank, name: s.name, traits: stripDefaults(s.traits) }
  );
}

/** 경량 슬롯 배열을 원본으로 복원 */
function expandSlots(raw: unknown[]): Slot[] {
  return raw.map((s) => {
    if (s === null || s === undefined) return null;
    const obj = s as { rank: string; name: string; traits?: Partial<PersonnelTraits> };
    return {
      rank: obj.rank,
      name: obj.name,
      traits: restoreDefaults(obj.traits ?? {})
    } as Soldier;
  });
}

// ─── gzip 압축 + Base64 인코딩 ──────────────────────────────────────────────

async function compress(str: string): Promise<Uint8Array> {
  const stream = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip')) as ReadableStream<Uint8Array>;
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}

async function decompress(bytes: Uint8Array): Promise<string> {
  const blob = new Blob([bytes.buffer as ArrayBuffer]);
  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip')) as ReadableStream<Uint8Array>;
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return new TextDecoder().decode(result);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

// ─── 내보내기 (export) ──────────────────────────────────────────────────────

export async function encodeTransferData(
  battery: string,
  room: string,
  slots: Slot[],
  group: GroupSettings
): Promise<string> {
  const payload = {
    v: 1,
    bat: battery,
    rm: room,
    slots: compactSlots(slots),
    group
  };
  const json = JSON.stringify(payload);
  const compressed = await compress(json);
  return bytesToBase64(compressed);
}

// ─── 불러오기 (import) ──────────────────────────────────────────────────────

export type ImportResult =
  | { ok: true; data: TransferData }
  | { ok: false; error: string };

export async function decodeTransferData(encoded: string): Promise<ImportResult> {
  try {
    const trimmed = encoded.trim();
    if (!trimmed) return { ok: false, error: '빈 문자열입니다.' };

    const bytes = base64ToBytes(trimmed);
    const json = await decompress(bytes);
    const parsed = JSON.parse(json);

    if (parsed.v !== 1) {
      return { ok: false, error: `지원하지 않는 버전입니다 (v${parsed.v}).` };
    }

    if (!parsed.bat || !parsed.rm || !Array.isArray(parsed.slots)) {
      return { ok: false, error: '필수 데이터가 누락되었습니다.' };
    }

    parsed.slots = expandSlots(parsed.slots);
    return { ok: true, data: parsed as TransferData };
  } catch {
    return { ok: false, error: '유효하지 않은 인수인계 코드입니다. 코드를 다시 확인해주세요.' };
  }
}

// ─── localStorage 저장 ──────────────────────────────────────────────────────

export function applyTransferData(data: TransferData): void {
  const personnelKey = `dk-personnel-${data.bat}-${data.rm}`;
  const groupKey = `dk-group-${data.bat}-${data.rm}`;

  localStorage.setItem(personnelKey, JSON.stringify(data.slots));
  localStorage.setItem(groupKey, JSON.stringify(data.group));
}
