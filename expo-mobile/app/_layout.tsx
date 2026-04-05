import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen after app loads
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor="#006028" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
          contentStyle: { backgroundColor: "#006028" },
        }}
      >
        <Stack.Screen name="index" />
      </Stack>
    </>
  );
}
