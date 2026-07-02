import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "paypoq.mobile.accessToken";
const ACCESS_TOKEN_EXPIRES_AT_KEY = "paypoq.mobile.accessTokenExpiresAt";

export interface StoredSession {
  accessToken: string;
  accessTokenExpiresAt: number;
}

export async function saveStoredSession(session: StoredSession): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, session.accessToken),
    SecureStore.setItemAsync(
      ACCESS_TOKEN_EXPIRES_AT_KEY,
      String(session.accessTokenExpiresAt),
    ),
  ]);
}

export async function loadStoredSession(): Promise<StoredSession | null> {
  const [accessToken, expiresAtValue] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(ACCESS_TOKEN_EXPIRES_AT_KEY),
  ]);

  if (!accessToken || !expiresAtValue) {
    return null;
  }

  const accessTokenExpiresAt = Number(expiresAtValue);

  if (!Number.isFinite(accessTokenExpiresAt)) {
    await clearStoredSession();
    return null;
  }

  return {
    accessToken,
    accessTokenExpiresAt,
  };
}

export async function clearStoredSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(ACCESS_TOKEN_EXPIRES_AT_KEY),
  ]);
}

export function getAccessTokenExpiresAt(expiresInSeconds: number): number {
  return Date.now() + expiresInSeconds * 1000;
}

export function isAccessTokenUsable(expiresAt: number): boolean {
  const refreshSkewMs = 30_000;

  return expiresAt > Date.now() + refreshSkewMs;
}

