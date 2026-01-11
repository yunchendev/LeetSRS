import { storage } from '#imports';
import { exportData, importData } from './import-export';
import { STORAGE_KEYS } from './storage-keys';
import { getGithubAccessToken } from './github-auth';

const GIST_FILENAME = 'leetsrs-backup.json';
const GITHUB_API_BASE = 'https://api.github.com';

interface GistFile {
  filename?: string;
  content?: string;
}

interface GistResponse {
  id: string;
  files: Record<string, GistFile>;
}

async function fetchGithub<T>(url: string, token: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `token ${token}`,
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error('GitHub API request failed.');
  }

  return (await response.json()) as T;
}

async function getStoredGistId(): Promise<string | null> {
  return (await storage.getItem<string>(STORAGE_KEYS.githubGistId)) ?? null;
}

async function setLastSyncAt(value: string): Promise<void> {
  await storage.setItem(STORAGE_KEYS.githubLastSyncAt, value);
}

export async function getGithubSyncStatus(): Promise<{
  isConnected: boolean;
  lastSyncAt: string | null;
  gistId: string | null;
}> {
  const token = await getGithubAccessToken();
  const lastSyncAt = (await storage.getItem<string>(STORAGE_KEYS.githubLastSyncAt)) ?? null;
  const gistId = await getStoredGistId();
  return {
    isConnected: Boolean(token),
    lastSyncAt,
    gistId,
  };
}

export async function pushGithubSync(): Promise<void> {
  const token = await getGithubAccessToken();
  if (!token) {
    throw new Error('Not connected to GitHub.');
  }

  const payload = await exportData();
  const gistId = await getStoredGistId();
  const now = new Date().toISOString();

  if (!gistId) {
    const response = await fetchGithub<GistResponse>(`${GITHUB_API_BASE}/gists`, token, {
      method: 'POST',
      body: JSON.stringify({
        description: 'LeetSRS Sync Data',
        public: false,
        files: {
          [GIST_FILENAME]: {
            content: payload,
          },
        },
      }),
    });
    await storage.setItem(STORAGE_KEYS.githubGistId, response.id);
  } else {
    await fetchGithub<GistResponse>(`${GITHUB_API_BASE}/gists/${gistId}`, token, {
      method: 'PATCH',
      body: JSON.stringify({
        files: {
          [GIST_FILENAME]: {
            content: payload,
          },
        },
      }),
    });
  }

  await setLastSyncAt(now);
}

export async function pullGithubSync(): Promise<void> {
  const token = await getGithubAccessToken();
  if (!token) {
    throw new Error('Not connected to GitHub.');
  }

  const gistId = await getStoredGistId();
  if (!gistId) {
    throw new Error('No GitHub sync target configured.');
  }

  const response = await fetchGithub<GistResponse>(`${GITHUB_API_BASE}/gists/${gistId}`, token);
  const file = response.files[GIST_FILENAME];
  if (!file?.content) {
    throw new Error('GitHub sync file not found.');
  }

  await importData(file.content);
  await setLastSyncAt(new Date().toISOString());
}
