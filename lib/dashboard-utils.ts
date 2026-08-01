import type { DashboardStats, LRRequest } from "../types";
import { COLORS } from "../constants/theme";

export type LRStatusKey = "pending" | "rejected" | "approved" | "delivered";

export const FILTER_STATUSES: LRStatusKey[] = [
  "pending",
  "rejected",
  "approved",
  "delivered",
];

export type LRGroupKey = "today" | "yesterday" | "historical";

export type LRGroup = {
  key: LRGroupKey;
  title: string;
  data: LRRequest[];
};

const STATUS_STYLES = {
  pending: { bg: "rgba(247, 206, 37, 0.20)", text: "#967E1C" },
  rejected: { bg: "rgba(150, 28, 28, 0.10)", text: "#961C1C" },
  approved: { bg: "rgba(52, 199, 89, 0.10)", text: "#0C6B24" },
  delivered: { bg: "#D7ECFF", text: "#2466DE" },
} as const;

const FILTER_CHIP_STYLES = {
  pending: {
    bg: "#FDF5D3",
    text: "#967E1C",
    border: "#967E1C",
  },
  rejected: {
    bg: "#F4E8E8",
    text: "#961C1C",
    border: "#961C1C",
  },
  approved: {
    bg: "#EBF9EE",
    text: "#0C6B24",
    border: "#0C6B24",
  },
  delivered: {
    bg: "#D7ECFF",
    text: "#2466DE",
    border: "#2466DE",
  },
} as const;

export function getAdminStatusStyle(status: string) {
  // Map in_transit to approved for styling
  if (status === "in_transit") return STATUS_STYLES.approved;
  return STATUS_STYLES[status as LRStatusKey] ?? STATUS_STYLES.pending;
}

export function getFilterChipStyle(status: LRStatusKey) {
  return FILTER_CHIP_STYLES[status];
}

export function getDetailStatusStyle(status: string) {
  // Map in_transit to approved for styling
  if (status === "in_transit") {
    const chip = getFilterChipStyle("approved");
    return { bg: chip.bg, text: chip.text };
  }
  if ((FILTER_STATUSES as readonly string[]).includes(status)) {
    const chip = getFilterChipStyle(status as LRStatusKey);
    return { bg: chip.bg, text: chip.text };
  }
  return { bg: COLORS.backgroundSecondary, text: COLORS.black };
}

