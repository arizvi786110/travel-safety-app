import { supabase } from "@/lib/auth/supabaseClient";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";

const PUBLIC_ROUTES = ["terms", "privacy-policy"];

export default function RootLayout() {
  const [session, setSession] = useState<any>(undefined);
  const router = useRouter();
  const segments = useSegments();

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
    const onPublicRoute = !!first && PUBLIC_ROUTES.includes(first);

    if (!session && !inAuthGroup && !onPublicRoute) {
      router.replace("/sign-in");
    } else if (session && inAuthGroup) {
      router.replace("/");
    }
  }, [session, segments]);

  if (session === undefined) {
    return null;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen
        name="location"
        options={{ title: "Check a Destination" }}
      />
      <Stack.Screen
        name="flight-planner"
        options={{ title: "Flight Planner" }}
      />
      <Stack.Screen name="My-itinerary" options={{ title: "Plan Your Trip" }} />
      <Stack.Screen
        name="user-saved-itineraries"
        options={{ title: "Saved Itineraries" }}
      />
      <Stack.Screen name="userSettings" options={{ title: "Settings" }} />
      <Stack.Screen name="chatbot" options={{ title: "Assistant" }} />
      <Stack.Screen name="terms" options={{ title: "Terms & Conditions" }} />
      <Stack.Screen
        name="privacy-policy"
        options={{ title: "Privacy Policy" }}
      />
    </Stack>
  );
}
