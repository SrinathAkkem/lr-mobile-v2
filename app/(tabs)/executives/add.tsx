import { useEffect } from "react";
import { router } from "expo-router";

export default function AddExecutiveRedirect() {
  useEffect(() => {
    router.replace("/(tabs)/executives?invite=1");
  }, []);

  return null;
}
