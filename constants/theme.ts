export const COLORS = {
  // Primary
  primary: "#5E3EA1",
  primaryLight: "#7C3AED",
  primaryDark: "#4C1D95",
  primaryGradientStart: "#8B359E",
  primaryGradientEnd: "#5E3EA1",

  // Backgrounds
  background: "#FFFFFF",
  backgroundSecondary: "#F5F5F7",
  backgroundCard: "#FFFFFF",

  // Text
  text: "#1E1E1E",
  textSecondary: "#4D4D4D",
  textMuted: "#64748B",
  textDark: "#141414",

  // Status Colors
  success: "#0C6B24",
  warning: "#967E1C",
  error: "#961C1C",
  info: "#2466DE",

  // Status Badge Colors
  pending: "rgba(247, 206, 37, 0.20)",
  pendingText: "#967E1C",
  approved: "rgba(52, 199, 89, 0.10)",
  approvedText: "#0C6B24",
  rejected: "rgba(150, 28, 28, 0.10)",
  rejectedText: "#961C1C",
  delivered: "#D7ECFF",
  deliveredText: "#2466DE",

  // Filter chip backgrounds
  chipPendingBg: "#FDF5D3",
  chipRejectedBg: "#F4E8E8",
  chipApprovedBg: "#EBF9EE",
  chipDeliveredBg: "#D7ECFF",

  // UI Elements
  border: "#E2E8F0",
  borderMuted: "#929292",
  divider: "rgba(0, 0, 0, 0.10)",
  shadow: "rgba(0, 0, 0, 0.1)",
  headerAvatarBg: "rgba(255, 255, 255, 0.10)",
  statCardBg: "rgba(255, 255, 255, 0.07)",
  statIconBorder: "rgba(255, 255, 255, 0.12)",

  // Tab bar — frosted white pill (admin dashboard)
  tabBarBg: "rgba(255, 255, 255, 0.94)",
  tabBarBorder: "#E8E8E8",
  tabActiveBg: "#EDEDED",
  tabLabel: "#1A1A1A",

  // Button
  buttonPrimary: "#000000",
  buttonSecondary: "#F5F5F7",
  buttonText: "#FFFFFF",
  accentRed: "#FF383C",
  modalBg: "#F4F5F7",

  // Others
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  huge: 32,
} as const;

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;
