import { Body, GlassCard, Heading, PrimaryButton, Screen, ScreenHeader } from "@/components/ui";
import { supabase } from "@/lib/auth/supabaseClient";
import { messageForStatus } from "@/lib/errors";
import { heroImages } from "@/lib/images";
import { colors, fonts, spacing } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Entry = { start: number; end: number; type: string; name?: string };

const API = process.env.EXPO_PUBLIC_API_URL;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatTime(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

function formatDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function SavedItineraries() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch(`${API}/mysaveditins`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        setItineraries(result.data ?? []);
        setError("");
      } else {
        setError(messageForStatus(response.status, "your itineraries"));
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function confirmDelete(item: any) {
    Alert.alert(
      "Delete itinerary",
      `Delete your ${item.location?.city ?? "saved"} itinerary?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteItinerary(item.itinerary_id),
        },
      ],
    );
  }

  async function deleteItinerary(id: number) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch(`${API}/mysaveditins`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itinerary_id: id }),
      });

      if (response.ok) {
        setItineraries((prev) => prev.filter((i) => i.itinerary_id !== id));
      } else {
        Alert.alert(
          "Couldn't delete",
          response.status === 401
            ? "Your session has expired. Please sign in again."
            : "Something went wrong deleting that itinerary. Try again.",
        );
      }
    } catch {
      Alert.alert("Couldn't reach the server.");
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return itineraries;
    return itineraries.filter((i) =>
      `${i.location?.city ?? ""} ${i.location?.country ?? ""}`.toLowerCase().includes(q),
    );
  }, [itineraries, query]);

  return (
    <Screen>
      <StatusBar style="light" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.text}
          />
        }
      >
       <ImageBackground source={heroImages.savedItineraries} style={{ height: insets.top + 200 }} resizeMode="cover">
          <LinearGradient
            colors={["rgba(10,8,12,0.45)", "rgba(10,8,12,0.25)", colors.background]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <ScreenHeader
            right={
              <Pressable onPress={() => router.push("/explore")} hitSlop={12}>
                <Ionicons name="add" size={28} color={colors.text} />
              </Pressable>
            }
          />
          <View style={styles.heroText}>
            <Heading size={36}>Saved Itineraries</Heading>
            <Body muted style={{ marginTop: 4 }}>
              Your saved trip plans in one place.
            </Body>
          </View>
        </ImageBackground>

        <View style={styles.body}>
          <GlassCard style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search your itineraries..."
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              style={styles.searchInput}
            />
            {query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </GlassCard>

          {loading ? (
            <ActivityIndicator color={colors.text} style={{ marginTop: spacing.xl }} />
          ) : error ? (
            <View style={styles.emptyBox}>
              <Body muted style={{ textAlign: "center" }}>
                {error}
              </Body>
              <PrimaryButton
                label="Try again"
                onPress={() => {
                  setLoading(true);
                  load();
                }}
                style={{ marginTop: spacing.md }}
              />
            </View>
          ) : itineraries.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={40} color={colors.textFaint} />
              <Body muted style={{ textAlign: "center", marginTop: spacing.sm }}>
                Nothing saved yet. Check a destination, plan a trip and save it.
              </Body>
              <PrimaryButton
                label="Plan a trip"
                icon="arrow-forward"
                onPress={() => router.push("/explore")}
                style={{ marginTop: spacing.md }}
              />
            </View>
          ) : visible.length === 0 ? (
            <Body muted style={{ marginTop: spacing.lg }}>
              No itineraries match "{query.trim()}".
            </Body>
          ) : (
            visible.map((item) => {
              const days: Entry[][] = Array.isArray(item.schedule) ? item.schedule : [];
              const activityCount = days.reduce(
                (n, day) => n + day.filter((e) => e.type === "activity").length,
                0,
              );
              const expanded = expandedId === item.itinerary_id;

              return (
                <GlassCard key={item.itinerary_id} style={styles.card}>
                  <Pressable
                    style={styles.cardTop}
                    onPress={() => setExpandedId(expanded ? null : item.itinerary_id)}
                  >
                    <View style={styles.pin}>
                      <Ionicons name="location" size={20} color={colors.accentSoft} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.city} numberOfLines={1}>
                        {item.location?.city ?? "Unknown"}
                      </Text>
                      <Text style={styles.country} numberOfLines={1}>
                        {item.location?.country}
                      </Text>
                      <Text style={styles.meta}>
                        {days.length} day{days.length === 1 ? "" : "s"} · {activityCount} activit
                        {activityCount === 1 ? "y" : "ies"} · Saved {formatDate(item.created_at)}
                      </Text>
                    </View>
                    <Ionicons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </Pressable>

                  {expanded ? (
                    <View style={styles.expanded}>
                      {days.map((day, dayIndex) => {
                        const activities = day.filter((e) => e.type === "activity");
                        return (
                          <View key={dayIndex} style={styles.day}>
                            <Text style={styles.dayTitle}>Day {dayIndex + 1}</Text>
                            {activities.length === 0 ? (
                              <Text style={styles.meta}>Nothing planned</Text>
                            ) : (
                              activities.map((a, i) => (
                                <View key={i} style={styles.activityRow}>
                                  <Text style={styles.time}>
                                    {formatTime(a.start)}–{formatTime(a.end)}
                                  </Text>
                                  <Text style={styles.activityName} numberOfLines={2}>
                                    {a.name ?? "Activity"}
                                  </Text>
                                </View>
                              ))
                            )}
                          </View>
                        );
                      })}

                      <View style={styles.actions}>
                        <Pressable
                          style={styles.actionButton}
                          onPress={() =>
                            router.push({
                              pathname: "/explore",
                              params: item.location?.city ? { city: item.location.city } : {},
                            })
                          }
                        >
                          <Ionicons name="compass-outline" size={18} color={colors.accentSoft} />
                          <Text style={styles.actionText}>View destination</Text>
                        </Pressable>
                        <Pressable style={styles.actionButton} onPress={() => confirmDelete(item)}>
                          <Ionicons name="trash-outline" size={18} color={colors.danger} />
                          <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </GlassCard>
              );
            })
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroText: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.md },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 2 },
  emptyBox: { alignItems: "center", paddingTop: spacing.xl, paddingHorizontal: spacing.md },
  card: { padding: spacing.md, marginBottom: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  pin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass,
    alignItems: "center",
    justifyContent: "center",
  },
  city: { fontFamily: fonts.heading, color: colors.text, fontSize: 24 },
  country: { color: colors.textMuted, fontSize: 13 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  expanded: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glassBorder,
  },
  day: { marginBottom: spacing.md },
  dayTitle: { fontFamily: fonts.heading, color: colors.text, fontSize: 20, marginBottom: 6 },
  activityRow: { flexDirection: "row", gap: 12, paddingVertical: 3 },
  time: { color: colors.textMuted, fontSize: 13, width: 92 },
  activityName: { flex: 1, color: colors.text, fontSize: 14 },
  actions: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  actionButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  actionText: { color: colors.accentSoft, fontSize: 14, fontWeight: "600" },
});