import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  ImageBackground, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View,
} from "react-native";

const SERIF = "CormorantGaramond_600SemiBold";

export function AuthShell({
  image, title, subtitle, children, footer,
}: {
  image: any; title: string; subtitle?: string;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <ImageBackground source={image} style={s.bg} resizeMode="cover">
      <LinearGradient
        colors={["rgba(23,21,26,0.35)", "rgba(23,21,26,0.85)", "#17151a"]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.brand}>
            <Ionicons name="location" size={22} color="#e8c9d2" />
            <Text style={s.brandText}>SafePath</Text>
          </View>
          <View style={s.card}>
            <Text style={s.title}>{title}</Text>
            {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
            <View style={{ marginTop: 18 }}>{children}</View>
          </View>
          {footer ? <View style={s.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

export function AuthInput({
  icon, secure, ...props
}: TextInputProps & { icon: keyof typeof Ionicons.glyphMap; secure?: boolean }) {
  const [hidden, setHidden] = useState(!!secure);
  return (
    <View style={s.inputWrap}>
      <Ionicons name={icon} size={18} color="rgba(255,255,255,0.55)" />
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? props.placeholder}
        secureTextEntry={hidden}
        placeholderTextColor="rgba(255,255,255,0.4)"
        style={s.input}
        autoCapitalize="none"
      />

      {secure ? (
        <TouchableOpacity onPress={() => setHidden((h) => !h)} 
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={hidden ? "Show password" : "Hide password"}>
          <Ionicons
            name={hidden ? "eye-outline" : "eye-off-outline"}
            size={18}
            color="rgba(255,255,255,0.55)"
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function AuthButton({
  label, onPress, loading, secondary,
}: { label: string; onPress: () => void; loading?: boolean; secondary?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      style={[s.btn, secondary && s.btnSecondary, loading && { opacity: 0.6 }]}
      accessibilityRole="button" accessibilityState={{ disabled: !!loading, busy: !!loading }}
    >
      <Text style={[s.btnText, secondary && { color: "#fff" }]}>
        {loading ? "Please wait…" : label}
      </Text>
    </TouchableOpacity>
  );
}

export function AuthError({ message }: { message: string }) {
  return message ? <Text style={s.error}>{message}</Text> : null;
}

export const authLink = { color: "#e8c9d2", fontWeight: "600" as const };
export const authMuted = { color: "rgba(255,255,255,0.6)" };

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#17151a" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 20, paddingTop: 70 },
  brand: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 24 },
  brandText: { color: "#fff", fontSize: 26, fontFamily: SERIF },
  card: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
    borderWidth: 1, borderRadius: 24, padding: 22,
  },
  title: { color: "#fff", fontSize: 34, fontFamily: SERIF },
  subtitle: { color: "rgba(255,255,255,0.65)", marginTop: 6, lineHeight: 20 },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.12)", borderWidth: 1,
    borderRadius: 14, paddingHorizontal: 14, marginBottom: 12,
  },
  input: { flex: 1, color: "#fff", paddingVertical: 14, fontSize: 16 },
  btn: { backgroundColor: "#e8c9d2", borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 6 },
  btnSecondary: { backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  btnText: { color: "#2a1d24", fontWeight: "700", fontSize: 16 },
  error: { color: "#fca5a5", marginBottom: 8 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20, gap: 6, flexWrap: "wrap" },
});