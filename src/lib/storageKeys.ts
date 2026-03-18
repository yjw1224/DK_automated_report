import type { Battery, Room } from './types';

export const MAIN_FORM_STORAGE_KEY = 'dk-main-form';
export const PERSONNEL_STORAGE_KEY_PREFIX = 'dk-personnel';
export const GROUP_STORAGE_KEY_PREFIX = 'dk-group';

export function getPersonnelStorageKey(battery: Battery, room: Room): string {
  return `${PERSONNEL_STORAGE_KEY_PREFIX}-${battery}-${room}`;
}

export function getGroupStorageKey(battery: Battery, room: Room): string {
  return `${GROUP_STORAGE_KEY_PREFIX}-${battery}-${room}`;
}
