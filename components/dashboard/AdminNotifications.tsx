import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { COLORS, SPACING } from "../../constants/theme";
import { FONTS } from "../../constants/fonts";
import { api } from "../../lib/api";
import type { Notification } from "../../types";
import { useContentBottomPadding } from "../../hooks/useScreenInsets";
import { ChevronBackIcon, NotificationIcon } from "../icons";

function formatNotificationTime(date: Date) {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const hour12 = hours % 12 || 12;
  const period = hours < 12 ? "a.m." : "p.m.";
  return `${hour12}:${minutes} ${period}`;
}

function getDateLabel(date: Date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const createdDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (today.getTime() - createdDay.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function NotificationItem({
  notification,
  onPress,
}: {
  notification: Notification;
  onPress: () => void;
}) {
  const isNew = !notification.read;
  const createdDate = new Date(notification.createdAt);
  const dateLabel = getDateLabel(createdDate);
  const timeText = `${formatNotificationTime(createdDate)} ${dateLabel}`;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.notificationItem,
        isNew ? styles.notificationItemNew : styles.notificationItemRead,
      ]}
    >
      <View style={styles.notificationContent}>
        <View
          style={[
            styles.iconContainer,
            isNew ? styles.iconContainerNew : styles.iconContainerRead,
          ]}
        >
          <NotificationIcon size={18} color={COLORS.black} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          <Text style={styles.notificationTime}>{timeText}</Text>
        </View>
      </View>
      {isNew ? <View style={styles.newDot} /> : null}
    </Pressable>
  );
}

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const contentBottom = useContentBottomPadding();

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    const response = await api.getNotifications();
    if (response.success && response.data) {
      setNotifications(response.data);
    } else if (response.error) {
      Alert.alert("Error", response.error);
    }
    setLoading(false);
    setRefreshing(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadNotifications();
  }

  async function handleNotificationPress(notification: Notification) {
    if (!notification.read) {
      const response = await api.markNotificationRead(notification.id);
      if (response.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
        );
      }
    }

    if (notification.lrId) {
      router.push(`/(tabs)/lrs/${notification.lrId}` as any);
    }
  }

  const groupedNotifications = notifications.reduce(
    (acc, notification) => {
      const date = new Date(notification.createdAt);
      const key = getDateLabel(date);

      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(notification);
      return acc;
    },
    {} as Record<string, Notification[]>,
  );

  const groupOrder = Object.keys(groupedNotifications).sort((a, b) => {
    const priority = (label: string) => {
      if (label === "Today") return 0;
      if (label === "Yesterday") return 1;
      return 2;
    };
    const diff = priority(a) - priority(b);
    if (diff !== 0) return diff;
    return (
      new Date(groupedNotifications[b][0].createdAt).getTime() -
      new Date(groupedNotifications[a][0].createdAt).getTime()
    );
  });

  const newCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronBackIcon size={24} color={COLORS.black} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        {newCount > 0 ? (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>{newCount} New</Text>
          </View>
        ) : (
          <View style={styles.badgePlaceholder} />
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: contentBottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No notifications yet</Text>
          </View>
        ) : (
          groupOrder.map((date) => (
            <View key={date} style={styles.section}>
              {date !== "Today" ? (
                <Text style={styles.dateHeader}>{date}</Text>
              ) : null}
              {groupedNotifications[date].map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onPress={() => handleNotificationPress(notification)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.black,
    textAlign: "center",
  },
  newBadge: {
    backgroundColor: COLORS.approved,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 6,
    minWidth: 64,
    alignItems: "center",
  },
  newBadgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.success,
  },
  badgePlaceholder: {
    width: 64,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    gap: 18,
  },
  section: {
    gap: 12,
  },
  dateHeader: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.black,
    marginBottom: 4,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    minHeight: 72,
  },
  notificationItemNew: {
    backgroundColor: "rgba(94, 62, 161, 0.10)",
  },
  notificationItemRead: {
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  notificationContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconContainer: {
    padding: 12,
    borderRadius: 8,
  },
  iconContainerNew: {
    backgroundColor: COLORS.white,
  },
  iconContainerRead: {
    backgroundColor: COLORS.backgroundSecondary,
  },
  textContainer: {
    flex: 1,
    gap: 14,
  },
  notificationTitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.black,
  },
  notificationTime: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.primary,
  },
  newDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
  },
});
