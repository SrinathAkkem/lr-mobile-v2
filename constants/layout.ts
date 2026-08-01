import type { EdgeInsets } from "react-native-safe-area-context";

/** Floating tab bar height (matches `(tabs)/_layout.tsx`). */
export const TAB_BAR_HEIGHT = 62;

/** Space between the bottom safe area and the tab bar. */
export const TAB_BAR_BOTTOM_GAP = 16;

/** Space between scroll content and the top of the tab bar. */
export const CONTENT_TAB_GAP = 32;

/** Minimum bottom padding when the tab bar is hidden. */
export const CONTENT_BOTTOM_MIN = 16;

export function getTabBarBottom(insets: Pick<EdgeInsets, "bottom">) {
  return insets.bottom + TAB_BAR_BOTTOM_GAP;
}

export function getContentBottomPadding(
  insets: Pick<EdgeInsets, "bottom">,
  withTabBar = true,
) {
  if (!withTabBar) {
    return Math.max(insets.bottom, CONTENT_BOTTOM_MIN);
  }
  return getTabBarBottom(insets) + TAB_BAR_HEIGHT + CONTENT_TAB_GAP;
}
