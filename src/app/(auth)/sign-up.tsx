import { supabase } from "@/lib/auth/supabaseClient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signUpWithEmail() {
  setLoading(true);
  const { data: { session }, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    Alert.alert(error.message);
  } else if (!session) {
    Alert.alert(
      "Check your inbox",
      "Please verify your email, then sign in.",
      [{ text: "OK", onPress: () => router.replace("/sign-in") }]
    );
  } else {
    router.replace("/");
  }
  setLoading(false);
}

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create an account</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          onChangeText={setEmail}
          value={email}
          placeholder="email@address.com"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          onChangeText={setPassword}
          value={password}
          secureTextEntry
          placeholder="Password"
          autoCapitalize="none"
          style={styles.input}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={signUpWithEmail}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/sign-in")}>
        <Text style={styles.toggleText}>Already have an account? Sign in</Text>
      </TouchableOpacity>
      <Text style={styles.legalText}>
        By signing up you agree to our{" "}
        <Text style={styles.legalLink} onPress={() => router.push("/terms")}>Terms</Text>{" "}
        and{" "}
        <Text style={styles.legalLink} onPress={() => router.push("/privacy-policy")}>Privacy Policy</Text>.
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 32,
    textAlign: "center",
  },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#6b7280", marginBottom: 6 },
    legalText: { textAlign: "center", marginTop: 20, color: "#6b7280", fontSize: 12 },
  legalLink: { color: "#2089dc" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#2089dc",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  toggleText: {
    textAlign: "center",
    marginTop: 20,
    color: "#2089dc",
    fontSize: 14,
  },
});
