import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  UIManager,
  type FocusEvent,
  type ScrollView,
} from "react-native";

type Options = {
  footerHeight?: number;
  extraPadding?: number;
};

export function useKeyboardAwareScroll(options: Options = {}) {
  const { footerHeight = 80, extraPadding = 32 } = options;
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const contentPaddingBottom =
    keyboardHeight > 0
      ? keyboardHeight + footerHeight + extraPadding
      : footerHeight + extraPadding;

  const handleScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
  }, []);

  // Scrolls only enough so the *currently focused* field clears the
  // keyboard, instead of always jumping to the end of the form — jumping to
  // the end pushed top-of-form fields completely off-screen when the
  // keyboard opened.
  const onInputFocus = useCallback(
    (event: FocusEvent) => {
      const nodeHandle = event.target;

      setTimeout(
        () => {
          if (!scrollRef.current) return;

          if (typeof nodeHandle !== "number") {
            scrollRef.current.scrollToEnd({ animated: true });
            return;
          }

          UIManager.measureInWindow(nodeHandle, (_x, y, _width, height) => {
            const screenHeight = Dimensions.get("window").height;
            const visibleBottom = screenHeight - keyboardHeight - footerHeight - extraPadding;
            const visibleTop = 60; // rough header/status-bar allowance

            let delta = 0;
            const fieldBottom = y + height;
            if (fieldBottom > visibleBottom) {
              delta = fieldBottom - visibleBottom;
            } else if (y < visibleTop) {
              delta = y - visibleTop;
            }

            if (delta !== 0) {
              const nextOffset = Math.max(0, scrollOffsetRef.current + delta);
              scrollRef.current?.scrollTo({ y: nextOffset, animated: true });
            }
          });
        },
        Platform.OS === "ios" ? 300 : 120
      );
    },
    [keyboardHeight, footerHeight, extraPadding]
  );

  const scrollToFocusedField = useCallback(() => {
    if (keyboardHeight <= 0) return;
    setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      Platform.OS === "ios" ? 80 : 120
    );
  }, [keyboardHeight]);

  return {
    scrollRef,
    keyboardHeight,
    contentPaddingBottom,
    onInputFocus,
    scrollToFocusedField,
    onScroll: handleScroll,
    scrollEventThrottle: 32,
  };
}
