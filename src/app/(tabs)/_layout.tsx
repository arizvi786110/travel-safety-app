import { colors } from "@/theme";
import {
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
} from "@expo-google-fonts/cormorant-garamond";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(active: IconName, inactive: IconName) {
  return ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

export default function TabsLayout() {
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.background },
          tabBarActiveTintColor: colors.accentSoft,
          tabBarInactiveTintColor: colors.textFaint,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.glassBorder,
          },
          tabBarLabelStyle: { fontSize: 11 },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("home", "home-outline") }} />
        <Tabs.Screen name="explore" options={{ title: "Explore", tabBarIcon: tabIcon("compass", "compass-outline") }} />
        <Tabs.Screen name="favourites" options={{ title: "Favourites", tabBarIcon: tabIcon("heart", "heart-outline") }} />
        <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon("person", "person-outline") }} />
      </Tabs>
    </>
  );
}