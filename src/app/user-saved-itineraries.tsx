import { supabase } from "@/lib/auth/supabaseClient";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Entry = { start: number; end: number; type: string; name?: string };

function formatTime(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

export default function SavedItineraries() {
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const response = await fetch(
            `${process.env.EXPO_PUBLIC_API_URL}/mysaveditins`,
            {
              headers: { Authorization: `Bearer ${session?.access_token}` },
            },
          );
          const result = await response.json();
          setItineraries(result.data ?? []);
        } catch {
          setItineraries([]);
        }
        setLoading(false);
      }
      load();
    }, []),
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
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/mysaveditins`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itinerary_id: id }),
      },
    );

    if (response.ok) {
      setItineraries((prev) => prev.filter((i) => i.itinerary_id !== id));
    } else {
      Alert.alert("Something went wrong deleting that itinerary.");
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Saved Itineraries</Text>

      {itineraries.length === 0 ? (
        <Text style={styles.empty}>
          Nothing saved yet. Plan a trip from a destination page and save it.
        </Text>
      ) : (
        itineraries.map((item) => {
          const days: Entry[][] = Array.isArray(item.schedule)
            ? item.schedule
            : [];
          const activityCount = days.reduce(
            (n, day) => n + day.filter((e) => e.type === "activity").length,
            0,
          );
          const expanded = expandedId === item.itinerary_id;

          return (
            <View key={item.itinerary_id} style={styles.card}>
              <TouchableOpacity
                onPress={() =>
                  setExpandedId(expanded ? null : item.itinerary_id)
                }
              >
                <Text style={styles.city}>
                  {item.location?.city}, {item.location?.country}
                </Text>
                <Text style={styles.meta}>
                  {days.length} day{days.length === 1 ? "" : "s"} ·{" "}
                  {activityCount} activit
                  {activityCount === 1 ? "y" : "ies"} · saved{" "}
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </TouchableOpacity>

              {expanded &&
                days.map((day, dayIndex) => {
                  const activities = day.filter((e) => e.type === "activity");
                  return (
                    <View key={dayIndex} style={styles.day}>
                      <Text style={styles.dayTitle}>Day {dayIndex + 1}</Text>
                      {activities.length === 0 ? (
                        <Text style={styles.meta}>Nothing planned</Text>
                      ) : (
                        activities.map((a, i) => (
                          <Text key={i} style={styles.activity}>
                            {formatTime(a.start)}–{formatTime(a.end)}{" "}
                            {a.name ?? "Activity"}
                          </Text>
                        ))
                      )}
                    </View>
                  );
                })}

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => confirmDelete(item)}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  empty: { color: "#6b7280", fontStyle: "italic" },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  city: { fontSize: 18, fontWeight: "700" },
  meta: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  day: { marginTop: 12 },
  dayTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  activity: { fontSize: 14, marginBottom: 2 },
  deleteButton: { marginTop: 12, alignSelf: "flex-start" },
  deleteText: { color: "#dc2626", fontWeight: "600" },
});
