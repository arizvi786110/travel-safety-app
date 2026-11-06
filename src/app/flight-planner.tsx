import CalendarPicker, { fromIso, toIso } from "@/components/CalendarPicker";
import CityInput from "@/components/CityInput";
import {
  Body,
  Chip,
  GlassCard,
  Heading,
  HeroImage,
  PrimaryButton,
  Screen,
  ScreenHeader,
} from "@/components/ui";
import { supabase } from "@/lib/auth/supabaseClient";
import { heroImages } from "@/lib/images";
import { colors, fonts, spacing } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authFetch } from "@/lib/auth/authFetch";
import { InlineError } from "@/components/ErrorScreen";
const API = process.env.EXPO_PUBLIC_API_URL;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

type Safety =
  | { status: "loading" }
  | { status: "ok"; city: string; scores: { category: string; rating: string }[] }
  | { status: "unavailable" }
  | { status: "error" }
  | null;

type SortKey = "price" | "duration" | "departure";

function stopsLabel(offer: Offer) {
  if (offer.stops === 0) return "Direct";
  const via = offer.via.length ? ` via ${offer.via.join(", ")}` : "";
  return `${offer.stops} stop${offer.stops > 1 ? "s" : ""}${via}`;
}

function riskLevel(rating: unknown): "low" | "moderate" | "high" | "unknown" {
  const r = String(rating ?? "").toLowerCase();
  if (/green|low/.test(r)) return "low";
  if (/amber|yellow|orange|moderate|medium/.test(r)) return "moderate";
  if (/red|high/.test(r)) return "high";
  return "unknown";
}

const RISK_COLOR = {
  low: colors.riskLow,
  moderate: colors.riskModerate,
  high: colors.riskHigh,
  unknown: colors.textFaint,
};
const RISK_LABEL = { low: "Low risk", moderate: "Moderate", high: "High risk", unknown: "No data" };

