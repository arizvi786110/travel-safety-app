import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const SERIF = "CormorantGaramond_600SemiBold";

export default function ErrorScreen({
  icon = "alert-circle-outline",
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={s.root}>
      <LinearGradient colors={["#2a1f27", "#17151a"]} style={StyleSheet.absoluteFill} />
      <View style={s.iconWrap}>
        <Ionicons name={icon} size={34} color="#e8c9d2" />
      </View>
      <Text style={s.title}>{title}</Text>
      <Text style={s.message}>{message}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity style={s.btn} onPress={onAction}>
          <Text style={s.btnText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// Small version for a section that failed to load
export function InlineError({
  message = "Couldn't load this. Check your connection and try again.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={s.inline}>
      <Ionicons name="cloud-offline-outline" size={26} color="#e8c9d2" />
      <Text style={s.inlineText}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity style={s.inlineBtn} onPress={onRetry}>
          <Text style={s.inlineBtnText}>Try again</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#17151a", alignItems: "center", justifyContent: "center", padding: 32 },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)",
    marginBottom: 18,
  },
  title: { color: "#fff", fontSize: 36, fontFamily: SERIF, textAlign: "center" },
  message: { color: "rgba(255,255,255,0.65)", textAlign: "center", lineHeight: 22, marginTop: 8, marginBottom: 24 },
  btn: { backgroundColor: "#e8c9d2", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  btnText: { color: "#2a1d24", fontWeight: "700", fontSize: 16 },
  inline: {
    alignItems: "center", gap: 10, padding: 24, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  inlineText: { color: "rgba(255,255,255,0.7)", textAlign: "center", lineHeight: 20 },
  inlineBtn: { borderRadius: 12, borderWidth: 1, borderColor: "rgba(232,201,210,0.5)", paddingVertical: 8, paddingHorizontal: 18 },
  inlineBtnText: { color: "#e8c9d2", fontWeight: "600" },
});