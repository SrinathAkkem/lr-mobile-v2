import { useCallback, useEffect, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants/theme";
import { FONTS } from "../../constants/fonts";
import { TAB_BAR_HEIGHT } from "../../constants/layout";
import { useScreenInsets } from "../../hooks/useScreenInsets";
import {
  TabDashboardIcon,
  TabExecutivesIcon,
  TabLrsIcon,
  TabReportsIcon,
} from "../icons";

type TabKey = "dashboard" | "lrs" | "executives" | "reports";

type TabRoute = {
  key: string;
  name: string;
};

type TabLayout = {
  x: number;
  width: number;
};

const ADMIN_TABS: { route: string; label: string; tab: TabKey }[] = [
  { route: "index", label: "Dashboard", tab: "dashboard" },
  { route: "lrs", label: "LRs", tab: "lrs" },
  { route: "executives", label: "Executives", tab: "executives" },
  { route: "reports", label: "Reports", tab: "reports" },
];

const SELECTION_HEIGHT = 50;
const SELECTION_MIN_WIDTH = 88;

function TabIcon({ tab, color }: { tab: TabKey; color: string }) {
  const Icon =
    tab === "dashboard"
      ? TabDashboardIcon
      : tab === "lrs"
        ? TabLrsIcon
        : tab === "executives"
          ? TabExecutivesIcon
          : TabReportsIcon;

  return <Icon size={24} color={color} />;
}

export function AdminTabBar({
  state,
  navigation,
}: {
  state: {
    index: number;
    routes: TabRoute[];
  };
  navigation: {
    emit: (event: {
      type: "tabPress";
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}) {
  const { tabBarBottom } = useScreenInsets({ withTabBar: false });
  const currentRoute = state.routes[state.index];
  const visibleTabs = ADMIN_TABS.filter((tab) =>
    state.routes.some((route) => route.name === tab.route),
  );
  const [tabLayouts, setTabLayouts] = useState<Record<string, TabLayout>>({});

  const activeRoute = visibleTabs.find((tab) => tab.route === currentRoute?.name);
  const activeLayout = activeRoute ? tabLayouts[activeRoute.route] : undefined;

  const onTabLayout = useCallback((route: string, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setTabLayouts((prev) => {
      const existing = prev[route];
      if (existing?.x === x && existing?.width === width) return prev;
      return { ...prev, [route]: { x, width } };
    });
  }, []);

  useEffect(() => {
    setTabLayouts({});
  }, [visibleTabs.length]);

  return (
    <View style={[styles.outer, { bottom: tabBarBottom }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {activeLayout ? (
          <View
            pointerEvents="none"
            style={[
              styles.selectionPill,
              {
                left: activeLayout.x,
                width: Math.max(SELECTION_MIN_WIDTH, activeLayout.width),
              },
            ]}
          />
        ) : null}

        {visibleTabs.map((tab) => {
          const route = state.routes.find((r) => r.name === tab.route);
          if (!route) return null;

          const isFocused = currentRoute?.name === tab.route;
          const iconColor = isFocused ? COLORS.primary : COLORS.black;
          const labelColor = isFocused ? COLORS.primary : COLORS.tabLabel;

          return (
            <Pressable
              key={tab.route}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              android_ripple={{ color: "transparent" }}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              onLayout={(event) => onTabLayout(tab.route, event)}
              style={({ pressed }) => [
                styles.tabPressable,
                pressed && styles.tabPressablePressed,
              ]}
            >
              <View style={styles.tabItem}>
                <TabIcon tab={tab.tab} color={iconColor} />
                <Text style={[styles.tabLabel, { color: labelColor }]}>
                  {tab.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: "absolute",
    left: 25,
    right: 25,
    alignItems: "center",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    height: TAB_BAR_HEIGHT,
    width: "100%",
    borderRadius: 1000,
    backgroundColor: COLORS.tabBarBg,
    borderWidth: 0.5,
    borderColor: COLORS.tabBarBorder,
    paddingHorizontal: 2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.02,
    shadowRadius: 15,
    elevation: 4,
  },
  selectionPill: {
    position: "absolute",
    top: (TAB_BAR_HEIGHT - SELECTION_HEIGHT) / 2,
    height: SELECTION_HEIGHT,
    borderRadius: 100,
    backgroundColor: COLORS.tabActiveBg,
  },
  tabPressable: {
    flex: 1,
    height: TAB_BAR_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  tabPressablePressed: {
    opacity: 0.85,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 7,
    gap: 1,
    minWidth: 68,
  },
  tabLabel: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: -0.1,
    fontFamily: FONTS.semiBold,
    textAlign: "center",
  },
});
