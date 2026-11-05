import { AuthButton, AuthError, AuthInput, AuthShell, authLink, authMuted } from "@/components/AuthShell";
import { supabase } from "@/lib/auth/supabaseClient";
import { heroImages } from "@/lib/images";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity } from "react-native";

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return setError(error.message);
    router.replace("/");
  }

  return (
    <AuthShell
      image={heroImages.auth}
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={
        <>
          <Text style={authMuted}>New here?</Text>
          <TouchableOpacity onPress={() => router.replace("/sign-up")}>
            <Text style={authLink}>Create an account</Text>
          </TouchableOpacity>
        </>
      }
    >
      <AuthError message={error} />
      <AuthInput icon="mail-outline" placeholder="Email" value={email} onChangeText={setEmail}
        keyboardType="email-address" autoComplete="email" />
      <AuthInput icon="lock-closed-outline" placeholder="Password" value={password}
        onChangeText={setPassword} secure />
      <TouchableOpacity onPress={() => router.push("/forgot-password")} style={{ alignSelf: "flex-end", marginBottom: 6 }}>
        <Text style={authLink}>Forgot password?</Text>
      </TouchableOpacity>
      <AuthButton label="Sign in" onPress={submit} loading={loading} />
    </AuthShell>
  );
}