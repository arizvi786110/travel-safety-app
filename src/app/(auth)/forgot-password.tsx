import { AuthButton, AuthError, AuthInput, AuthShell, authLink } from "@/components/AuthShell";
import { supabase } from "@/lib/auth/supabaseClient";
import { heroImages } from "@/lib/images";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity } from "react-native";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim()) return setError("Enter your email.");
    setLoading(true); setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (error) return setError(error.message);
    router.push({ pathname: "/reset-password", params: { email: email.trim() } });
  }

  return (
    <AuthShell
      image={heroImages.reset}
      title="Reset password"
      subtitle="Enter your email and we'll send you a 6-digit code."
      footer={
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={authLink}>Back to sign in</Text>
        </TouchableOpacity>
      }
    >
      <AuthError message={error} />
      <AuthInput icon="mail-outline" placeholder="Email" value={email} onChangeText={setEmail}
        keyboardType="email-address" autoComplete="email" />
      <AuthButton label="Send Reset Code" onPress={submit} loading={loading} />
    </AuthShell>
  );
}