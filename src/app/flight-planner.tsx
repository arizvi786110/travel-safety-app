import CalendarPicker, { fromIso, toIso } from "@/components/CalendarPicker";
import CityInput from "@/components/CityInput";
import { supabase } from "@/lib/auth/supabaseClient";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const C = {
  bg: "#17151a",
  card: "rgba(255,255,255,0.08)",
  border: "rgba(255,255,255,0.12)",
  accent: "#8b5b6e",
  text: "#f4eef0",
  muted: "#b9aeb3",
  low: "#4caf6a",
  mid: "#e6b83a",
  high: "#d9534f",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function formatLong(iso: string) {
  const d = fromIso(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatKm(n: number) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function clock(value?: string) {
  return value ? value.slice(11, 16) : "--:--";
}

function dayPart(value?: string) {
  return value ? value.slice(0, 10) : "";
}

function duration(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

type Offer = {
  price: number;
  airlines: string[];
  logo: string | null;
  flightNumbers: string[];
  departure: { airport?: string; time?: string };
  arrival: { airport?: string; time?: string };
  stops: number;
  via: string[];
  durationMinutes: number;
};

type Network =
  | { status: "loading" }
  | { status: "ok"; route: any }
  | { status: "none"; message: string }
  | { status: "error" }
  | null;

export default function FlightPlanner() {
  const today = new Date();
  const minDate = toIso(addDays(today, 1));
  const maxDate = toIso(addDays(today, 325));

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState(toIso(addDays(today, 7)));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [network, setNetwork] = useState<Network>(null);

  async function handleSearch() {
    if (!from.trim() || !to.trim()) {
      setError("Enter a departure and arrival city.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    setNetwork({ status: "loading" });

    // The route-network search is free and independent of the live prices
    fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/flight-search?from=${encodeURIComponent(from.trim())}&to=${encodeURIComponent(to.trim())}`,
    )
      .then(async (r) => {
        const data = await r.json();
        if (r.ok && data.route) {
          setNetwork({ status: "ok", route: data.route });
        } else {
          setNetwork({
            status: "none",
            message: data.message ?? data.error ?? "No connection found.",
          });
        }
      })
      .catch(() => setNetwork({ status: "error" }));

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const query =
        `from=${encodeURIComponent(from.trim())}` +
        `&to=${encodeURIComponent(to.trim())}` +
        `&date=${encodeURIComponent(date)}`;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/flight-prices?${query}`,
        {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        },
      );
      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error ?? "Something went wrong finding prices.");
      }
    } catch {
      setError("Couldn't reach the server.");
    }
    setLoading(false);
  }

  const insightColor =
    result?.insights?.level === "low"
      ? C.low
      : result?.insights?.level === "high"
        ? C.high
        : C.mid;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Flight Planner</Text>
      <Text style={styles.sub}>Live one-way prices between cities.</Text>

      <CityInput
        label="Flying from"
        value={from}
        onChange={setFrom}
        placeholder="e.g. London"
      />
      <CityInput
        label="Flying to"
        value={to}
        onChange={setTo}
        placeholder="e.g. Istanbul"
      />

      <Text style={styles.label}>Departure date</Text>
      <Pressable
        style={styles.dateButton}
        onPress={() => setCalendarOpen((open) => !open)}
      >
        <Text style={styles.dateButtonText}>{formatLong(date)}</Text>
        <Text style={styles.dateButtonText}>{calendarOpen ? "▴" : "▾"}</Text>
      </Pressable>

      {calendarOpen ? (
        <CalendarPicker
          value={date}
          minDate={minDate}
          maxDate={maxDate}
          onChange={(iso) => {
            setDate(iso);
            setCalendarOpen(false);
          }}
        />
      ) : null}

      <Pressable
        onPress={handleSearch}
        disabled={loading}
        style={[styles.button, loading && { opacity: 0.6 }]}
      >
        {loading ? (
          <ActivityIndicator color={C.text} />
        ) : (
          <Text style={styles.buttonText}>Find flights</Text>
        )}
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {network ? (
        <View style={styles.network}>
          <Text style={styles.networkTitle}>Route network (older data)</Text>
          {network.status === "loading" ? (
            <Text style={styles.networkMeta}>
              Searching the route network...
            </Text>
          ) : null}
          {network.status === "ok" ? (
            <>
              <Text style={styles.networkText}>
                {network.route.from.city} → {network.route.to.city}
              </Text>
              <Text style={styles.networkMeta}>
                Shortest connection ≈ {formatKm(network.route.distance)} km,
                found with Dijkstra's algorithm on older OpenFlights route data.
                It may not match today's flights.
              </Text>
            </>
          ) : null}
          {network.status === "none" ? (
            <Text style={styles.networkMeta}>{network.message}</Text>
          ) : null}
          {network.status === "error" ? (
            <Text style={styles.networkMeta}>
              Couldn't reach the route service.
            </Text>
          ) : null}
        </View>
      ) : null}

      {result && result.offers?.length === 0 ? (
        <Text style={styles.note}>
          No flights found for that date. Try another day.
        </Text>
      ) : null}

      {result?.insights?.level ? (
        <View style={styles.insight}>
          <View style={[styles.dot, { backgroundColor: insightColor }]} />
          <Text style={styles.insightText}>
            Prices for this date are {result.insights.level}
            {result.insights.typicalLow && result.insights.typicalHigh
              ? ` (typical £${result.insights.typicalLow}–£${result.insights.typicalHigh})`
              : ""}
            .
          </Text>
        </View>
      ) : null}

      {result?.offers?.map((offer: Offer, index: number) => {
        const nextDay =
          dayPart(offer.arrival.time) !== dayPart(offer.departure.time);
        return (
          <View key={index} style={styles.offer}>
            <View style={styles.offerTop}>
              {offer.logo ? (
                <Image source={{ uri: offer.logo }} style={styles.logo} />
              ) : null}
              <Text style={styles.airline} numberOfLines={1}>
                {offer.airlines.join(" + ")}
              </Text>
              <Text style={styles.price}>£{Math.round(offer.price)}</Text>
            </View>
            <Text style={styles.times}>
              {clock(offer.departure.time)} {offer.departure.airport} →{" "}
              {clock(offer.arrival.time)} {offer.arrival.airport}
              {nextDay ? " +1" : ""}
            </Text>
            <Text style={styles.meta}>
              {duration(offer.durationMinutes)} ·{" "}
              {offer.stops === 0
                ? "Direct"
                : `${offer.stops} stop${offer.stops > 1 ? "s" : ""}${offer.via.length ? ` via ${offer.via.join(", ")}` : ""}`}
            </Text>
          </View>
        );
      })}

      {result?.offers?.length > 0 ? (
        <>
          <Text style={styles.footnote}>
            Prices from Google Flights
            {result.cached ? " (saved within the last few hours)" : ""}. Fares
            change quickly, so check the airline before booking.
          </Text>
          {result.link ? (
            <Pressable onPress={() => Linking.openURL(result.link)}>
              <Text style={styles.link}>View on Google Flights</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 32, color: C.text, fontWeight: "600" },
  sub: { color: C.muted, marginTop: 4, marginBottom: 20 },
  label: {
    color: C.muted,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 4,
  },
  dateButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  dateButtonText: { color: C.text, fontSize: 16 },
  button: {
    backgroundColor: C.accent,
    borderRadius: 14,
    padding: 15,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: { color: C.text, fontSize: 16, fontWeight: "600" },
  error: { color: C.high, marginBottom: 12 },
  note: { color: C.muted, marginBottom: 12 },
  network: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  networkTitle: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  networkText: { color: C.text, fontSize: 15 },
  networkMeta: { color: C.muted, fontSize: 12, marginTop: 4 },
  insight: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  insightText: { color: C.text, flex: 1 },
  offer: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  offerTop: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  logo: { width: 26, height: 26, borderRadius: 6, marginRight: 10 },
  airline: { color: C.text, fontSize: 15, fontWeight: "600", flex: 1 },
  price: { color: C.text, fontSize: 22, fontWeight: "600" },
  times: { color: C.text, fontSize: 15 },
  meta: { color: C.muted, marginTop: 2 },
  footnote: { color: C.muted, fontSize: 12, marginTop: 8 },
  link: { color: "#e8c9d2", marginTop: 10, textDecorationLine: "underline" },
});
