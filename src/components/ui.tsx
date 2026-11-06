import { colors, fonts, radius, spacing } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Heading({
  children,
  size = 28,
  style,
}: {
  children: ReactNode;
  size?: number;
  style?: TextStyle;
}) {
  return (
    <Text style={[{ fontFamily: fonts.heading, fontSize: size, color: colors.text }, style]}>
      {children}
    </Text>
  );
}

export function Body({
  children,
  muted,
  style,
}: {
  children: ReactNode;
  muted?: boolean;
  style?: TextStyle;
}) {
  return (
    <Text style={[{ fontSize: 15, color: muted ? colors.textMuted : colors.text }, style]}>
      {children}
    </Text>
  );
}

export function GlassCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.glass, style]}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const inactive = loading || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={[styles.button, inactive && { opacity: 0.5 }, style]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <>
          <Text style={styles.buttonText}>{label}</Text>
          {icon ? <Ionicons name={icon} size={18} color={colors.text} /> : null}
        </>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function ScreenHeader({ right, onBack }: { right?: ReactNode; onBack?: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <Pressable onPress={onBack ?? (() => router.back())} hitSlop={12}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Pressable>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

export function HeroImage({
  source,
  height = 260,
  children,
  style,
}: {
  source: ImageSourcePropType;
  height?: number;
  children?: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <ImageBackground source={source} style={[{ height, overflow: "hidden" }, style]} resizeMode="cover">
      <LinearGradient
        colors={[colors.overlayTop, colors.overlayBottom]}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  glass: {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  buttonText: { color: colors.text, fontSize: 16, fontWeight: "600" },
  chip: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textMuted, fontSize: 14 },
  chipTextSelected: { color: colors.text, fontWeight: "600" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: spacing.md },
});