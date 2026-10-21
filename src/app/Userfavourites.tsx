import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { supabase } from "@/lib/auth/supabaseClient";

export default function Favourites() {
  const [favourites, setFavourites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFavourites() {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/favourites-api`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      setFavourites(result.data ?? []);
      setLoading(false);
    }
    fetchFavourites();
  }, []);

  if (loading) return <View style={styles.container}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Favourites</Text>
      <FlatList
        data={favourites}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{JSON.stringify(item)}</Text>
          </View>
        )}
        ListEmptyComponent={<Text>No favourites saved yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  item: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
});