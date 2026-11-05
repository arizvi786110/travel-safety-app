import { Ionicons } from "@expo/vector-icons";
import { useNetInfo } from "@react-native-community/netinfo";
import { StyleSheet, Text, View } from "react-native";

export default function OfflineBanner() {
  const { isConnected, isInternetReachable } = useNetInfo();
  const offline = isConnected === false || isInternetReachable === false;
  if (!offline) return null;

  return (
    <View style={s.banner} pointerEvents="none">
      <Ionicons name="cloud-offline-outline" size={16} color="#2a1d24" />
      <Text style={s.text}>You're offline. Some features won't work.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 100,
    paddingTop: 52, paddingBottom: 10, paddingHorizontal: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#e8c9d2",
  },
  text: { color: "#2a1d24", fontWeight: "600", fontSize: 13 },
});