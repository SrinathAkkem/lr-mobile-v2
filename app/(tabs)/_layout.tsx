import { Tabs, useSegments } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../lib/auth";
import { AdminTabBar } from "../../components/dashboard/AdminTabBar";
import { ExecutiveTabBar } from "../../components/dashboard/ExecutiveTabBar";

const HIDDEN_TAB_BAR_SEGMENTS = new Set([
  "add",
  "notifications",
  "profile",
  "company",
  "edit",
]);

const hiddenTabOptions = {
  href: null,
};

function useHideTabBar() {
  const segments = useSegments();
  return segments.some((segment) => HIDDEN_TAB_BAR_SEGMENTS.has(segment));
}

export default function TabLayout() {
  const { user, loading } = useAuth();
  const isExecutive = user?.role === "executive";
  const hideTabBar = useHideTabBar();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Tabs
      tabBar={(props) => {
        if (hideTabBar) return null;
        return isExecutive ? (
          <ExecutiveTabBar {...props} />
        ) : (
          <AdminTabBar {...props} />
        );
      }}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: () => null,
        }}
      />

      <Tabs.Screen
        name="lrs"
        options={{
          title: "LRs",
          tabBarIcon: () => null,
        }}
      />

      <Tabs.Screen
        name="executives"
        options={{
          title: "Executives",
          href: isExecutive ? null : undefined,
          tabBarIcon: () => null,
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          href: isExecutive ? null : undefined,
          tabBarIcon: () => null,
        }}
      />

      <Tabs.Screen name="lrs/create" options={hiddenTabOptions} />
      <Tabs.Screen name="lrs/[id]" options={hiddenTabOptions} />
      <Tabs.Screen name="executives/add" options={hiddenTabOptions} />
      <Tabs.Screen name="address-book" options={hiddenTabOptions} />
      <Tabs.Screen name="notifications" options={hiddenTabOptions} />
      <Tabs.Screen name="profile" options={hiddenTabOptions} />
      <Tabs.Screen name="profile/company" options={hiddenTabOptions} />
      <Tabs.Screen name="profile/edit" options={hiddenTabOptions} />
    </Tabs>
  );
}
