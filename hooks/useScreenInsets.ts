import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getContentBottomPadding,
  getTabBarBottom,
} from "../constants/layout";

type ScreenInsetsOptions = {
  /** Reserve space for the floating tab bar. Default true. */
  withTabBar?: boolean;
};

export function useScreenInsets(options?: ScreenInsetsOptions) {
  const insets = useSafeAreaInsets();
  const withTabBar = options?.withTabBar ?? true;

  return {
    top: insets.top,
    bottom: insets.bottom,
    left: insets.left,
    right: insets.right,
    tabBarBottom: getTabBarBottom(insets),
    contentBottom: getContentBottomPadding(insets, withTabBar),
  };
}

export function useContentBottomPadding(withTabBar = true) {
  const { contentBottom } = useScreenInsets({ withTabBar });
  return contentBottom;
}
