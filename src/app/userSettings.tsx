import { supabase } from "@/lib/auth/supabaseClient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Settings() {
  const [homeCountry, setHomeCountry] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchSettings() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      setEmail(session?.user?.email ?? "");

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/setting-api`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const result = await response.json();
      if (result.data && result.data.length > 0) {
        setHomeCountry(result.data[0].home_country ?? "");
      }
      setLoading(false);
    }
    fetchSettings();
  }, []);

  async function saveSettings() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/setting-api`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ home_country: homeCountry }),
      },
    );
    const result = await response.json();
    console.log("Save settings result:", response.status, result);

    if (response.ok) {
      Alert.alert("Settings saved");
    } else {
      Alert.alert("Something went wrong saving settings");
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (loading)
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.label}>Email</Text>
      <Text style={styles.emailText}>{email}</Text>

      <Text style={styles.label}>Home Country</Text>
      <TextInput
        value={homeCountry}
        onChangeText={setHomeCountry}
        placeholder="e.g. United Kingdom"
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={saveSettings}>
        <Text style={styles.buttonText}>Save</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/privacy-policy")}>
        <Text style={styles.linkText}>Privacy Policy</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/terms")}>
        <Text style={styles.linkText}>Terms & Conditions</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#6b7280", marginBottom: 6 },
  emailText: { fontSize: 16, marginBottom: 16, color: "#111827" },
  linkText: {
    color: "#2089dc",
    textAlign: "center",
    marginTop: 16,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#2089dc",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  signOutButton: {
    backgroundColor: "#dc2626",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
