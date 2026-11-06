import { supabase } from "@/lib/auth/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { authFetch } from "@/lib/auth/authFetch";
import { useEffect, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { Alert } from "@/lib/alerts";

const SERIF = "CormorantGaramond_600SemiBold";

export default function Profile() {
  const router = useRouter();
  const [homeCountry, setHomeCountry] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setEmail(session?.user?.email ?? "");
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/setting-api`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          setHomeCountry(result.data[0].home_country ?? "");
        }
      } catch {
      }
      setLoading(false);
    }
    fetchSettings();
  }, []);

  async function saveSettings() {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/setting-api`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ home_country: homeCountry }),
      });
      Alert.alert(response.ok ? "Saved" : "Something went wrong saving settings");
    } catch {
      Alert.alert("Something went wrong saving settings");
    }
    setSaving(false);
  }

  function confirmSignOut() {
    Alert.alert("Sign out", "Sign out of SafePath?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);
  }
  function confirmDeleteAccount() {
  Alert.alert(
    "Delete account?",
    "This permanently deletes your account, favourites, saved itineraries and settings. This can't be undone.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Delete everything", style: "destructive", onPress: deleteAccount },
    ],
  );
}

async function deleteAccount() {
  setDeleting(true);
  try {
    const response = await authFetch(`${process.env.EXPO_PUBLIC_API_URL}/account`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "DELETE" }),
    });
    if (!response.ok) {
      setDeleting(false);
      Alert.alert("Couldn't delete your account", "Please try again.");
      return;
    }
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/welcome");
  } catch {
    setDeleting(false);
    Alert.alert("Couldn't delete your account", "Check your connection and try again.");
  }
}

  const initial = (email[0] ?? "?").toUpperCase();

  return (
    <View style={s.root}>
      <LinearGradient colors={["#2a1f27", "#17151a"]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.title}>Profile</Text>

          <View style={s.avatarRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Signed in as</Text>
              <Text style={s.email} numberOfLines={1}>{email || "—"}</Text>
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.section}>Home country</Text>
            <Text style={s.hint}>Used to personalise travel guidance.</Text>
            {loading ? (
              <ActivityIndicator color="#e8c9d2" style={{ marginVertical: 14 }} />
            ) : (
              <View style={s.inputWrap}>
                <Ionicons name="flag-outline" size={18} color="rgba(255,255,255,0.55)" />
                <TextInput
                  value={homeCountry}
                  onChangeText={setHomeCountry}
                  placeholder="e.g. United Kingdom"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={s.input}
                />
              </View>
            )}
            <TouchableOpacity
              style={[s.btn, (saving || loading) && { opacity: 0.6 }]}
              onPress={saveSettings}
              disabled={saving || loading}
            >
              <Text style={s.btnText}>{saving ? "Saving…" : "Save"}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.card}>
            <Text style={s.section}>Your trips</Text>
            <Row icon="bookmark-outline" label="Saved itineraries" onPress={() => router.push("/user-saved-itineraries")} />
            <Row icon="chatbubble-ellipses-outline" label="Assistant" onPress={() => router.push("/chatbot")} />
          </View>

          <View style={s.card}>
            <Text style={s.section}>About</Text>
            <Row icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => router.push("/privacy-policy")} />
            <Row icon="document-text-outline" label="Terms of Use" onPress={() => router.push("/terms")} />
            <Text style={s.credit}>
              Safety scores are guidance based on public news, not guarantees. Photos by contributors via Pexels.
            </Text>
          </View>

          <TouchableOpacity style={s.signOut} onPress={confirmSignOut}>
            <Ionicons name="log-out-outline" size={18} color="#fca5a5" />
            <Text style={s.signOutText}>Sign out</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.deleteLink} onPress={confirmDeleteAccount} disabled={deleting}>
          <Text style={s.deleteLinkText}>{deleting ? "Deleting…" : "Delete account"}</Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Row({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress}>
      <Ionicons name={icon} size={20} color="#e8c9d2" />
      <Text style={s.rowText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#17151a" },
  scroll: { padding: 20, paddingTop: 70, paddingBottom: 130 },
  title: { color: "#fff", fontSize: 42, fontFamily: SERIF, marginBottom: 18 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  avatar: {
    width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center",
    backgroundColor: "#e8c9d2",
  },
  avatarText: { color: "#2a1d24", fontSize: 26, fontFamily: SERIF },
  label: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
  email: { color: "#fff", fontSize: 16, marginTop: 2 },
  card: {
    padding: 18, borderRadius: 22, marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  section: { color: "#fff", fontSize: 22, fontFamily: SERIF },
  hint: { color: "rgba(255,255,255,0.55)", fontSize: 13, marginTop: 2, marginBottom: 12 },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 12,
  },
  input: { flex: 1, color: "#fff", paddingVertical: 14, fontSize: 16 },
  btn: { backgroundColor: "#e8c9d2", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  btnText: { color: "#2a1d24", fontWeight: "700", fontSize: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  rowText: { flex: 1, color: "#fff", fontSize: 15.5 },
  credit: { color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 18, marginTop: 8 },
  signOut: {
    flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 15,
    borderRadius: 14, borderWidth: 1, borderColor: "rgba(252,165,165,0.35)", backgroundColor: "rgba(220,38,38,0.1)",
  },
  signOutText: { color: "#fca5a5", fontWeight: "700", fontSize: 16 },
  deleteLink: { alignItems: "center", paddingVertical: 18 },
deleteLinkText: { color: "rgba(255,255,255,0.5)", textDecorationLine: "underline" },
});