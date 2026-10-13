import { useSyncExternalStore } from "react";
import { getRequestContext, subscribeRequestContext } from "@/lib/auth/request-context";

export function useSessionContext() {
  return useSyncExternalStore(subscribeRequestContext, getRequestContext, getRequestContext);
}
