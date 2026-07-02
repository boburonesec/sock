import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";

import { LoadingScreen } from "@/shared/ui/loading-screen";
import { colors } from "@/shared/styles/theme";
import { useAuthStore } from "@/stores/auth-store";

const managerPermissionKeys = [
  "dashboard.view",
  "production.view",
  "warehouse.view",
  "sales.view",
  "finance.view",
];

export default function ProtectedLayout() {
  const hasLoadedSession = useAuthStore((state) => state.hasLoadedSession);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const permissions = useAuthStore((state) => state.permissions);
  const canOpenManagerTab = managerPermissionKeys.some((permission) =>
    permissions.includes(permission),
  );

  if (!hasLoadedSession) {
    return <LoadingScreen label="Sessiya tiklanmoqda" />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

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
        name="activities"
        options={{
          title: "Ishlar",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="list-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="payroll"
        options={{
          title: "Oylik",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="wallet-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="manager"
        options={{
          href: canOpenManagerTab ? "/(app)/manager" : null,
          title: "Manager",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="speedometer-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="person-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="advances"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen name="manager-executive" options={{ href: null }} />
      <Tabs.Screen name="manager-production" options={{ href: null }} />
      <Tabs.Screen name="manager-warehouse" options={{ href: null }} />
      <Tabs.Screen name="manager-sales" options={{ href: null }} />
      <Tabs.Screen name="manager-finance" options={{ href: null }} />
    </Tabs>
  );
}
