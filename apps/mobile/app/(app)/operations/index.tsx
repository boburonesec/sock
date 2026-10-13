import { TENANT_AREAS } from "@paypoq/shared";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { OPERATIONS_AREAS, useAccess } from "@/lib/access/use-access";
import { areaRoutes } from "@/lib/routes";
import { AccessDenied } from "@/shared/ui/feedback";
import { ActionTile } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";

type OperationsArea = "production" | "machines" | "mechanic" | "warehouse";

const tiles: Record<OperationsArea, { subtitle: string; icon: keyof typeof Ionicons.glyphMap }> = {
  production: {
    subtitle: "Bosqichlar oqimi, o'tkazish, brak, smena yakuni",
    icon: "git-network-outline",
  },
  machines: {
    subtitle: "Stanok ishini boshlash va chiqqan mahsulotni qabul qilish",
    icon: "cog-outline",
  },
  mechanic: {
    subtitle: "Rejadagi o'lchovlar va texnik vazifalar",
    icon: "build-outline",
  },
  warehouse: {
    subtitle: "Qoldiqlar, material kirimi, tuzatish va harakatlar",
    icon: "cube-outline",
  },
};

export default function OperationsHubScreen() {
  const router = useRouter();
  const access = useAccess();
  const visibleAreas = (OPERATIONS_AREAS as readonly OperationsArea[]).filter(
    (area) => access.area(area).allowed,
  );

  return (
    <Screen subtitle="Ishlab chiqarish va ombor amallari." title="Amallar">
      {visibleAreas.length === 0 ? (
        <AccessDenied reason="Sizning rolingizga operatsion bo'lim biriktirilmagan." />
      ) : null}

      {visibleAreas.map((area) => (
        <ActionTile
          icon={tiles[area].icon}
          key={area}
          onPress={() => router.push(areaRoutes[area])}
          subtitle={tiles[area].subtitle}
          title={TENANT_AREAS[area].label}
        />
      ))}
    </Screen>
  );
}
