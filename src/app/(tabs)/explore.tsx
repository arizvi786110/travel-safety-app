import GlobeExplorer, { type TappedCountry } from "@/components/GlobeExplorer";
import { Body, Chip, GlassCard, Heading, PrimaryButton, Screen } from "@/components/ui";
import { supabase } from "@/lib/auth/supabaseClient";
import { heroImages, themeImages, type ThemeName } from "@/lib/images";
import {
  RISK_COLOR,
  RISK_LABEL,
  categoryIcon,
  prettyCategory,
  riskLevel,
  weatherIcon,
} from "@/lib/risk";
import { colors, fonts, radius, spacing } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authFetch } from "@/lib/auth/authFetch";

const AUTO_SEARCH_CAPITAL = false;

const API = process.env.EXPO_PUBLIC_API_URL;

const TITLE_BLOCK = 140;
const GLOBE_HEIGHT = 340;

type CountryInfo = {
  country: { name: string; iso2: string; iso3: string };
  capital: string;
  cities: string[];
};
type Scope = { code: string; name: string };

const POPULAR: { city: string; country: string; theme: ThemeName }[] = [
  { city: "Istanbul", country: "Türkiye", theme: "historic" },
  { city: "Dubai", country: "UAE", theme: "city" },
  { city: "Cairo", country: "Egypt", theme: "desert" },
  { city: "Phuket", country: "Thailand", theme: "beach" },
];

