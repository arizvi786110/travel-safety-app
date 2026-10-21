import GlobeExplorer, { type TappedCountry } from "@/components/GlobeExplorer";
import { supabase } from "@/lib/auth/supabaseClient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

// false: tapping a country only fills the search bar (no paid lookups until you
//        press Search or tap a city chip)
// true:  tapping a country immediately searches its capital
const AUTO_SEARCH_CAPITAL = false;

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type CountryInfo = {
  country: { name: string; iso2: string; iso3: string };
  capital: string;
  cities: string[];
};
type Scope = { code: string; name: string };

export default function LocationDetail() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [city, setCity] = useState(
    typeof params.city === "string" ? params.city : "",
  );
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const [scope, setScope] = useState<Scope | null>(null);
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [countryLoading, setCountryLoading] = useState(false);
  const [countryError, setCountryError] = useState("");

  // scopeCode: undefined = use the selected country, null = no country, string = that code
  async function handleSearch(searchCity?: string, scopeCode?: string | null) {
    const cityToSearch = (searchCity ?? city).trim();
    if (!cityToSearch) return;
    const countryCode = scopeCode === undefined ? scope?.code : scopeCode;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      let endpoint = `${API_URL}/location_detail?city=${encodeURIComponent(cityToSearch)}`;
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

      const response = await fetch(`${API_URL}/country-info?${query}`);

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

  useEffect(() => {
    if (typeof params.city === "string" && params.city) {
      handleSearch(params.city, null);
    }
  }, [params.city]);

  async function handleAddFavourite() {
    if (!result) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    const response = await fetch(`${API_URL}/favourites-api`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        location_id: result.location.location_id,
        season: "now",
      }),
    });

    const body = await response.json().catch(() => null);

    if (response.ok) {
      Alert.alert("Added to favourites!");
    } else if (String(body?.error ?? "").includes("duplicate")) {
      Alert.alert("Already in your favourites");
    } else {
      Alert.alert("Something went wrong saving that favourite.");
    }
  }

  return (
    <ScrollView style={styles.container} scrollEnabled={scrollEnabled}>
      <Text style={styles.title}>Check a Destination</Text>

      <GlobeExplorer
        onCountryPress={handleCountryTap}
        onInteractionChange={(active) => setScrollEnabled(!active)}
      />

      {countryLoading ? <ActivityIndicator style={styles.countryLoading} /> : null}
      {countryError ? <Text style={styles.error}>{countryError}</Text> : null}

      {countryInfo ? (
        <View style={styles.countryCard}>
          <Text style={styles.countryTitle}>{countryInfo.country.name}</Text>
          <Text style={styles.countrySub}>Capital: {countryInfo.capital}</Text>
          <Text style={styles.chipsLabel}>Cities</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {countryInfo.cities.map((name, index) => (
              <TouchableOpacity
                key={name}
                style={[styles.chip, index === 0 && styles.chipCapital]}
                onPress={() => {
                  setCity(name);
                  handleSearch(name, scope?.code);
                }}
              >
                <Text style={[styles.chipText, index === 0 && styles.chipTextCapital]}>
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {scope ? (
        <View style={styles.scopeRow}>
          <Text style={styles.scopeText}>Searching in {scope.name}</Text>
          <TouchableOpacity onPress={clearScope}>
            <Text style={styles.scopeClear}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TextInput
        value={city}
        onChangeText={setCity}
        placeholder="Enter a city"
        style={styles.input}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={() => handleSearch()}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Searching..." : "Search"}
        </Text>
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.cityName}>
            {result.location.city}, {result.location.country}
          </Text>

          <TouchableOpacity
            style={styles.favouriteButton}
            onPress={handleAddFavourite}
          >
            <Text style={styles.buttonText}>♥ Add to Favourites</Text>
          </TouchableOpacity>

          {result.weather && result.weather.current && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Weather</Text>
              <Text>
                {result.weather.current.temperature_2m}°C, feels like{" "}
                {result.weather.current.apparent_temperature}°C
              </Text>
              <Text>Wind: {result.weather.current.wind_speed_10m} km/h</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Safety Ratings</Text>
            {result.safetyScores && result.safetyScores.length > 0 ? (
              result.safetyScores.map((score: any, index: number) => (
                <Text key={index}>
                  {score.category}: {score.rating}
                </Text>
              ))
            ) : (
              <Text>No safety data available yet for this location.</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.button}
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
            <Text style={styles.buttonText}>My itinerary</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  countryLoading: { marginBottom: 12 },
  countryCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  countryTitle: { fontSize: 18, fontWeight: "700" },
  countrySub: { color: "#6b7280", marginTop: 2, marginBottom: 10 },
  chipsLabel: { fontSize: 13, fontWeight: "600", color: "#6b7280", marginBottom: 6 },
  chip: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  chipCapital: { backgroundColor: "#2089dc", borderColor: "#2089dc" },
  chipText: { color: "#374151" },
  chipTextCapital: { color: "#fff", fontWeight: "600" },
  scopeRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  scopeText: { color: "#1d4ed8", fontSize: 13, fontWeight: "600" },
  scopeClear: { color: "#1d4ed8", fontSize: 14, marginLeft: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#2089dc",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  favouriteButton: {
    backgroundColor: "#e11d48",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "#dc2626", marginBottom: 16 },
  resultCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
  },
  cityName: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
});