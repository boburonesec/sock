"use client";

import { PlatformAdminGate } from "@/components/platform-admin/platform-admin-gate";
import { PlatformAdminShell } from "@/components/platform-admin/platform-admin-shell";
import { GuideModule } from "@/features/guide/guide-module";

export default function PlatformAdminGuidePage() {
  return (
    <PlatformAdminGate>
      <PlatformAdminShell>
        <GuideModule />
      </PlatformAdminShell>
    </PlatformAdminGate>
  );
}
