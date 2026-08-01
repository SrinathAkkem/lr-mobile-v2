import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ChevronBackLargeIcon } from "../../components/icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { markOnboardingCompleted } from "../../lib/onboarding";
import { FONTS } from "../../constants/fonts";

const { width } = Dimensions.get("window");

const slides = [
  {
    id: 1,
    title: "Paperless Lorry\nReceipts",
    description:
      "Fast, accurate, and paperless documentation for every shipment.",
    image: require("../../assets/images/onboarding1.png"),
  },
  {
    id: 2,
    title: "Connected Drivers & Operations",
    description:
      "Keep transport teams updated with live shipment information and approvals.",
    image: require("../../assets/images/onboarding2.png"),
  },
  {
    id: 3,
    title: "Track Every Delivery",
    description:
      "From dispatch to proof of delivery, manage every detail with confidence.",
    image: require("../../assets/images/onboarding3.png"),
  },
];

function LandingGlow() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="landingGlow" cx="0%" cy="0%" rx="70%" ry="45%">
          <Stop offset="0%" stopColor="#B8E4FF" stopOpacity={0.55} />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="55%" fill="url(#landingGlow)" />
    </Svg>
  );
}

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useSharedValue(0);

  const slideAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          scrollX.value,
          [0, width, width * 2],
          [0, -width, -width * 2]
        ),
      },
    ],
  }));

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollX.value = withSpring(nextIndex * width);
      return;
    }

    markOnboardingCompleted();
    router.replace("/(auth)/login");
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      scrollX.value = withSpring(prevIndex * width);
    }
  };

  const handleSkip = () => {
    markOnboardingCompleted();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <LandingGlow />

      {currentIndex > 0 && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronBackLargeIcon size={28} color="#000000" />
        </TouchableOpacity>
      )}

      <Animated.View style={[styles.slideContainer, slideAnimatedStyle]}>
        {slides.map((slide) => (
          <View key={slide.id} style={styles.slide}>
            <View style={styles.imageContainer}>
              <Image
                source={slide.image}
                style={styles.image}
                resizeMode="contain"
              />
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.description}>{slide.description}</Text>
            </View>
          </View>
        ))}
      </Animated.View>

      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>

        {currentIndex < slides.length - 1 && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  landingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  slideContainer: {
    flex: 1,
    flexDirection: "row",
  },
  slide: {
    width,
    paddingHorizontal: 32,
    justifyContent: "center",
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  image: {
    width: width - 64,
    height: 300,
  },
  textContainer: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 34,
    color: "#000000",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: "#666666",
    textAlign: "center",
    lineHeight: 22,
  },
  bottomSection: {
    paddingHorizontal: 32,
    paddingBottom: 16,
    alignItems: "center",
  },
  nextButton: {
    width: width - 64,
    height: 56,
    backgroundColor: "#000000",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonText: {
    fontFamily: FONTS.semiBold,
    color: "#FFFFFF",
    fontSize: 17,
  },
  skipButton: {
    marginTop: 20,
    paddingVertical: 8,
  },
  skipText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: "#666666",
  },
});
