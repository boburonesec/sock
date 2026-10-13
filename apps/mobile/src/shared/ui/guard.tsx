import type { TenantAreaKey, Wave1EndpointKey } from "@paypoq/shared";
import { type Href } from "expo-router";
import { type ReactNode } from "react";

import { useAccess } from "@/lib/access/use-access";
import { AccessDenied, SkeletonList } from "@/shared/ui/feedback";
import { useOperationalContextReady } from "@/shared/ui/session-context-boundary";
import { Screen } from "@/shared/ui/screen";
import { ErrorState } from "@/shared/ui/states";

interface AreaGuardProps {
  area: TenantAreaKey;
  /** Extra endpoint the screen writes to; denied users get an explicit state. */
  endpoint?: Wave1EndpointKey;
  title: string;
  backTo?: Href;
  children: ReactNode;
}

/**
 * Deep-route authorization. Hiding a link is not enough: a restored
 * navigation state or a deep link can still open the route. Children (and
 * their queries) only mount when the same rule Web applies allows the area.
 * This is UX; the API still authorizes every request.
 */
export function AreaGuard({ area, endpoint, title, backTo, children }: AreaGuardProps) {
  const access = useAccess();
  const decision = access.area(area);
  const contextReady = useOperationalContextReady();
  if (!contextReady) return <Screen backTo={backTo} title={title}><SkeletonList /></Screen>;

  if (!decision.allowed) {
    return (
      <Screen backTo={backTo} title={title}>
        <AccessDenied reason={decision.reason} />
      </Screen>
    );
  }

  if (endpoint && !access.can(endpoint)) {
    return (
      <Screen backTo={backTo} title={title}>
        <AccessDenied reason="Bu amalni bajarish uchun ruxsatingiz yo'q." />
      </Screen>
    );
  }

  return <>{children}</>;
}

interface QueryLike {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
}

/** Loading skeleton → error with retry → content, for one or more queries. */
export function QueryState({
  queries,
  skeletonRows,
  children,
}: {
  queries: QueryLike[];
  skeletonRows?: number;
  children: ReactNode;
}) {
  const failed = queries.find((query) => query.isError);

  if (failed) {
    return (
      <ErrorState
        error={failed.error}
        onRetry={() => queries.forEach((query) => void query.refetch())}
      />
    );
  }

  if (queries.some((query) => query.isLoading)) {
    return <SkeletonList rows={skeletonRows} />;
  }

  return <>{children}</>;
}
