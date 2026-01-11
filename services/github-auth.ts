import { storage } from '#imports';
import { STORAGE_KEYS } from './storage-keys';

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined;
const GITHUB_SCOPE = 'gist';
const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

function ensureGithubClientId(): string {
  if (!GITHUB_CLIENT_ID) {
    throw new Error('Missing GitHub client ID.');
  }
  return GITHUB_CLIENT_ID;
}

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const response = await fetch(GITHUB_DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: ensureGithubClientId(),
      scope: GITHUB_SCOPE,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to start GitHub device authorization.');
  }

  return (await response.json()) as DeviceCodeResponse;
}

async function fetchGithubToken(deviceCode: string): Promise<TokenResponse> {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: ensureGithubClientId(),
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange GitHub device code for token.');
  }

  return (await response.json()) as TokenResponse;
}

export interface GithubAuthStart {
  verificationUri: string;
  userCode: string;
  expiresIn: number;
  interval: number;
  deviceCode: string;
}

export async function startGithubAuth(): Promise<GithubAuthStart> {
  const deviceCode = await requestDeviceCode();
  return {
    verificationUri: deviceCode.verification_uri,
    userCode: deviceCode.user_code,
    expiresIn: deviceCode.expires_in,
    interval: deviceCode.interval,
    deviceCode: deviceCode.device_code,
  };
}

export async function completeGithubAuth(deviceCode: string, intervalSeconds: number): Promise<void> {
  const intervalMs = Math.max(intervalSeconds, 1) * 1000;
  let attempts = 0;

  while (attempts < 120) {
    const payload = await fetchGithubToken(deviceCode);
    if (payload.access_token) {
      await storage.setItem(STORAGE_KEYS.githubAccessToken, payload.access_token);
      return;
    }

    if (payload.error === 'authorization_pending') {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      attempts += 1;
      continue;
    }

    if (payload.error === 'slow_down') {
      await new Promise((resolve) => setTimeout(resolve, intervalMs + 1000));
      attempts += 1;
      continue;
    }

    throw new Error(payload.error_description ?? payload.error ?? 'GitHub authorization failed.');
  }

  throw new Error('GitHub authorization timed out.');
}

export async function clearGithubAuth(): Promise<void> {
  await storage.removeItem(STORAGE_KEYS.githubAccessToken);
  await storage.removeItem(STORAGE_KEYS.githubGistId);
  await storage.removeItem(STORAGE_KEYS.githubLastSyncAt);
}

export async function getGithubAccessToken(): Promise<string | null> {
  return (await storage.getItem<string>(STORAGE_KEYS.githubAccessToken)) ?? null;
}