export function formatStatusLabel(status: string): string {
  // Never show "In_transit" - map to Approved
  if (status === "in_transit") return "Approved";
  // Capitalize first letter
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// Executive status filters derived from theme tokens
export const EXEC_STATUS_FILTERS = FILTER_STATUSES.map((status) => {
  const chip = getFilterChipStyle(status);
  return {
    status,
    label: formatStatusLabel(status),
    color: chip.text,
    bg: chip.bg,
  };
});

export function getExecutiveStatusStyle(status: string) {
  // Map in_transit to approved
  if (status === "in_transit") {
    const chip = getFilterChipStyle("approved");
    return { bg: chip.bg, text: chip.text };
  }
  const match = EXEC_STATUS_FILTERS.find((item) => item.status === status);
  if (match) return { bg: match.bg, text: match.color };
  // Fallback to pending style
  const pending = getFilterChipStyle("pending");
  return { bg: pending.bg, text: pending.text };
}

export function formatStatValue(value: number) {
  return String(value);
}

export function getFirstName(name?: string) {
  return name?.trim().split(/\s+/)[0] ?? "";
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function getCreatedLabel(createdAt: string) {
  const createdDate = new Date(createdAt);
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (createdDate >= today) return "Create Today";

  return `Create on ${createdDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
}

export function getCreatedLabelColor(createdAt: string) {
  const createdDate = new Date(createdAt);
  const today = startOfDay(new Date());
  return createdDate >= today ? "#5E3EA1" : "#999999";
}

export function getRelativeDateLabel(createdAt: string) {
  const createdDate = new Date(createdAt);
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (createdDate >= today) return "Today";
  if (createdDate >= yesterday && createdDate < today) return "Yesterday";
  return createdDate.toISOString().slice(0, 10);
}

export function getRowDateLabel(createdAt: string) {
  const createdDate = new Date(createdAt);
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (createdDate >= today) {
    return createdDate.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  if (createdDate >= yesterday && createdDate < today) {
    return createdDate.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  return createdDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function getGroupKey(createdAt: string): LRGroupKey {
  const createdDate = new Date(createdAt);
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (createdDate >= today) return "today";
  if (createdDate >= yesterday && createdDate < today) return "yesterday";
  return "historical";
}

export function groupLrsByDate(lrs: LRRequest[]): LRGroup[] {
  const buckets: Record<LRGroupKey, LRRequest[]> = {
    today: [],
    yesterday: [],
    historical: [],
  };

  for (const lr of lrs) {
    buckets[getGroupKey(lr.createdAt)].push(lr);
  }

  const groups: LRGroup[] = [];
  if (buckets.today.length) {
    groups.push({ key: "today", title: "Today", data: buckets.today });
  }
  if (buckets.yesterday.length) {
    groups.push({
      key: "yesterday",
      title: "Yesterday",
      data: buckets.yesterday,
    });
  }
  if (buckets.historical.length) {
    groups.push({
      key: "historical",
      title: "Historical",
      data: buckets.historical,
    });
  }
  return groups;
}

export function countByStatus(lrs: LRRequest[]) {
  return FILTER_STATUSES.reduce(
    (acc, status) => {
      if (status === "approved") {
        acc[status] = lrs.filter(
          (lr) => lr.status === "approved" || lr.status === "in_transit",
        ).length;
      } else {
        acc[status] = lrs.filter((lr) => lr.status === status).length;
      }
      return acc;
    },
    {
      pending: 0,
      rejected: 0,
      approved: 0,
      delivered: 0,
    } as Record<LRStatusKey, number>,
  );
}

export function matchesStatusFilter(
  lr: LRRequest,
  activeStatuses: string[],
) {
  if (activeStatuses.length === 0) return true;
  if (
    activeStatuses.includes("approved") &&
    (lr.status === "approved" || lr.status === "in_transit")
  ) {
    return true;
  }
  return activeStatuses.includes(lr.status);
}

export function filterLrsInCurrentMonth(lrs: LRRequest[]) {
  const now = new Date();
  return lrs.filter((lr) => {
    const created = new Date(lr.createdAt);
    return (
      created.getMonth() === now.getMonth() &&
      created.getFullYear() === now.getFullYear()
    );
  });
}

/** Prefer LR-derived stats when API returns empty month-scoped zeros but LRs exist. */
export function resolveDashboardStats(
  apiStats: Partial<DashboardStats> | null | undefined,
  lrs: LRRequest[],
): DashboardStats | null {
  const derived = lrs.length > 0 ? buildStatsFromLrs(lrs) : null;
  if (!derived) {
    if (!apiStats) return null;
    return {
      totalLrs: apiStats.totalLrs ?? 0,
      pending: apiStats.pending ?? 0,
      approved: apiStats.approved ?? 0,
      rejected: apiStats.rejected ?? 0,
      delivered: apiStats.delivered ?? 0,
      inTransit: apiStats.inTransit ?? 0,
      freightTotal: apiStats.freightTotal ?? 0,
      approvalRate: apiStats.approvalRate ?? 0,
    };
  }
  if (!apiStats) return derived;

  const apiEmpty =
    (apiStats.totalLrs ?? 0) === 0 &&
    (apiStats.pending ?? 0) === 0 &&
    (apiStats.approved ?? 0) === 0 &&
    (apiStats.rejected ?? 0) === 0 &&
    (apiStats.delivered ?? 0) === 0 &&
    (apiStats.freightTotal ?? 0) === 0;

  if (apiEmpty) return derived;

  return {
    ...apiStats,
    totalLrs: Math.max(apiStats.totalLrs ?? 0, derived.totalLrs),
    pending: apiStats.pending || derived.pending,
    approved: apiStats.approved || derived.approved,
    rejected: apiStats.rejected || derived.rejected,
    delivered: apiStats.delivered || derived.delivered,
    inTransit: apiStats.inTransit || derived.inTransit,
    freightTotal: apiStats.freightTotal || derived.freightTotal,
    approvalRate: apiStats.approvalRate || derived.approvalRate,
  };
}

export function buildStatsFromLrs(lrs: LRRequest[]): DashboardStats {
  const counts = countByStatus(lrs);
  const inTransit = lrs.filter((lr) => lr.status === "in_transit").length;
  const freightTotal = lrs.reduce((sum, lr) => sum + (lr.freightAmount ?? 0), 0);
  const decided = counts.approved + counts.rejected + counts.delivered;
  const approvalRate =
    decided > 0 ? ((counts.approved + counts.delivered) / decided) * 100 : 0;

  return {
    totalLrs: lrs.length,
    pending: counts.pending,
    approved: counts.approved,
    rejected: counts.rejected,
    delivered: counts.delivered,
    inTransit,
    freightTotal,
    approvalRate,
  };
}

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
