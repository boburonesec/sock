import {
  canUseEndpoint,
  resolveAreaAccess,
  type AreaAccessDecision,
  type TenantAreaKey,
  type Wave1EndpointKey,
} from "@paypoq/shared";
import { useMemo } from "react";

import { getMobileEnv } from "@/config/env";
import { useAuthStore } from "@/stores/auth-store";

export interface Access {
  permissions: readonly string[];
  roles: readonly string[];
  /** May the user call this endpoint (same permission + role rule as Web)? */
  can: (endpoint: Wave1EndpointKey) => boolean;
  /** May the user open this product area (permissions + pilot role scope)? */
  area: (area: TenantAreaKey) => AreaAccessDecision;
}

/**
 * UX-only authorization: hides affordances and blocks deep routes the user
 * cannot use. The API enforces every permission again on each request.
 */
export function useAccess(): Access {
  const permissions = useAuthStore((state) => state.permissions);
  const roles = useAuthStore((state) => state.roles);

  return useMemo(() => {
    const { pilotScopeEnabled } = getMobileEnv();

    return {
      permissions,
      roles,
      can: (endpoint) => canUseEndpoint(endpoint, permissions, roles),
      area: (area) => resolveAreaAccess(area, permissions, roles, { pilotScopeEnabled }),
    };
  }, [permissions, roles]);
}

/** Operational areas reachable from the Operations tab, in display order. */
export const OPERATIONS_AREAS: readonly TenantAreaKey[] = [
  "production",
  "machines",
  "mechanic",
  "warehouse",
];
