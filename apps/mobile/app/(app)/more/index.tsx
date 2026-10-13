import { useRouter } from "expo-router";

import { isApiError } from "@/lib/api/errors";
import { useEmployeeMeQuery } from "@/lib/api/mobile-employee";
import { routes } from "@/lib/routes";
import { ActionTile, Section } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";

export default function MoreScreen() {
  const router = useRouter();
  const meQuery = useEmployeeMeQuery();
  // Owners/managers without an employee profile have no personal payroll data.
  const hasEmployeeProfile = Boolean(meQuery.data) && !isApiError(meQuery.error, 403);

  return (
    <Screen
      onRefresh={() => void meQuery.refetch()}
      refreshing={meQuery.isRefetching}
      subtitle="Profil va shaxsiy ma'lumotlar."
      title="Yana"
    >
      <Section title="Akkaunt">
        <ActionTile
          icon="person-outline"
          onPress={() => router.push(routes.profile)}
          subtitle="Ma'lumotlar va tizimdan chiqish"
          title="Profil"
        />
      </Section>

      {hasEmployeeProfile ? (
        <Section title="Shaxsiy">
          <ActionTile
            icon="wallet-outline"
            onPress={() => router.push(routes.payroll)}
            subtitle="Oylik hisob-kitoblari"
            title="Oylik"
          />
          <ActionTile
            icon="list-outline"
            onPress={() => router.push(routes.activities)}
            subtitle="So'nggi faoliyatlar"
            title="Ishlar"
          />
          <ActionTile
            icon="cash-outline"
            onPress={() => router.push(routes.advances)}
            subtitle="Avans tarixi"
            title="Avanslar"
          />
        </Section>
      ) : null}
    </Screen>
  );
}