export default function Explore() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const resultY = useRef(0);

  const [city, setCity] = useState(typeof params.city === "string" ? params.city : "");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [favourited, setFavourited] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const [scope, setScope] = useState<Scope | null>(null);
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [countryLoading, setCountryLoading] = useState(false);
  const [countryError, setCountryError] = useState("");

  const heroHeight = insets.top + TITLE_BLOCK + GLOBE_HEIGHT;

  // scopeCode: undefined = use the selected country, null = no country, string = that code
  async function handleSearch(searchCity?: string, scopeCode?: string | null) {
    const cityToSearch = (searchCity ?? city).trim();
    if (!cityToSearch) return;
    const countryCode = scopeCode === undefined ? scope?.code : scopeCode;

    Keyboard.dismiss();
    setLoading(true);
    setError("");
    setResult(null);
    setFavourited(false);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      let endpoint = `${API}/location_detail?city=${encodeURIComponent(cityToSearch)}`;
      if (countryCode) endpoint += `&country_code=${encodeURIComponent(countryCode)}`;

      const response = await fetch(endpoint, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });

      if (response.status === 200) {
        setResult(await response.json());
      } else if (response.status === 404) {
        setError(
          countryCode && scope
            ? `We couldn't find "${cityToSearch}" in ${scope.name}.`
            : `We couldn't find "${cityToSearch}". Check the spelling or try a larger nearby city.`,
        );
      } else if (response.status === 401) {
        setError("Please sign in again to look up new destinations.");
      } else {
        setError("Something went wrong looking that up.");
      }
    } catch {
      setError("Couldn't reach the server.");
    }
    setLoading(false);
  }

  async function handleCountryTap(country: TappedCountry) {
    setCountryLoading(true);
    setCountryError("");
    setCountryInfo(null);

    try {
      const query =
        `iso3=${encodeURIComponent(country.iso3 ?? "")}` +
        `&iso2=${encodeURIComponent(country.iso2 ?? "")}` +
        `&name=${encodeURIComponent(country.name ?? "")}` +
        `&admin=${encodeURIComponent(country.admin ?? "")}`;

      const response = await authFetch(`${API}/country-info?${query}`);

      if (response.status === 200) {
        const data: CountryInfo = await response.json();
        setCountryInfo(data);
        setScope({ code: data.country.iso2, name: data.country.name });
        setCity(data.capital);
        setResult(null);
        setError("");
        if (AUTO_SEARCH_CAPITAL) {
          handleSearch(data.capital, data.country.iso2);
        }
      } else {
        setScope(null);
        setCountryError(
          `We don't have city data for ${country.name} yet. Type a city above to search.`,
        );
      }
    } catch {
      setCountryError("Couldn't reach the server.");
    }
    setCountryLoading(false);
  }

  function clearScope() {
    setScope(null);
    setCountryInfo(null);
    setCountryError("");
  }

  function searchPlainCity(name: string) {
    clearScope();
    setCity(name);
    handleSearch(name, null);
  }

  // Arriving with ?city=... (from Home, Favourites or Flights) searches straight away
  useEffect(() => {
    if (typeof params.city === "string" && params.city) {
      searchPlainCity(params.city);
    }
  }, [params.city]);

  // Bring a fresh result into view. The result's y is relative to the body, which starts below the hero.
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, heroHeight + resultY.current - spacing.md),
        animated: true,
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [result]);

  async function handleAddFavourite() {
    if (!result) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch(`${API}/favourites-api`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        location_id: result.location.location_id,
        season: "now",
      }),
    });

    const body = await response.json().catch(() => null);

    if (response.ok) {
      setFavourited(true);
    } else if (String(body?.error ?? "").includes("duplicate")) {
      setFavourited(true);
      Alert.alert("Already in your favourites");
    } else {
      Alert.alert("Something went wrong saving that favourite.");
    }
  }

  const current = result?.weather?.current;
  const scores: any[] = result?.safetyScores ?? [];

  return (
    <Screen>
      <StatusBar style="light" />
      <ScrollView
        ref={scrollRef}
        scrollEnabled={scrollEnabled}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      >
        <ImageBackground source={heroImages.explore} style={{ height: heroHeight }} resizeMode="cover">
          <LinearGradient
            colors={["rgba(10,8,12,0.45)", "rgba(10,8,12,0.2)", colors.background]}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View style={[styles.heroText, { height: insets.top + TITLE_BLOCK, paddingTop: insets.top + spacing.md }]}>
            <Heading size={38}>Check a Destination</Heading>
            <Body muted style={{ marginTop: 4 }}>
              Search a city, or tap a country on the globe.
            </Body>
          </View>

          <View style={styles.globeArea}>
            <GlobeExplorer
              height={GLOBE_HEIGHT}
              onCountryPress={handleCountryTap}
              onInteractionChange={(active) => setScrollEnabled(!active)}
            />
          </View>

          <View style={styles.hintWrap} pointerEvents="none">
            <Text style={styles.globeHint}>Drag to rotate · tap a country</Text>
          </View>
        </ImageBackground>

        <View style={styles.body}>
          <GlassCard style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="Search a city..."
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              onSubmitEditing={() => handleSearch()}
              autoCorrect={false}
              style={styles.searchInput}
            />
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Pressable onPress={() => handleSearch()} hitSlop={10}>
                <Ionicons name="arrow-forward" size={20} color={colors.accentSoft} />
              </Pressable>
            )}
          </GlassCard>

          {scope ? (
            <View style={styles.scopeRow}>
              <Text style={styles.scopeText}>Searching in {scope.name}</Text>
              <Pressable onPress={clearScope} hitSlop={10}>
                <Ionicons name="close" size={16} color={colors.accentSoft} />
              </Pressable>
            </View>
          ) : null}

          {countryLoading ? <ActivityIndicator color={colors.text} style={{ marginTop: spacing.md }} /> : null}
          {countryError ? <Text style={styles.error}>{countryError}</Text> : null}

          {countryInfo ? (
            <GlassCard style={styles.countryCard}>
              <Heading size={26}>{countryInfo.country.name}</Heading>
              <Body muted style={{ marginTop: 2 }}>
                Capital: {countryInfo.capital}
              </Body>
              <Text style={styles.chipsLabel}>Cities</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {countryInfo.cities.map((name) => (
                  <Chip
                    key={name}
                    label={name}
                    selected={name.toLowerCase() === city.trim().toLowerCase()}
                    onPress={() => {
                      setCity(name);
                      handleSearch(name, scope?.code);
                    }}
                  />
                ))}
              </ScrollView>
            </GlassCard>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {result ? (
            <View
              style={{ marginTop: spacing.md }}
              onLayout={(e) => {
                resultY.current = e.nativeEvent.layout.y;
              }}
            >
              <GlassCard style={styles.resultCard}>
                <Heading size={30}>{result.location.city}</Heading>
                <Body muted style={{ marginTop: 2 }}>
                  {result.location.country}
                </Body>

                {current ? (
                  <View style={styles.weatherRow}>
                    <View style={styles.weatherCell}>
                      <Ionicons name={weatherIcon(current.weather_code)} size={28} color={colors.accentSoft} />
                      <View>
                        <Text style={styles.weatherMain}>{Math.round(current.temperature_2m)}°C</Text>
                        <Text style={styles.weatherSub}>Feels like {Math.round(current.apparent_temperature)}°C</Text>
                      </View>
                    </View>
                    <View style={styles.weatherCell}>
                      <Ionicons name="flag-outline" size={28} color={colors.accentSoft} />
                      <View>
                        <Text style={styles.weatherMain}>{current.wind_speed_10m} km/h</Text>
                        <Text style={styles.weatherSub}>Wind</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <Body muted style={{ marginTop: spacing.md }}>
                    Weather is unavailable right now.
                  </Body>
                )}

                <Heading size={22} style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
                  Safety Ratings
                </Heading>

                {scores.length > 0 ? (
                  scores.map((s, i) => {
                    const level = riskLevel(s.rating);
                    return (
                      <View key={i} style={styles.safetyRow}>
                        <Ionicons name={categoryIcon(s.category)} size={20} color={colors.textMuted} />
                        <Text style={styles.safetyCategory}>{prettyCategory(s.category)}</Text>
                        <View style={[styles.dot, { backgroundColor: RISK_COLOR[level] }]} />
                        <Text style={styles.safetyLabel}>{RISK_LABEL[level]}</Text>
                      </View>
                    );
                  })
                ) : (
                  <Body muted>No safety ratings for this place yet.</Body>
                )}

                <Text style={styles.disclaimer}>
                  Ratings are a guide based on news from the last 30 days, not travel advice.
                </Text>

                <PrimaryButton
                  label={favourited ? "Saved to favourites" : "Add to Favourites"}
                  icon={favourited ? "heart" : "heart-outline"}
                  onPress={handleAddFavourite}
                  disabled={favourited}
                  style={{ marginTop: spacing.md }}
                />

                <Pressable
                  style={styles.secondaryButton}
                  onPress={() =>
                    router.push({
                      pathname: "/My-itinerary",
                      params: {
                        location_id: result.location.location_id,
                        latitude: result.location.latitude,
                        longitude: result.location.longitude,
                        city: result.location.city,
                      },
                    })
                  }
                >
                  <Text style={styles.secondaryText}>My Itinerary</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.text} />
                </Pressable>
              </GlassCard>
            </View>
          ) : null}

          {!result ? (
            <>
              <Heading size={24} style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
                Popular destinations
              </Heading>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularRow}>
                {POPULAR.map((place) => (
                  <Pressable key={place.city} onPress={() => searchPlainCity(place.city)}>
                    <ImageBackground
                      source={themeImages[place.theme]}
                      style={styles.popularCard}
                      imageStyle={{ borderRadius: radius.md }}
                    >
                      <LinearGradient
                        colors={["transparent", colors.overlayBottom]}
                        style={[StyleSheet.absoluteFill, { borderRadius: radius.md }]}
                      />
                      <Text style={styles.popularCity}>{place.city}</Text>
                      <Text style={styles.popularCountry}>{place.country}</Text>
                    </ImageBackground>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroText: { paddingHorizontal: spacing.lg },
  globeArea: { position: "absolute", left: 0, right: 0, bottom: 0, height: GLOBE_HEIGHT },
  hintWrap: { position: "absolute", left: 0, right: 0, bottom: 6, alignItems: "center" },
  globeHint: { color: colors.textFaint, fontSize: 12 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 2 },
  scopeRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 10,
    marginTop: spacing.sm,
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  scopeText: { color: colors.accentSoft, fontSize: 13, fontWeight: "600" },
  error: { color: colors.danger, marginTop: spacing.md },
  countryCard: { padding: spacing.md, marginTop: spacing.md },
  chipsLabel: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginTop: spacing.md, marginBottom: 8 },
  chipRow: { gap: spacing.sm },
  resultCard: { padding: spacing.md },
  weatherRow: { flexDirection: "row", marginTop: spacing.md, gap: spacing.md },
  weatherCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.glass,
    borderRadius: radius.md,
    padding: 12,
  },
  weatherMain: { color: colors.text, fontSize: 16, fontWeight: "600" },
  weatherSub: { color: colors.textMuted, fontSize: 12 },
  safetyRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 12 },
  safetyCategory: { flex: 1, color: colors.text, fontSize: 15 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  safetyLabel: { color: colors.textMuted, fontSize: 13, width: 80 },
  disclaimer: { color: colors.textFaint, fontSize: 12, marginTop: spacing.sm },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 14,
  },
  secondaryText: { color: colors.text, fontSize: 16, fontWeight: "600" },
  popularRow: { gap: 12 },
  popularCard: { width: 150, height: 190, justifyContent: "flex-end", padding: 12 },
  popularCity: { fontFamily: fonts.heading, color: colors.text, fontSize: 22 },
  popularCountry: { color: colors.textMuted, fontSize: 12 },
});