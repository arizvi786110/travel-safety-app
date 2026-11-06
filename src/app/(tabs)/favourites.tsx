import { Body, Heading, PrimaryButton } from "@/components/ui";
import { supabase } from "@/lib/auth/supabaseClient";
import { messageForStatus } from "@/lib/errors";
import { themeImage } from "@/lib/images";
import { colors, fonts, radius, spacing } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    ImageBackground,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Alert } from "@/lib/alerts";

type Favourite = {
  fav_locationid: number | string;
  season: string;
  theme?: string;
  location?: { city?: string; country?: string };
};

// An invisible filler so a lone last card stays half-width
const SPACER = { spacer: true } as const;
type Item = Favourite | typeof SPACER;

const API = process.env.EXPO_PUBLIC_API_URL;

async function authHeaders() {
  //asks Supabase client for current session
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}` }; //token is short lived that the client refreshes automatically
} //

export default function Favourites() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    //loda is for fetch
    try {
      const response = await fetch(`${API}/favourites-api`, {
        //so that a non-JSON error page can't throw
        headers: await authHeaders(),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        setFavourites(result.data ?? []);
        setError("");
      } else {
        setError(messageForStatus(response.status, "your favourites"));
      }
    } catch {
      setError(
        "Couldn't reach the server. Check your connection and try again.",
      );
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Reload every time the tab comes into view
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function confirmRemove(fav: Favourite) {
    //sends a DELETE and ony updates the list once the server has confirmed
    Alert.alert(
      "Remove favourite",
      `Remove ${fav.location?.city ?? "this place"} from your favourites?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => remove(fav) },
      ],
    );
  }

  async function remove(fav: Favourite) {
    try {
      const response = await fetch(`${API}/favourites-api`, {
        method: "DELETE",
        headers: {
          ...(await authHeaders()),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location_id: fav.fav_locationid,
          season: fav.season,
        }),
      });
      if (response.ok) {
        setFavourites((prev) =>
          prev.filter(
            (f) =>
              !(
                f.fav_locationid === fav.fav_locationid &&
                f.season === fav.season
              ),
          ),
        );
      } else {
        Alert.alert(
          "Couldn't remove",
          response.status === 401
            ? "Your session has expired. Please sign in again."
            : "Something went wrong removing that favourite. Try again.",
        );
      }
    } catch {
      Alert.alert("Couldn't reach the server.");
    }
  }

  function renderItem({ item }: { item: Item }) {
    if ("spacer" in item) return <View style={styles.cardWrap} />;

    const city = item.location?.city ?? "Unknown";
    return (
      <View style={styles.cardWrap}>
        <Pressable
          onPress={() =>
            router.push({ pathname: "/explore", params: { city } })
          }
        >
            
          <ImageBackground
            source={themeImage(item.theme)}
            style={styles.card}
            imageStyle={{
              borderRadius: radius.md,
              width: "100%",
              height: "100%",
            }}
          >
            <View style={styles.card}>
              <Image
                source={themeImage(item.theme)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                }}
                resizeMode="cover"
              />
             <LinearGradient
     colors={["transparent", "transparent", "rgba(0,0,0,0.7)"]}
     locations={[0, 0.55, 1]}
     style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
   />
              <View style={styles.cardText}>
                <Text style={styles.city} numberOfLines={1}>
                  {city}
                </Text>
                <Text style={styles.country} numberOfLines={1}>
                  {item.location?.country}
                </Text>
                {item.season !== "now" ? (
                  <Text style={styles.season}>{item.season}</Text>
                ) : null}
              </View>
            </View>
          </ImageBackground>
        </Pressable>

        <Pressable
          style={styles.heart}
          hitSlop={8}
          onPress={() => confirmRemove(item)}
        >
          <Ionicons name="heart" size={18} color={colors.accentSoft} />
        </Pressable>
      </View>
    );
  }

  const data: Item[] =
    favourites.length % 2 === 1 ? [...favourites, SPACER] : favourites;

  const header = (
    <View style={{ marginBottom: spacing.sm }}>
      <Heading size={34}>Your Favourites</Heading>
      <Body muted style={{ marginTop: 4 }}>
        Saved destinations for quick access.
      </Body>
      {error && favourites.length > 0 ? (
        <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text>
      ) : null}
    </View>
  );

  const empty = loading ? (
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
  ) : (
    <View style={styles.emptyBox}>
      <Ionicons name="heart-outline" size={40} color={colors.textFaint} />
      <Body muted style={{ textAlign: "center", marginTop: spacing.sm }}>
        No favourites yet. Check a destination and tap the heart to save it.
      </Body>
      <PrimaryButton
        label="Check a destination"
        icon="arrow-forward"
        onPress={() => router.push("/explore")}
        style={{ marginTop: spacing.md }}
      />
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={data}
        numColumns={2}
        keyExtractor={(item, index) =>
          "spacer" in item
            ? `spacer-${index}`
            : `${item.fav_locationid}-${item.season}`
        }
        renderItem={renderItem}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: insets.top + spacing.md,
          paddingBottom: spacing.xl,
          gap: spacing.md,
        }}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  cardWrap: { flex: 1 },
  city: { fontFamily: fonts.heading, color: colors.text, fontSize: 22 },
  country: { color: colors.textMuted, fontSize: 12 },
  season: {
    marginTop: 6,
    alignSelf: "flex-start",
    color: colors.text,
    fontSize: 11,
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
    textTransform: "capitalize",
  },
  card: { aspectRatio: 0.8, overflow: "hidden", borderRadius: radius.md },
  cardText: { flex: 1, justifyContent: "flex-end", padding: 12 },
  heart: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
});
