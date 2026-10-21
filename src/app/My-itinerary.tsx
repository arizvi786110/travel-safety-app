import { supabase } from "@/lib/auth/supabaseClient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type ScheduleEntry = {
  start: number;
  end: number;
  type: "getReady" | "rest" | "meal" | "activity" | "free";
  location?: { latitude: number; longitude: number };
  name?: string;
};

const CATEGORY_OPTIONS = [
  "restaurant",
  "museum",
  "park",
  "cafe",
  "tourist_attraction",
];
const HOURS = Array.from({ length: 25 }, (_, i) => i);
const FIXED_RADIUS = 2000;
const ASSUMED_SPEED_KMH = 30;

function initialiseSchedule(
  sleepBlock: ScheduleEntry,
  getReadyBlock: ScheduleEntry,
  mealBlocks: ScheduleEntry[],
  restBlocks: ScheduleEntry[],
): ScheduleEntry[] {
  const occupiedBlock: ScheduleEntry[] = [
    sleepBlock,
    getReadyBlock,
    ...mealBlocks,
    ...restBlocks,
  ];
  occupiedBlock.sort((a, b) => a.start - b.start);
  const schedule: ScheduleEntry[] = [];
  for (let i = 0; i < occupiedBlock.length; i++) {
    schedule.push(occupiedBlock[i]);
    const currentEnd = occupiedBlock[i].end;
    const nextStart =
      i + 1 < occupiedBlock.length ? occupiedBlock[i + 1].start : 24;
    if (nextStart > currentEnd) {
      schedule.push({ start: currentEnd, end: nextStart, type: "free" });
    }
  }
  return schedule;
}

function haversine(
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number },
): number {
  const rlat1 = coord1.latitude * (Math.PI / 180);
  const rlong1 = coord1.longitude * (Math.PI / 180);
  const rlat2 = coord2.latitude * (Math.PI / 180);
  const rlong2 = coord2.longitude * (Math.PI / 180);
  const diffLat = rlat1 - rlat2;
  const diffLong = rlong1 - rlong2;
  const a =
    Math.sin(diffLat / 2) ** 2 +
    Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(diffLong / 2) ** 2;
  const c = 2 * Math.asin(Math.min(1, Math.sqrt(a)));
  return 6371 * c;
}

function findReferenceActivity(schedule: ScheduleEntry[], beforeTime: number) {
  const sorted = schedule
    .filter((e) => e.start < beforeTime)
    .sort((a, b) => b.start - a.start);
  for (const entry of sorted) {
    if (entry.type === "activity") return entry;
  }
  return null;
}

// Round to nearest 15 minutes (0.25 hr), purely for a cleaner schedule
function roundToQuarterHour(hours: number): number {
  return Math.round(hours * 4) / 4;
}

function checkFeasibility(
  schedule: ScheduleEntry[],
  proposedActivity: {
    activity: {
      name: string;
      location: { latitude: number; longitude: number };
    };
    duration: number;
    startTime: number;
  },
): { success: boolean; schedule?: ScheduleEntry[]; error?: string } {
  const { activity, duration, startTime } = proposedActivity;
  const referenceActivity = findReferenceActivity(schedule, startTime);
  const rawTravelTime = referenceActivity?.location
    ? haversine(referenceActivity.location, activity.location) /
      ASSUMED_SPEED_KMH
    : 0;
  const travelTime = roundToQuarterHour(rawTravelTime);

  const requestStart = startTime;
  const requestEnd = roundToQuarterHour(startTime + travelTime + duration);

  const matchingFreeRangeIndex = schedule.findIndex(
    (range) =>
      range.type === "free" &&
      range.start <= requestStart &&
      range.end >= requestEnd,
  );

  if (matchingFreeRangeIndex === -1) {
    return {
      success: false,
      error: "No matching free time slot available for this placement",
    };
  }

  const matchingFreeRange = schedule[matchingFreeRangeIndex];
  const newSchedule = [...schedule];
  newSchedule.splice(matchingFreeRangeIndex, 1);

  const newEntries: ScheduleEntry[] = [];
  if (matchingFreeRange.start < requestStart) {
    newEntries.push({
      start: matchingFreeRange.start,
      end: requestStart,
      type: "free",
    });
  }
  newEntries.push({
    start: requestStart,
    end: requestEnd,
    type: "activity",
    location: activity.location,
    name: activity.name,
  });
  if (requestEnd < matchingFreeRange.end) {
    newEntries.push({
      start: requestEnd,
      end: matchingFreeRange.end,
      type: "free",
    });
  }

  newSchedule.splice(matchingFreeRangeIndex, 0, ...newEntries);
  newSchedule.sort((a, b) => a.start - b.start);

  return { success: true, schedule: newSchedule };
}