function prettyCategory(category: string) {
  const s = String(category).replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function SafetyCard({
  safety,
  city,
  onPress,
}: {
  safety: Safety;
  city: string;
  onPress: () => void;
}) {
  if (!safety || safety.status === "loading") return null;

  if (safety.status === "error") {
    return (
      <GlassCard style={styles.safetyCard}>
        <Heading size={20}>Safety in {city}</Heading>
        <Body muted style={{ marginTop: 4 }}>
          Couldn't load safety info right now. Please try again.
        </Body>
      </GlassCard>
    );
  }

  if (safety.status === "unavailable" || safety.scores.length === 0) {
    return (
      <Pressable onPress={onPress}>
        <GlassCard style={styles.safetyCard}>
          <Heading size={20}>Safety in {city}</Heading>
          <Body muted style={{ marginTop: 4 }}>
            {safety.status === "ok"
              ? `No safety ratings for ${city} yet. Tap to check.`
              : `We haven't checked ${city} yet. Tap to run a safety check.`}
          </Body>
        </GlassCard>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress}>
      <GlassCard style={styles.safetyCard}>
        <View style={styles.safetyHeader}>
          <Heading size={20}>Safety in {safety.city}</Heading>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
        <View style={styles.safetyGrid}>
          {safety.scores.map((s, i) => {
            const level = riskLevel(s.rating);
            return (
              <View key={i} style={styles.safetyItem}>
                <View style={[styles.dot, { backgroundColor: RISK_COLOR[level] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.safetyCategory} numberOfLines={1}>
                    {prettyCategory(s.category)}
                  </Text>
                  <Text style={styles.safetyLabel}>{RISK_LABEL[level]}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </GlassCard>
    </Pressable>
  );
}

export default function FlightPlanner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = new Date();
  const minDate = toIso(addDays(today, 1));
  const maxDate = toIso(addDays(today, 325));

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState(toIso(addDays(today, 7)));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [network, setNetwork] = useState<Network>(null);
  const [safety, setSafety] = useState<Safety>(null);
  const [lastSearch, setLastSearch] = useState({ from: "", to: "", date: "" });
  const [sort, setSort] = useState<SortKey>("price");
  const [directOnly, setDirectOnly] = useState(false);

  async function handleSearch() {
    const fromCity = from.trim();
    const toCity = to.trim();
    if (!fromCity || !toCity) {
      setFormError("Enter a departure and arrival city.");
      return;
    }

    setLoading(true);
    setFormError("");
    setError("");
    setResult(null);
    setNetwork({ status: "loading" });
    setSafety({ status: "loading" });
    setLastSearch({ from: fromCity, to: toCity, date });
    setSort("price");
    setDirectOnly(false);
    setCalendarOpen(false);

    // Route-network search: free, and independent of the live prices
    authFetch(
      `${API}/flight-search?from=${encodeURIComponent(fromCity)}&to=${encodeURIComponent(toCity)}`,
    )
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (r.ok && data.route) {
          setNetwork({ status: "ok", route: data.route });
        } else {
          setNetwork({ status: "none", message: data.message ?? data.error ?? "No connection found." });
        }
      })
      .catch(() => setNetwork({ status: "error" }));

    authFetch(`${API}/location_detail?city=${encodeURIComponent(toCity)}`)
      .then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          setSafety({
            status: "ok",
            city: data.location?.city ?? toCity,
            scores: data.safetyScores ?? [],
          });
        } else if (r.status === 401 || r.status === 404) {
          setSafety({ status: "unavailable" }); // genuinely not checked yet
        } else {
          setSafety({ status: "error" }); // 429, 500, etc.
        }
      })
      .catch(() => setSafety({ status: "error" }));

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const query =
        `from=${encodeURIComponent(fromCity)}` +
        `&to=${encodeURIComponent(toCity)}` +
        `&date=${encodeURIComponent(date)}`;

      const response = await fetch(`${API}/flight-prices?${query}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setResult(data);
      } else {
        setError(
          response.status === 429
            ? "Too many searches. Try again in a minute."
            : response.status === 401
              ? "Your session has expired. Please sign in again."
              : "Couldn't find prices right now. Try again.",
        );
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setLoading(false);
  }

  const offers: Offer[] = useMemo(() => {
    let list: Offer[] = result?.offers ?? [];
    if (directOnly) list = list.filter((o) => o.stops === 0);
    const sorted = [...list];
    if (sort === "price") sorted.sort((a, b) => a.price - b.price);
    else if (sort === "duration") sorted.sort((a, b) => a.durationMinutes - b.durationMinutes);
    else sorted.sort((a, b) => (a.departure.time ?? "").localeCompare(b.departure.time ?? ""));
    return sorted;
  }, [result, sort, directOnly]);

  const hasResults = (result?.offers?.length ?? 0) > 0;
  const insightColor =
    result?.insights?.level === "low"
      ? colors.riskLow
      : result?.insights?.level === "high"
        ? colors.riskHigh
        : colors.riskModerate;

  return (
    <Screen>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <HeroImage source={heroImages.flightPlanner} height={230 + insets.top}>
          <ScreenHeader />
          <View style={styles.heroText}>
            <Heading size={40}>Flight Planner</Heading>
            <Body muted style={{ marginTop: 4 }}>
              Live one-way fares between cities.
            </Body>
          </View>
        </HeroImage>

        <View style={styles.form}>
          <CityInput label="Flying from" value={from} onChange={setFrom} placeholder="e.g. London" />
          <CityInput label="Flying to" value={to} onChange={setTo} placeholder="e.g. Istanbul" />

          <Text style={styles.label}>Departure date</Text>
          <Pressable
            onPress={() => setCalendarOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel={`Departure date, ${formatLong(date)}`}
            accessibilityState={{ expanded: calendarOpen }}
          >
            <GlassCard style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={22} color={colors.accentSoft} />
              <Text style={styles.dateValue}>{formatLong(date)}</Text>
              <Ionicons
                name={calendarOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.textMuted}
              />
            </GlassCard>
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

          <PrimaryButton
            label="Find flights"
            icon="arrow-forward"
            onPress={handleSearch}
            loading={loading}
            style={{ marginTop: spacing.sm }}
          />

          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          {error ? <InlineError message={error} onRetry={handleSearch} /> : null}
        </View>

        {network || result || safety ? (
          <View style={styles.results}>
            {network ? (
              <GlassCard style={styles.network}>
                <Text style={styles.networkTitle}>Route network (older data)</Text>
                {network.status === "loading" ? (
                  <Text style={styles.networkMeta}>Searching the route network...</Text>
                ) : null}
                {network.status === "ok" ? (
                  <>
                    <Text style={styles.networkText}>
                      {network.route.from.city} → {network.route.to.city}
                    </Text>
                    <Text style={styles.networkMeta}>
                      Shortest connection ≈ {formatKm(network.route.distance)} km, found with Dijkstra's
                      algorithm on older OpenFlights route data. It may not match today's flights.
                    </Text>
                  </>
                ) : null}
                {network.status === "none" ? (
                  <Text style={styles.networkMeta}>{network.message}</Text>
                ) : null}
                {network.status === "error" ? (
                  <Text style={styles.networkMeta}>Couldn't reach the route service.</Text>
                ) : null}
              </GlassCard>
            ) : null}

            {result ? (
              <View style={styles.summaryRow}>
                <Heading size={22}>
                  {lastSearch.from} → {lastSearch.to}
                </Heading>
                <Body muted>{formatLong(lastSearch.date)}</Body>
              </View>
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

            <SafetyCard
              safety={safety}
              city={lastSearch.to}
              onPress={() => router.push({ pathname: "/explore", params: { city: lastSearch.to } })}
            />

            {hasResults ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                <Chip label="Cheapest" selected={sort === "price"} onPress={() => setSort("price")} />
                <Chip label="Fastest" selected={sort === "duration"} onPress={() => setSort("duration")} />
                <Chip label="Earliest" selected={sort === "departure"} onPress={() => setSort("departure")} />
                <Chip label="Direct only" selected={directOnly} onPress={() => setDirectOnly((v) => !v)} />
              </ScrollView>
            ) : null}

            {result && !hasResults ? (
              <Body muted style={{ marginBottom: spacing.md }}>
                No flights found for that date. Try another day.
              </Body>
            ) : null}

            {hasResults && offers.length === 0 ? (
              <Body muted style={{ marginBottom: spacing.md }}>
                No direct flights in these results. Turn off "Direct only" to see them all.
              </Body>
            ) : null}

            {offers.map((offer, index) => {
              const nextDay = dayPart(offer.arrival.time) !== dayPart(offer.departure.time);
              return (
                <GlassCard key={index} style={styles.offer}>
                  <View style={styles.offerTop}>
                    <View style={styles.logoWrap}>
                      {offer.logo ? <Image source={{ uri: offer.logo }} style={styles.logo} /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.airline} numberOfLines={1}>
                        {offer.airlines.join(" + ")}
                      </Text>
                      <Text style={styles.times}>
                        {clock(offer.departure.time)} → {clock(offer.arrival.time)}
                        {nextDay ? " +1" : ""}
                      </Text>
                    </View>
                    <Text style={styles.price}>£{Math.round(offer.price)}</Text>
                  </View>
                  <Text style={styles.meta}>
                    {offer.departure.airport} → {offer.arrival.airport} · {duration(offer.durationMinutes)} ·{" "}
                    {stopsLabel(offer)}
                  </Text>
                </GlassCard>
              );
            })}

            {hasResults ? (
              <>
                <Text style={styles.footnote}>
                  Prices from Google Flights{result.cached ? " (saved within the last few hours)" : ""}. Fares
                  change quickly, so check the airline before booking.
                </Text>
                {result.link ? (
                  <Pressable onPress={() => Linking.openURL(result.link)}>
                    <Text style={styles.link}>View on Google Flights</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroText: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  form: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 4 },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: 14,
    marginBottom: spacing.md,
  },
  dateValue: { flex: 1, color: colors.text, fontSize: 16 },
  error: { color: colors.danger, marginTop: spacing.md },
  results: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  network: { padding: 14, marginBottom: spacing.md },
  networkTitle: { color: colors.textMuted, fontSize: 12, fontWeight: "600", marginBottom: 4 },
  networkText: { color: colors.text, fontSize: 15 },
  networkMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  summaryRow: { marginBottom: spacing.sm },
  insight: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  insightText: { color: colors.text, flex: 1 },
  safetyCard: { padding: 14, marginBottom: spacing.md },
  safetyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  safetyGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 10 },
  safetyItem: { width: "50%", flexDirection: "row", alignItems: "center" },
  safetyCategory: { color: colors.text, fontSize: 13 },
  safetyLabel: { color: colors.textMuted, fontSize: 12 },
  chipRow: { gap: spacing.sm, paddingBottom: spacing.md },
  offer: { padding: 14, marginBottom: 10 },
  offerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: { width: 28, height: 28 },
  airline: { color: colors.text, fontSize: 15, fontWeight: "600" },
  times: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  price: { fontFamily: fonts.heading, color: colors.text, fontSize: 28 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 10 },
  footnote: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm },
  link: { color: colors.accentSoft, marginTop: 10, textDecorationLine: "underline" },
});