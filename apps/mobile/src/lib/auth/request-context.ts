import type { AuthContext } from "@paypoq/shared";

export type ContextScope = "factory" | "tenant" | "session";

/** Immutable client identity. Contains no access/refresh credentials. */
export interface RequestContextSnapshot {
  sessionGeneration: number;
  revision: number;
  authorizationVersion: number;
  tenantId: string | null;
  userId: string | null;
  factoryId: string | null;
  factoryName: string | null;
}

let context: RequestContextSnapshot = Object.freeze({
  sessionGeneration: 0, revision: 0, authorizationVersion: 0,
  tenantId: null, userId: null, factoryId: null, factoryName: null,
});
let authorization = "";
const listeners = new Set<() => void>();

export const getRequestContext = () => context;
export const subscribeRequestContext = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

function publish(next: RequestContextSnapshot) {
  context = Object.freeze(next);
  for (const listener of listeners) listener();
}

export function advanceApiSessionGeneration(): number {
  authorization = "";
  publish({
    sessionGeneration: context.sessionGeneration + 1, revision: context.revision + 1,
    authorizationVersion: context.authorizationVersion + 1,
    tenantId: null, userId: null, factoryId: null, factoryName: null,
  });
  return context.sessionGeneration;
}
export const getApiSessionGeneration = () => context.sessionGeneration;

export function setApiSessionContext(value: AuthContext): RequestContextSnapshot {
  const signature = JSON.stringify([
    value.tenantId, value.user.id, value.branchMode,
    [...value.roles].sort(), [...value.permissions].sort(),
    value.accessibleFactories.map((factory) => factory.id).sort(),
  ]);
  const authChanged = signature !== authorization;
  const changed = authChanged || context.factoryId !== value.activeFactoryId;
  const factoryName = value.accessibleFactories.find((factory) => factory.id === value.activeFactoryId)?.name ?? null;
  authorization = signature;
  if (changed || context.factoryName !== factoryName) publish({
    ...context, tenantId: value.tenantId, userId: value.user.id,
    factoryId: value.activeFactoryId, factoryName,
    revision: context.revision + (changed ? 1 : 0),
    authorizationVersion: context.authorizationVersion + (authChanged ? 1 : 0),
  });
  return context;
}

/** Compatibility setter; authenticated factory changes are published by the store. */
export function setApiActiveFactoryId(factoryId: string | null): void {
  if (context.factoryId !== factoryId) publish({ ...context, factoryId, factoryName: null, revision: context.revision + 1 });
}

export function sameSession(origin: RequestContextSnapshot, now = context): boolean {
  return origin.sessionGeneration === now.sessionGeneration && origin.tenantId === now.tenantId && origin.userId === now.userId;
}

export function isContextCurrent(origin: RequestContextSnapshot, scope: ContextScope = "factory"): boolean {
  // Session validation (/auth/me) may begin before the API has supplied identity.
  if (scope === "session") return origin.sessionGeneration === context.sessionGeneration &&
    (origin.userId === null || sameSession(origin));
  return sameSession(origin) && origin.userId !== null && origin.tenantId !== null &&
    origin.authorizationVersion === context.authorizationVersion &&
    (scope === "tenant" || (origin.factoryId !== null && origin.factoryId === context.factoryId && origin.revision === context.revision));
}
