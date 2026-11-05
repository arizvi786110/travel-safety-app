import { Body, GlassCard, Heading, HeroImage } from "@/components/ui";
import { heroImages, themeImages, type ThemeName } from "@/lib/images";
import { colors, fonts, radius, spacing } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { type Href, useRouter } from "expo-router";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IconName = keyof typeof Ionicons.glyphMap;

const QUICK_ACTIONS: { label: string; icon: IconName; route: Href }[] = [
  { label: "Check a Destination", icon: "location-outline", route: "/explore" },
  {
    label: "Flight Planner",
    icon: "airplane-outline",
    route: "/flight-planner",
  },
  { label: "Chatbot", icon: "chatbubble-ellipses-outline", route: "/chatbot" },
  {
    label: "Itineraries",
    icon: "calendar-outline",
    route: "/user-saved-itineraries",
  },
];

const POPULAR: { city: string; country: string; theme: ThemeName }[] = [
  { city: "Istanbul", country: "Türkiye", theme: "historic" },
  { city: "Dubai", country: "UAE", theme: "city" },
  { city: "Cairo", country: "Egypt", theme: "desert" },
  { city: "Phuket", country: "Thailand", theme: "beach" },
];

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      showsVerticalScrollIndicator={false}
    >
      <HeroImage source={heroImages.home} height={470 + insets.top}>
        <View
          style={[styles.heroInner, { paddingTop: insets.top + spacing.md }]}
        >
          <Text style={styles.wordmark}>SafePath</Text>

          <View>
            <Heading size={46} style={{ lineHeight: 50 }}>
              Explore{"\n"}wisely.
            </Heading>
            <Body muted style={{ marginTop: spacing.sm }}>
              Safety insights from recent news, smarter routes, better journeys.
            </Body>

            <Pressable
              style={styles.search}
              onPress={() => router.push("/explore")}
            >
              <Ionicons name="search" size={20} color={colors.textMuted} />
              <Text style={styles.searchText}>Search a destination...</Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
        </View>
      </HeroImage>

      <View style={styles.actions}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.label}
            style={styles.actionWrap}
            onPress={() => router.push(action.route)}
          >
            <GlassCard style={styles.action}>
              <Ionicons
                name={action.icon}
                size={26}
                color={colors.accentSoft}
              />
              <Text style={styles.actionLabel} numberOfLines={2}>
                {action.label}
              </Text>
            </GlassCard>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Heading size={24}>Popular destinations</Heading>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.popularRow}
      >
        {POPULAR.map((place) => (
          <Pressable
            key={place.city}
            onPress={() =>
              router.push({
                pathname: "/explore",
                params: { city: place.city },
              })
            }
          >
            <ImageBackground
              source={themeImages[place.theme]}
              style={styles.card}
              imageStyle={{ borderRadius: radius.md }}
            >
              <LinearGradient
                colors={["transparent", colors.overlayBottom]}
                style={[StyleSheet.absoluteFill, { borderRadius: radius.md }]}
              />
              <Text style={styles.cardCity}>{place.city}</Text>
              <Text style={styles.cardCountry}>{place.country}</Text>
            </ImageBackground>
          </Pressable>
        ))}
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  heroInner: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  wordmark: {
    fontFamily: fonts.headingBold,
    fontSize: 34,
    color: colors.text,
    textAlign: "center",
    letterSpacing: 1,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  searchText: { flex: 1, color: colors.textMuted, fontSize: 15 },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  actionWrap: { flex: 1 },
  action: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 96,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  actionLabel: { color: colors.text, fontSize: 11, textAlign: "center" },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  popularRow: { paddingHorizontal: spacing.lg, gap: 12 },
  card: {
    width: 150,
    height: 190,
    justifyContent: "flex-end",
    padding: 12,
  },
  cardCity: { fontFamily: fonts.heading, color: colors.text, fontSize: 22 },
  cardCountry: { color: colors.textMuted, fontSize: 12 },
});
