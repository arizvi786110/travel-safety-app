import { authFetch } from "@/lib/auth/authFetch";
import { supabase } from "@/lib/auth/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { InlineError } from "@/components/ErrorScreen";
import { Alert } from "@/lib/alerts";

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
  activity: "#e8c9d2",
  free: "#ffffff",
};
const typeLabels: Record<string, string> = {
  getReady: "Get Ready / Sleep",
  rest: "Rest",
  meal: "Meal",
  activity: "Activity",
  free: "Free",
};

const SERIF = "CormorantGaramond_600SemiBold";

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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: Math.max(0, value - 1) * 70, y: 0 }}
      >
        {HOURS.map((h) => (
          <TouchableOpacity
            key={h}
            style={[styles.hourChip, value === h && styles.hourChipSelected]}
            onPress={() => onChange(h)}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === h }}
            accessibilityLabel={`${label} ${h}:00`}
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

const STEP_META: Record<Step, { title: string; sub: string }> = {
  basics: {
    title: "Your trip",
    sub: "How long are you going, and what do you enjoy?",
  },
  sleep: { title: "Sleep", sub: "When do you go to bed and wake up?" },
  ready: { title: "Getting ready", sub: "Time to get up and out the door." },
  lunch: { title: "Lunch", sub: "When do you like to eat lunch?" },
  dinner: { title: "Dinner", sub: "And dinner?" },
  rest: { title: "Rest break", sub: "A breather in the afternoon." },
  preview: {
    title: "Your timetable",
    sub: "Tap a free slot to add an activity.",
  },
};

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
  const [placesError, setPlacesError] = useState<string | null>(null);

  const dayCount = Math.min(7, Math.max(1, parseInt(numDays) || 1));

  function toggleCategory(category: string) {
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  }

  // Every step except basics/preview needs an end after its start
  function stepIsValid(): boolean {
    const ranges: Partial<Record<Step, [number, number]>> = {
      sleep: [sleepStart, sleepEnd],
      ready: [readyStart, readyEnd],
      lunch: [lunchStart, lunchEnd],
      dinner: [dinnerStart, dinnerEnd],
      rest: [restStart, restEnd],
    };
    const r = ranges[step];
    if (r && r[1] <= r[0]) {
      Alert.alert(
        "Check your times",
        "The end time must be after the start time.",
      );
      return false;
    }
    if (step === "rest") {
      const blocks = Object.values(ranges)
        .map((x) => x as [number, number])
        .sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < blocks.length; i++) {
        if (blocks[i][0] < blocks[i - 1][1]) {
          Alert.alert(
            "Times overlap",
            "Two of your blocks (sleep, getting ready, meals, rest) overlap. Go back and adjust them.",
          );
          return false;
        }
      }
    }
    return true;
  }

  function goNext() {
    if (!stepIsValid()) return;
    const index = STEPS.indexOf(step);
    if (step === "rest") generateSchedule();
    if (index < STEPS.length - 1) setStep(STEPS[index + 1]);
  }
  function goBack() {
    const index = STEPS.indexOf(step);
    if (index > 0) setStep(STEPS[index - 1]);
    else router.back();
  }

  function generateSchedule() {
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

  async function openBlockForPlacing(index: number) {
  setEditingBlockIndex(index);
  setLoadingPlaces(true);
  setPlacesError(null);
  setPlaceOptions([]);
  try {
    const response = await authFetch(
      `${process.env.EXPO_PUBLIC_API_URL}/itinerary?latitude=${latitude}&longitude=${longitude}&radius=${FIXED_RADIUS}&categories=${categories.join(",")}`,
    );
    if (!response.ok) {
      setPlacesError(
        response.status === 429
          ? "Place search is busy right now. Try again in a minute."
          : response.status === 401
            ? "Your session has expired. Please sign in again."
            : "Couldn't load places right now. Try again.",
      );
    } else {
      const data = await response.json();
      setPlaceOptions(data.places?.places ?? []);
    }
  } catch {
    setPlacesError("Couldn't reach the server. Check your connection and try again.");
  }
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
      Alert.alert("Can't fit that in", result.error);
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
    try {
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
    } catch {
      setSaving(false);
      Alert.alert("Something went wrong saving your itinerary.");
    }
  }

  const dayEntries = days[currentDay] ?? [];
  const stepIndex = STEPS.indexOf(step);
  const meta = STEP_META[step];
  const editingBlock =
    editingBlockIndex !== null ? dayEntries[editingBlockIndex] : null;

  function timeStep(
    start: number,
    setStart: (h: number) => void,
    end: number,
    setEnd: (h: number) => void,
  ) {
    return (
      <View style={styles.card}>
        <HourPicker label="Starts" value={start} onChange={setStart} />
        <HourPicker label="Ends" value={end} onChange={setEnd} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#2a1f27", "#17151a"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={goBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={stepIndex === 0 ? "Go back" : "Previous step"}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View
          style={styles.progressTrack}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${stepIndex + 1} of ${STEPS.length}`}
        >
          <View
            style={[
              styles.progressFill,
              { width: `${((stepIndex + 1) / STEPS.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>
          {params.city ? `${params.city} · ` : ""}Step {stepIndex + 1} of{" "}
          {STEPS.length}
        </Text>
        <Text style={styles.title} accessibilityRole="header">
          {meta.title}
        </Text>
        <Text style={styles.sub}>{meta.sub}</Text>

        {step === "basics" && (
          <>
            <View style={styles.card}>
              <Text style={styles.label}>Number of days</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Fewer days"
                  accessibilityState={{ disabled: dayCount <= 1 }}
                  onPress={() => setNumDays(String(Math.max(1, dayCount - 1)))}
                >
                  <Ionicons name="remove" size={22} color="#fff" />
                </TouchableOpacity>
                <Text
                  style={styles.stepValue}
                  accessibilityLabel={`${dayCount} days`}
                >
                  {dayCount}
                </Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  accessibilityRole="button"
                  accessibilityLabel="More days"
                  accessibilityState={{ disabled: dayCount >= 7 }}
                  onPress={() => setNumDays(String(Math.min(7, dayCount + 1)))}
                >
                  <Ionicons name="add" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>What do you enjoy?</Text>
              <View style={styles.categoryContainer}>
                {CATEGORY_OPTIONS.map((category) => {
                  const on = categories.includes(category);
                  return (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryChip,
                        on && styles.categoryChipSelected,
                      ]}
                      onPress={() => toggleCategory(category)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={category.replace("_", " ")}
                    >
                      <Text
                        style={
                          on ? styles.categoryTextSelected : styles.categoryText
                        }
                      >
                        {category.replace("_", " ")}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {step === "sleep" &&
          timeStep(sleepStart, setSleepStart, sleepEnd, setSleepEnd)}
        {step === "ready" &&
          timeStep(readyStart, setReadyStart, readyEnd, setReadyEnd)}
        {step === "lunch" &&
          timeStep(lunchStart, setLunchStart, lunchEnd, setLunchEnd)}
        {step === "dinner" &&
          timeStep(dinnerStart, setDinnerStart, dinnerEnd, setDinnerEnd)}
        {step === "rest" &&
          timeStep(restStart, setRestStart, restEnd, setRestEnd)}

        {step === "preview" && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 14 }}
            >
              {days.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.dayChip,
                    currentDay === i && styles.dayChipSelected,
                  ]}
                  onPress={() => {
                    setCurrentDay(i);
                    setEditingBlockIndex(null);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: currentDay === i }}
                  accessibilityLabel={`Day ${i + 1}`}
                >
                  <Text
                    style={
                      currentDay === i ? styles.dayTextSelected : styles.dayText
                    }
                  >
                    Day {i + 1}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.legend}>
              {(["getReady", "meal", "rest", "activity"] as const).map((t) => (
                <View key={t} style={styles.legendItem}>
                  <View
                    style={[styles.dot, { backgroundColor: typeColors[t] }]}
                  />
                  <Text style={styles.legendText}>
                    {t === "getReady" ? "Sleep / ready" : typeLabels[t]}
                  </Text>
                </View>
              ))}
            </View>

            {dayEntries.map((entry, index) => {
              const color = typeColors[entry.type];
              const height = Math.max(48, (entry.end - entry.start) * 34);
              const isFree = entry.type === "free";
              const isActivity = entry.type === "activity";
              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={isFree ? 0.6 : 1}
                  disabled={!isFree}
                  onPress={() => openBlockForPlacing(index)}
                  style={[
                    styles.timeBlock,
                    { minHeight: height },
                    isFree
                      ? styles.freeBlock
                      : {
                          backgroundColor: color + (isActivity ? "30" : "22"),
                          borderLeftColor: color,
                        },
                  ]}
                  accessible
                  accessibilityRole={isFree ? "button" : "text"}
                  accessibilityLabel={`${formatTime(entry.start)} to ${formatTime(entry.end)}, ${
                    isFree ? "free" : (entry.name ?? typeLabels[entry.type])
                  }`}
                  accessibilityHint={
                    isFree ? "Double tap to add an activity" : undefined
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timeText}>
                      {formatTime(entry.start)} – {formatTime(entry.end)}
                    </Text>
                    <Text
                      style={[
                        styles.blockName,
                        isFree && { color: "rgba(255,255,255,0.5)" },
                      ]}
                    >
                      {isFree ? "Free" : (entry.name ?? typeLabels[entry.type])}
                    </Text>
                  </View>
                  {isFree && entry.end - entry.start >= 1 && (
                    <View style={styles.addPill}>
                      <Ionicons name="add" size={16} color="#e8c9d2" />
                      <Text style={styles.addPillText}>Add</Text>
                    </View>
                  )}
                  {isActivity && (
                    <TouchableOpacity
                      onPress={() => handleRemoveActivity(index)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${entry.name ?? "activity"}`}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#fca5a5"
                      />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step !== "preview" ? (
          <TouchableOpacity
            style={styles.primary}
            onPress={goNext}
            accessibilityRole="button"
            accessibilityLabel={
              step === "rest" ? "Build my timetable" : "Next step"
            }
          >
            <Text style={styles.primaryText}>
              {step === "rest" ? "Build my timetable" : "Next"}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primary, saving && { opacity: 0.6 }]}
            onPress={saveItinerary}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Save itinerary"
            accessibilityState={{ disabled: saving, busy: saving }}
          >
            <Text style={styles.primaryText}>
              {saving ? "Saving…" : "Save itinerary"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={editingBlockIndex !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingBlockIndex(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle} accessibilityRole="header">
                  Add an activity
                </Text>
                {editingBlock && (
                  <Text style={styles.sub}>
                    From {formatTime(editingBlock.start)} · about 1.5 hours plus
                    travel
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setEditingBlockIndex(null)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              {loadingPlaces ? (
                <ActivityIndicator
                  color="#e8c9d2"
                  style={{ marginVertical: 30 }}
                  accessibilityLabel="Loading places"
                />
              ) : placesError ? (
                <InlineError
                  message={placesError}
                  onRetry={() => editingBlockIndex !== null && openBlockForPlacing(editingBlockIndex)}
                />
              ): placeOptions.length === 0 ? (
                <Text style={styles.empty}>
                  No places found for the selected categories.
                </Text>
              ) : (
                placeOptions.map((place, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.placeOption}
                    onPress={() =>
                      editingBlockIndex !== null &&
                      placeActivity(place, editingBlockIndex)
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${place.displayName?.text ?? "this place"}`}
                  >
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color="#e8c9d2"
                    />
                    <Text style={styles.placeText}>
                      {place.displayName?.text}
                    </Text>
                    <Ionicons
                      name="add-circle-outline"
                      size={22}
                      color="rgba(255,255,255,0.5)"
                    />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#17151a" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  progressFill: { height: 4, backgroundColor: "#e8c9d2", borderRadius: 2 },
  scroll: { padding: 20, paddingBottom: 130 },
  kicker: { color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 8 },
  title: { color: "#fff", fontSize: 40, fontFamily: SERIF, marginTop: 2 },
  sub: {
    color: "rgba(255,255,255,0.65)",
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    padding: 18,
    borderRadius: 22,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  label: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  stepValue: {
    color: "#fff",
    fontSize: 44,
    fontFamily: SERIF,
    minWidth: 50,
    textAlign: "center",
  },
  categoryContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  categoryChipSelected: { backgroundColor: "#e8c9d2", borderColor: "#e8c9d2" },
  categoryText: { color: "rgba(255,255,255,0.8)", textTransform: "capitalize" },
  categoryTextSelected: {
    color: "#2a1d24",
    fontWeight: "700",
    textTransform: "capitalize",
  },
  timeRow: { marginBottom: 6 },
  hourChip: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 8,
    minWidth: 62,
    alignItems: "center",
  },
  hourChipSelected: { backgroundColor: "#e8c9d2", borderColor: "#e8c9d2" },
  hourText: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
  hourTextSelected: { color: "#2a1d24", fontWeight: "700", fontSize: 14 },
  dayChip: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginRight: 8,
  },
  dayChipSelected: { backgroundColor: "#e8c9d2", borderColor: "#e8c9d2" },
  dayText: { color: "rgba(255,255,255,0.8)" },
  dayTextSelected: { color: "#2a1d24", fontWeight: "700" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  timeBlock: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 6,
    borderLeftWidth: 4,
  },
  freeBlock: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.22)",
    borderLeftWidth: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  timeText: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  blockName: { color: "#fff", fontSize: 15.5, fontWeight: "600", marginTop: 1 },
  addPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "rgba(232,201,210,0.15)",
  },
  addPillText: { color: "#e8c9d2", fontWeight: "600", fontSize: 13 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    paddingBottom: 34,
    backgroundColor: "rgba(23,21,26,0.92)",
  },
  primary: {
    backgroundColor: "#e8c9d2",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryText: { color: "#2a1d24", fontSize: 16.5, fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    backgroundColor: "#211d24",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  sheetTitle: { color: "#fff", fontSize: 28, fontFamily: SERIF },
  placeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  placeText: { flex: 1, color: "#fff", fontSize: 15.5 },
  empty: {
    color: "rgba(255,255,255,0.6)",
    marginVertical: 24,
    textAlign: "center",
  },
});
