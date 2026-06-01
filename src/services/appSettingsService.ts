import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import api from './api';

export type PlatformAppSettings = {
  latestVersion: string;
  minSupportedVersion: string;
  forceUpdate: boolean;
  storeUrl: string;
  notes: string;
};

export type AppSettingsResponse = {
  android: PlatformAppSettings;
  ios: PlatformAppSettings;
  updatedAt: string;
};

function normalizeVersion(v: string): string {
  const parts = (v ?? '').trim().split('.').filter(Boolean);
  while (parts.length < 3) parts.push('0');
  return parts.slice(0, 3).join('.');
}

function compareSemver(aRaw: string, bRaw: string): number {
  const a = normalizeVersion(aRaw).split('.').map((n) => Number(n));
  const b = normalizeVersion(bRaw).split('.').map((n) => Number(n));
  for (let i = 0; i < 3; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export async function fetchAppSettings(): Promise<AppSettingsResponse> {
  const res = await api.get<AppSettingsResponse>(`/public/app-settings?t=${Date.now()}`, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
  return res.data;
}

export type UpdateDecision =
  | { kind: 'ok' }
  | {
      kind: 'force';
      currentVersion: string;
      latestVersion: string;
      minSupportedVersion: string;
      storeUrl: string;
      notes: string;
    }
  | {
      kind: 'optional';
      currentVersion: string;
      latestVersion: string;
      minSupportedVersion: string;
      storeUrl: string;
      notes: string;
    };

export async function checkForUpdate(): Promise<UpdateDecision> {
  const settings = await fetchAppSettings();
  const platformSettings = Platform.OS === 'android' ? settings.android : settings.ios;

  const currentVersion = DeviceInfo.getVersion(); // e.g. "1.0.0"
  const latestVersion = platformSettings.latestVersion;
  const minSupportedVersion = platformSettings.minSupportedVersion;

  const belowLatest = compareSemver(currentVersion, latestVersion) < 0;

  const bundleId = DeviceInfo.getBundleId();
  const fallbackStoreUrl =
    Platform.OS === 'android'
      ? `https://play.google.com/store/apps/details?id=${bundleId}`
      : '';

  const storeUrl = platformSettings.storeUrl?.trim() || fallbackStoreUrl;

  if (belowLatest) {
    return {
      kind: 'force',
      currentVersion,
      latestVersion,
      minSupportedVersion,
      storeUrl,
      notes: platformSettings.notes,
    };
  }

  return { kind: 'ok' };
}

