import type { FactoryPreference } from "@paypoq/shared";
import * as SecureStore from "expo-secure-store";
import { SessionStorageError } from "@/lib/api/errors";
export { SessionStorageError } from "@/lib/api/errors";

const SESSION_KEY = "paypoq.mobile.session.v2";
const STORAGE_TIMEOUT_MS = 5_000;
const SIGNED_OUT = JSON.stringify({ version: 2, signedOut: true });
export interface StoredSession {
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
  factoryPreference?: FactoryPreference;
}

export interface SecureSessionAdapter {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
}

/**
 * One atomic envelope avoids partial token/expiry writes. Keep the underlying
 * queue even after a timeout: a late save must finish before a queued logout
 * tombstone/delete, never overwrite it. Callers finish in bounded time.
 * Legacy access-only keys/cookies are never used to restore a session.
 */
export function createSessionStorage(adapter: SecureSessionAdapter, timeoutMs = STORAGE_TIMEOUT_MS) {
  let queue: Promise<unknown> = Promise.resolve();
  function run<T>(operation: () => Promise<T>): Promise<T> {
    const pending = queue.then(operation);
    queue = pending.catch(() => undefined);
    let timer: ReturnType<typeof setTimeout> | undefined;
    return Promise.race([
      pending,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new SessionStorageError()), timeoutMs);
      }),
    ]).catch(() => { throw new SessionStorageError(); }).finally(() => clearTimeout(timer));
  }

  return {
    saveStoredSession: (session: StoredSession, isCurrent: () => boolean = () => true) => run(async () => {
      if (!isCurrent()) throw new SessionStorageError();
      await adapter.setItemAsync(SESSION_KEY, JSON.stringify({ version: 2, ...session }));
      // The caller fences activation too; a pending logout is next in this queue.
      if (!isCurrent()) throw new SessionStorageError();
    }),
    loadStoredSession: () => run(async (): Promise<StoredSession | null> => {
      const raw = await adapter.getItemAsync(SESSION_KEY);
      if (!raw) return null;
      try {
        const value = JSON.parse(raw);
        if (value.version === 2 && value.signedOut === true) return null;
        if (value.version !== 2 || typeof value.accessToken !== "string" || !value.accessToken ||
            typeof value.refreshToken !== "string" || !value.refreshToken ||
            typeof value.accessTokenExpiresAt !== "number" || !Number.isFinite(value.accessTokenExpiresAt)) {
          throw new SessionStorageError();
        }
        const preference = value.factoryPreference;
        const factoryPreference = preference && typeof preference.tenantId === "string" && typeof preference.userId === "string" &&
          (typeof preference.factoryId === "string" || preference.factoryId === null) ? preference as FactoryPreference : undefined;
        return { accessToken: value.accessToken, refreshToken: value.refreshToken, accessTokenExpiresAt: value.accessTokenExpiresAt, ...(factoryPreference ? { factoryPreference } : {}) };
      } catch {
        throw new SessionStorageError();
      }
    }),
    // Patch the current envelope inside the same queue as rotation. A factory
    // switch never writes a captured, potentially consumed refresh credential.
    updateFactoryPreference: (preference: FactoryPreference, isCurrent: () => boolean) => run(async () => {
      if (!isCurrent()) return;
      const raw = await adapter.getItemAsync(SESSION_KEY);
      if (!isCurrent()) return;
      if (!raw) throw new SessionStorageError();
      const record = JSON.parse(raw);
      if (record.version !== 2 || !record.refreshToken || record.signedOut) throw new SessionStorageError();
      await adapter.setItemAsync(SESSION_KEY, JSON.stringify({ ...record, factoryPreference: preference }));
    }),
    clearStoredSession: () => run(async () => {
      // Either successful overwrite or delete prevents restoration after restart.
      let tombstoneWritten = false;
      try {
        await adapter.setItemAsync(SESSION_KEY, SIGNED_OUT);
        tombstoneWritten = true;
      } catch { /* deletion is the independent fallback */ }
      try {
        await adapter.deleteItemAsync(SESSION_KEY);
      } catch {
        if (!tombstoneWritten) throw new SessionStorageError();
      }
    }),
  };
}

const storage = createSessionStorage({
  getItemAsync: (key) => SecureStore.getItemAsync(key),
  setItemAsync: (key, value) => SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  }),
  deleteItemAsync: (key) => SecureStore.deleteItemAsync(key),
});
export const { saveStoredSession, loadStoredSession, clearStoredSession, updateFactoryPreference } = storage;

export function getAccessTokenExpiresAt(expiresInSeconds: number): number {
  return Date.now() + expiresInSeconds * 1000;
}

export function isAccessTokenUsable(expiresAt: number): boolean {
  return expiresAt > Date.now() + 30_000;
}
