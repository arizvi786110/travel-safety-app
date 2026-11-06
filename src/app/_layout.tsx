import { supabase } from "@/lib/auth/supabaseClient";
import {
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
} from "@expo-google-fonts/cormorant-garamond";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import ErrorScreen from "@/components/ErrorScreen";
import type { ErrorBoundaryProps } from "expo-router";
import OfflineBanner from "@/components/OfflineBanner";
import { View } from "react-native";

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <ErrorScreen
      title="Something went wrong"
      message="The app hit an unexpected problem. Try again, and if it keeps happening, restart the app."
      actionLabel="Try again"
      onAction={retry}
    />
  );
}
// Screens a signed-out user can open (sign-up links to terms and privacy)
const PUBLIC_ROUTES = ["terms", "privacy-policy", "reset-password"];

export default function RootLayout() {
  const [session, setSession] = useState<any>(undefined);
  const router = useRouter();
  const segments = useSegments();

  // Loaded here so the sign-in screens can use the serif font before the tabs ever mount
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session === undefined) return;

    const first = segments[0] as string | undefined;
    const inAuthGroup = first === "(auth)";
    const inPublicRoute = !!first && PUBLIC_ROUTES.includes(first);

    if (!session && !inAuthGroup && !inPublicRoute) {
      router.replace("/welcome");
    } else if (session && inAuthGroup) {
      router.replace("/");
    }
  }, [session, segments]);

  if (session === undefined || (!fontsLoaded && !fontError)) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#17151a", alignItems: "center" }}>
      {/* On wide screens the app sits in a phone-width column. overflow hidden keeps
          full-bleed images from spilling outside it. */}
      <View style={{ flex: 1, width: "100%", maxWidth: 560, overflow: "hidden" }}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="flight-planner" options={{ headerShown: false }} />
          <Stack.Screen name="chatbot" options={{ headerShown: false }} />
          <Stack.Screen name="user-saved-itineraries" options={{ headerShown: false }} />
          <Stack.Screen name="terms" options={{ headerShown: false }} />
          <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
          <Stack.Screen name="reset-password" options={{ headerShown: false }} />
          <Stack.Screen name="My-itinerary" options={{ headerShown: false }} />
        </Stack>
        <OfflineBanner />
      </View>
    </View>
  );
}