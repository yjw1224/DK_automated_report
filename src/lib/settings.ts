import { APP_SETTINGS_STORAGE_KEY } from "./storageKeys";

export interface AppSettings {
  /** 지난 출타 일정 자동 삭제 여부 */
  autoDeletePastLeaves: boolean;
  /** 매월 1일 진급 대상자 알림 여부 */
  promotionAlertEnabled: boolean;
}

export function defaultAppSettings(): AppSettings {
  return {
    autoDeletePastLeaves: true,
    promotionAlertEnabled: true,
  };
}

function normalizeSettings(input: unknown): AppSettings {
  const defaults = defaultAppSettings();
  if (!input || typeof input !== "object") return defaults;

  const raw = input as Partial<AppSettings>;

  return {
    autoDeletePastLeaves:
      typeof raw.autoDeletePastLeaves === "boolean"
        ? raw.autoDeletePastLeaves
        : defaults.autoDeletePastLeaves,
    promotionAlertEnabled:
      typeof raw.promotionAlertEnabled === "boolean"
        ? raw.promotionAlertEnabled
        : defaults.promotionAlertEnabled,
  };
}

export function getAppSettings(): AppSettings {
  const defaults = defaultAppSettings();

  try {
    const raw = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (!raw) return defaults;
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return defaults;
  }
}

export function setAppSettings(next: AppSettings): AppSettings {
  const normalized = normalizeSettings(next);
  localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function updateAppSettings(patch: Partial<AppSettings>): AppSettings {
  const current = getAppSettings();
  return setAppSettings({ ...current, ...patch });
}

export function ensureAppSettingsInitialized(): AppSettings {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return setAppSettings(defaultAppSettings());
    }

    const parsed = JSON.parse(raw);
    const normalized = normalizeSettings(parsed);
    // 기존 저장 구조가 불완전한 경우, 정규화된 값을 다시 저장해 스키마를 맞춘다.
    localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return setAppSettings(defaultAppSettings());
  }
}