// Removes a placed activity, merging its time back into surrounding free blocks
function removeActivity(
  schedule: ScheduleEntry[],
  index: number,
): ScheduleEntry[] {
  const target = schedule[index];
  if (target.type !== "activity") return schedule;

  const newSchedule = [...schedule];
  const prev = newSchedule[index - 1];
  const next = newSchedule[index + 1];

  let start = target.start;
  let end = target.end;
  let removeCount = 1;
  let spliceStart = index;

  if (prev && prev.type === "free") {
    start = prev.start;
    spliceStart = index - 1;
    removeCount++;
  }
  if (next && next.type === "free") {
    end = next.end;
    removeCount++;
  }

  newSchedule.splice(spliceStart, removeCount, { start, end, type: "free" });
  return newSchedule;
}

function formatTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

const typeColors: Record<string, string> = {
  getReady: "#fbbf24",
  rest: "#a78bfa",
  meal: "#fb923c",
  activity: "#2089dc",
  free: "#e5e7eb",
};
const typeLabels: Record<string, string> = {
  getReady: "Get Ready / Sleep",
  rest: "Rest",
  meal: "Meal",
  activity: "Activity",
  free: "Free",
};

function HourPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (h: number) => void;
}) {
  return (
    <View style={styles.timeRow}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal style={styles.hourScroll}>
        {HOURS.map((h) => (
          <TouchableOpacity
            key={h}
            style={[styles.hourChip, value === h && styles.hourChipSelected]}
            onPress={() => onChange(h)}
          >
            <Text
              style={value === h ? styles.hourTextSelected : styles.hourText}
            >
              {h}:00
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const STEPS = [
  "basics",
  "sleep",
  "ready",
  "lunch",
  "dinner",
  "rest",
  "preview",
] as const;
type Step = (typeof STEPS)[number];

export default function ItineraryBuilder() {
  const params = useLocalSearchParams();
  const latitude = parseFloat(params.latitude as string);
  const longitude = parseFloat(params.longitude as string);
  const router = useRouter();
  const locationId = parseInt(params.location_id as string);
  const [saving, setSaving] = useState(false);

  const [step, setStep] = useState<Step>("basics");
  const [numDays, setNumDays] = useState("3");
  const [categories, setCategories] = useState<string[]>([]);

  const [sleepStart, setSleepStart] = useState(0);
  const [sleepEnd, setSleepEnd] = useState(8);
  const [readyStart, setReadyStart] = useState(8);
  const [readyEnd, setReadyEnd] = useState(10);
  const [lunchStart, setLunchStart] = useState(13);
  const [lunchEnd, setLunchEnd] = useState(14);
  const [dinnerStart, setDinnerStart] = useState(19);
  const [dinnerEnd, setDinnerEnd] = useState(20);
  const [restStart, setRestStart] = useState(15);
  const [restEnd, setRestEnd] = useState(16);

  const [days, setDays] = useState<ScheduleEntry[][]>([]);
  const [currentDay, setCurrentDay] = useState(0);

  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(
    null,
  );
  const [placeOptions, setPlaceOptions] = useState<any[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  function toggleCategory(category: string) {
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  }

  function goNext() {
    const index = STEPS.indexOf(step);
    if (step === "rest") generateSchedule();
    if (index < STEPS.length - 1) setStep(STEPS[index + 1]);
  }
  function goBack() {
    const index = STEPS.indexOf(step);
    if (index > 0) setStep(STEPS[index - 1]);
  }

  function generateSchedule() {
    const dayCount = parseInt(numDays) || 1;
    const sleepBlock: ScheduleEntry = {
      start: sleepStart,
      end: sleepEnd,
      type: "getReady",
    };
    const getReadyBlock: ScheduleEntry = {
      start: readyStart,
      end: readyEnd,
      type: "getReady",
    };
    const mealBlocks: ScheduleEntry[] = [
      { start: lunchStart, end: lunchEnd, type: "meal" },
      { start: dinnerStart, end: dinnerEnd, type: "meal" },
    ];
    const restBlocks: ScheduleEntry[] = [
      { start: restStart, end: restEnd, type: "rest" },
    ];
    const newDays: ScheduleEntry[][] = [];
    for (let i = 0; i < dayCount; i++)
      newDays.push(
        initialiseSchedule(sleepBlock, getReadyBlock, mealBlocks, restBlocks),
      );
    setDays(newDays);
    setCurrentDay(0);
  }

  function goToPreviousDay() {
    setCurrentDay((d) => Math.max(0, d - 1));
    setEditingBlockIndex(null);
  }
  function goToNextDay() {
    setCurrentDay((d) => Math.min(days.length - 1, d + 1));
    setEditingBlockIndex(null);
  }

  async function openBlockForPlacing(index: number) {
    setEditingBlockIndex(index);
    setLoadingPlaces(true);
    setPlaceOptions([]);

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/itinerary?latitude=${latitude}&longitude=${longitude}&radius=${FIXED_RADIUS}&categories=${categories.join(",")}`,
    );
    const data = await response.json();
    setPlaceOptions(data.places?.places ?? []);
    setLoadingPlaces(false);
  }

  function placeActivity(place: any, blockIndex: number) {
    const block = days[currentDay][blockIndex];
    const result = checkFeasibility(days[currentDay], {
      activity: {
        name: place.displayName?.text ?? "Activity",
        location: place.location,
      },
      duration: 1.5,
      startTime: block.start,
    });

    if (!result.success) {
      alert(result.error);
      return;
    }

    const updatedDays = [...days];
    updatedDays[currentDay] = result.schedule!;
    setDays(updatedDays);
    setEditingBlockIndex(null);
  }

  function handleRemoveActivity(index: number) {
    const updatedDays = [...days];
    updatedDays[currentDay] = removeActivity(days[currentDay], index);
    setDays(updatedDays);
  }

  async function saveItinerary() {
    const activityCount = days.reduce(
      (n, day) => n + day.filter((e) => e.type === "activity").length,
      0,
    );
    if (activityCount === 0) {
      Alert.alert("Nothing to save yet", "Add at least one activity first.");
      return;
    }
    if (!locationId) {
      Alert.alert(
        "Can't save",
        "Open the planner from a destination page so we know where this trip is.",
      );
      return;
    }

    setSaving(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/mysaveditins`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ location_id: locationId, schedule: days }),
      },
    );
    setSaving(false);

    if (response.ok) {
      Alert.alert("Itinerary saved", "Find it under Saved Itineraries.", [
        {
          text: "OK",
          onPress: () => router.replace("/user-saved-itineraries"),
        },
      ]);
    } else {
      Alert.alert("Something went wrong saving your itinerary.");
    }
  }

  const dayEntries = days[currentDay] ?? [];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>
        Plan Your Trip{params.city ? ` — ${params.city}` : ""}
      </Text>

      {step === "basics" && (
        <>
          <Text style={styles.label}>Number of Days</Text>
          <TextInput
            value={numDays}
            onChangeText={setNumDays}
            keyboardType="numeric"
            style={styles.input}
          />
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoryContainer}>
            {CATEGORY_OPTIONS.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  categories.includes(category) && styles.categoryChipSelected,
                ]}
                onPress={() => toggleCategory(category)}
              >
                <Text
                  style={
                    categories.includes(category)
                      ? styles.categoryTextSelected
                      : styles.categoryText
                  }
                >
                  {category.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {step === "sleep" && (
        <>
          <Text style={styles.sectionTitle}>Sleep</Text>
          <HourPicker
            label="Start"
            value={sleepStart}
            onChange={setSleepStart}
          />
          <HourPicker label="End" value={sleepEnd} onChange={setSleepEnd} />
        </>
      )}
      {step === "ready" && (
        <>
          <Text style={styles.sectionTitle}>Get Ready (after waking)</Text>
          <HourPicker
            label="Start"
            value={readyStart}
            onChange={setReadyStart}
          />
          <HourPicker label="End" value={readyEnd} onChange={setReadyEnd} />
        </>
      )}
      {step === "lunch" && (
        <>
          <Text style={styles.sectionTitle}>Lunch</Text>
          <HourPicker
            label="Start"
            value={lunchStart}
            onChange={setLunchStart}
          />
          <HourPicker label="End" value={lunchEnd} onChange={setLunchEnd} />
        </>
      )}
      {step === "dinner" && (
        <>
          <Text style={styles.sectionTitle}>Dinner</Text>
          <HourPicker
            label="Start"
            value={dinnerStart}
            onChange={setDinnerStart}
          />
          <HourPicker label="End" value={dinnerEnd} onChange={setDinnerEnd} />
        </>
      )}
      {step === "rest" && (
        <>
          <Text style={styles.sectionTitle}>Rest Break</Text>
          <HourPicker label="Start" value={restStart} onChange={setRestStart} />
          <HourPicker label="End" value={restEnd} onChange={setRestEnd} />
        </>
      )}

      {step === "preview" && (
        <>
          <View style={styles.dayNav}>
            <TouchableOpacity
              onPress={goToPreviousDay}
              disabled={currentDay === 0}
            >
              <Text
                style={[styles.arrow, currentDay === 0 && styles.arrowDisabled]}
              >
                ‹
              </Text>
            </TouchableOpacity>
            <Text style={styles.dayTitle}>
              Day {currentDay + 1} of {days.length}
            </Text>
            <TouchableOpacity
              onPress={goToNextDay}
              disabled={currentDay === days.length - 1}
            >
              <Text
                style={[
                  styles.arrow,
                  currentDay === days.length - 1 && styles.arrowDisabled,
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.navButton,
                    { marginTop: 16, alignItems: "center" },
                  ]}
                  onPress={saveItinerary}
                  disabled={saving}
                >
                  <Text style={styles.buttonText}>
                    {saving ? "Saving..." : "Save Itinerary"}
                  </Text>
                </TouchableOpacity>
                ›
              </Text>
            </TouchableOpacity>
          </View>

          {dayEntries.map((entry, index) => (
            <TouchableOpacity
              key={index}
              disabled={entry.type !== "free" && entry.type !== "activity"}
              onPress={() =>
                entry.type === "free"
                  ? openBlockForPlacing(index)
                  : handleRemoveActivity(index)
              }
              style={[
                styles.timeBlock,
                {
                  backgroundColor: typeColors[entry.type],
                  flex: entry.end - entry.start,
                },
              ]}
            >
              <Text style={styles.timeBlockText}>
                {formatTime(entry.start)} - {formatTime(entry.end)} ·{" "}
                {entry.name ?? typeLabels[entry.type]}
              </Text>
              {entry.type === "free" && (
                <Text style={styles.tapHint}>Tap to add an activity</Text>
              )}
              {entry.type === "activity" && (
                <Text style={styles.tapHint}>Tap to remove</Text>
              )}
            </TouchableOpacity>
          ))}

          {editingBlockIndex !== null && (
            <View style={styles.editPanel}>
              <Text style={styles.sectionTitle}>Nearby Places</Text>
              {loadingPlaces ? (
                <ActivityIndicator />
              ) : placeOptions.length === 0 ? (
                <Text>No places found for the selected categories.</Text>
              ) : (
                placeOptions.map((place, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.placeOption}
                    onPress={() => placeActivity(place, editingBlockIndex)}
                  >
                    <Text style={styles.placeText}>
                      {place.displayName?.text}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </>
      )}

      <View style={styles.navRow}>
        {step !== "basics" && (
          <TouchableOpacity style={styles.navButton} onPress={goBack}>
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
        )}
        {step !== "preview" && (
          <TouchableOpacity style={styles.navButton} onPress={goNext}>
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 4,
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  categoryChipSelected: { backgroundColor: "#2089dc", borderColor: "#2089dc" },
  categoryText: { color: "#374151" },
  categoryTextSelected: { color: "#fff", fontWeight: "600" },
  timeRow: { marginBottom: 8 },
  hourScroll: { flexDirection: "row" },
  hourChip: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 6,
  },
  hourChipSelected: { backgroundColor: "#2089dc", borderColor: "#2089dc" },
  hourText: { color: "#374151", fontSize: 13 },
  hourTextSelected: { color: "#fff", fontWeight: "600", fontSize: 13 },
  dayNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  dayTitle: { fontSize: 18, fontWeight: "700" },
  arrow: { fontSize: 32, color: "#2089dc", paddingHorizontal: 12 },
  arrowDisabled: { color: "#d1d5db" },
  timeBlock: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 2,
    justifyContent: "center",
  },
  timeBlockText: { fontSize: 12, fontWeight: "600", color: "#1f2937" },
  tapHint: { fontSize: 11, color: "#6b7280", fontStyle: "italic" },
  editPanel: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  placeOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  placeText: { fontSize: 15, fontWeight: "600" },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 24,
  },
  navButton: {
    backgroundColor: "#2089dc",
    borderRadius: 8,
    padding: 14,
    paddingHorizontal: 24,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
