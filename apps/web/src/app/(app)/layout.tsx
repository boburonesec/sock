import { AuthGate } from "@/components/auth/auth-gate";
import { PermissionGate } from "@/components/auth/permission-gate";
import { AppShell } from "@/components/layout/app-shell";

export default function ApplicationLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppShell>
        <PermissionGate>{children}</PermissionGate>
      </AppShell>
    </AuthGate>
  );
}
