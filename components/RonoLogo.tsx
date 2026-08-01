import { Image, StyleSheet, View } from "react-native";

const LOGO_ASPECT = 169 / 44;

type RonoLogoProps = {
  height?: number;
};

export function RonoLogo({ height = 36 }: RonoLogoProps) {
  return (
    <View style={styles.logo}>
      <Image
        source={require("../assets/images/rono_logo.png")}
        style={{ height, width: height * LOGO_ASPECT }}
        resizeMode="contain"
        accessibilityLabel="Rono logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    alignItems: "center",
    justifyContent: "center",
  },
});
