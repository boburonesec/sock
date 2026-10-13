import { usePathname, useRouter } from "expo-router";
import { createContext, Fragment, useContext, useEffect, useRef, type ReactNode } from "react";
import { useSessionContext } from "@/lib/auth/use-session-context";
import { routes } from "@/lib/routes";

const ContextReady = createContext(true);
export const useOperationalContextReady = () => useContext(ContextReady);

/** A key resets every descendant draft, modal, confirmation and local retry key. */
export function ContextResetBoundary({ contextKey, children }: { contextKey: number; children: ReactNode }) {
  return <Fragment key={contextKey}>{children}</Fragment>;
}

/** Keep navigation mounted; block operational children until old route params are gone. */
export function SessionContextBoundary({ children }: { children: ReactNode }) {
  const context = useSessionContext();
  const router = useRouter();
  const pathname = usePathname();
  const accepted = useRef(context.revision);
  const changed = accepted.current !== context.revision;
  const ready = !changed || pathname === "/home";
  useEffect(() => {
    if (!changed) return;
    if (pathname === "/home") accepted.current = context.revision;
    else router.replace(routes.home);
  }, [changed, context.revision, pathname, router]);

  return (
    <ContextReady.Provider value={ready}>
      <ContextResetBoundary contextKey={context.revision}>{children}</ContextResetBoundary>
    </ContextReady.Provider>
  );
}
