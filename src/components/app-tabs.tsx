import { Tabs } from "expo-router";

export default function AppTabs() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
    </Tabs>
  );
}