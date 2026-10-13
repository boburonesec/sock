import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";

import { OPERATIONS_AREAS, useAccess } from "@/lib/access/use-access";
import { LoadingScreen } from "@/shared/ui/loading-screen";
import { colors } from "@/shared/styles/theme";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Five role-aware tabs. Each tab owns a nested stack, so a domain can grow to
 * dozens of screens without adding tabs. A tab is hidden (`href: null`) when
 * the user cannot open any area inside it; the screens themselves re-check
 * access because a hidden tab is still reachable by deep link.
 */
export default function ProtectedLayout() {
  const hasLoadedSession = useAuthStore((state) => state.hasLoadedSession);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const access = useAccess();

  if (!hasLoadedSession) {
    return <LoadingScreen label="Sessiya tiklanmoqda" />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  const canOpenOperations = OPERATIONS_AREAS.some((area) => access.area(area).allowed);
  const canOpenSales = access.area("sales").allowed;
  const canOpenFinance = access.area("finance").allowed;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Bosh sahifa",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="home-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="operations"
        options={{
          href: canOpenOperations ? "/(app)/operations" : null,
          title: "Amallar",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="construct-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          href: canOpenSales ? "/(app)/sales" : null,
          title: "Savdo",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="receipt-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          href: canOpenFinance ? "/(app)/finance" : null,
          title: "Moliya",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="card-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "Yana",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="ellipsis-horizontal-circle-outline" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
