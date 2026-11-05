import { AuthButton, AuthError, AuthInput, AuthShell } from "@/components/AuthShell";
import { supabase } from "@/lib/auth/supabaseClient";
import { heroImages } from "@/lib/images";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !code.trim()) return setError("Enter your email and the code.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setLoading(true); setError("");
    const v = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "recovery" });
    if (v.error) { setLoading(false); return setError(v.error.message); }
    const u = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (u.error) return setError(u.error.message);
    router.replace("/");
  }

  return (
    <AuthShell image={heroImages.reset} title="New password" subtitle="Enter the code from your email, then choose a new password.">
      <AuthError message={error} />
      {!params.email ? (
        <AuthInput icon="mail-outline" placeholder="Email" value={email} onChangeText={setEmail}
          keyboardType="email-address" />
      ) : null}
      <AuthInput icon="keypad-outline" placeholder="6-digit code" value={code}
        onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
      <AuthInput icon="lock-closed-outline" placeholder="New password" value={password}
        onChangeText={setPassword} secure />
      <AuthInput icon="lock-closed-outline" placeholder="Confirm new password" value={confirm}
        onChangeText={setConfirm} secure />
      <AuthButton label="Update password" onPress={submit} loading={loading} />
    </AuthShell>
  );
}