import { supabase } from "@/lib/auth/supabaseClient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const themeImages: Record<string, any> = {
  city: require("@/assets/images/themes/city.jpg"),
  beach: require("@/assets/images/themes/beach.jpg"),
  mountainous: require("@/assets/images/themes/mountainous.jpg"),
  desert: require("@/assets/images/themes/desert.jpg"),
  forest: require("@/assets/images/themes/forest.jpg"),
  historic: require("@/assets/images/themes/historic.jpg"),
};

export default function Home() {
  const router = useRouter();
  const [favourites, setFavourites] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      async function fetchFavourites() {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/favourites-api`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const result = await response.json();
        setFavourites(result.data ?? []);
      }
      fetchFavourites();
    }, []),
  );

  function confirmDelete(fav: any) {
    Alert.alert(
      "Remove favourite",
      `Remove ${fav.location?.city} from your favourites?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => deleteFavourite(fav),
        },
      ],
    );
  }

  async function deleteFavourite(fav: any) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/favourites-api`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location_id: fav.fav_locationid,
          season: fav.season,
        }),
      },
    );

    if (response.ok) {
      setFavourites((prev) =>
        prev.filter(
          (f) =>
            !(
              f.fav_locationid === fav.fav_locationid && f.season === fav.season
            ),
        ),
      );
    } else {
      Alert.alert("Something went wrong removing that favourite.");
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Travel Safety App</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/location")}
      >
        <Text style={styles.buttonText}>Check a Destination</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/flight-planner")}
      >
        <Text style={styles.buttonText}>Flight Planner</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/user-saved-itineraries")}
      >
        <Text style={styles.buttonText}>chatbot</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/chatbot")}
      >
        <Text style={styles.buttonText}>Talk to your own chatbot</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/userSettings")}
      >
        <Text style={styles.buttonText}>Settings</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Your Favourites</Text>

      {favourites.length === 0 ? (
        <Text style={styles.emptyText}>
          No favourites yet — go check a destination!
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.cardRow}
        >
          {favourites.map((fav) => (
            <TouchableOpacity
              key={`${fav.fav_locationid}-${fav.season}`}
              onPress={() =>
                router.push({
                  pathname: "/location",
                  params: { city: fav.location?.city },
                })
              }
            >
              <ImageBackground
                source={themeImages[fav.theme] ?? themeImages.city}
                style={styles.card}
                imageStyle={styles.cardImage}
              >
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => confirmDelete(fav)}
                >
                  <Text style={styles.deleteText}>✕</Text>
                </TouchableOpacity>
                <View style={styles.cardOverlay}>
                  <Text style={styles.cardText}>
                    {fav.location?.city}, {fav.location?.country}
                  </Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#2089dc",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 12,
  },
  emptyText: { color: "#6b7280", fontStyle: "italic" },
  cardRow: { marginBottom: 24 },
  card: {
    width: 220,
    height: 140,
    borderRadius: 12,
    marginRight: 12,
    justifyContent: "flex-end",
  },
  cardImage: { borderRadius: 12 },
  deleteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  cardOverlay: {
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  cardText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
