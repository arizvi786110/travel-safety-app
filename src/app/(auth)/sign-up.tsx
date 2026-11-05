import { AuthButton, AuthError, AuthInput, AuthShell, authLink, authMuted } from "@/components/AuthShell";
import { supabase } from "@/lib/auth/supabaseClient";
import { heroImages } from "@/lib/images";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity } from "react-native";

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "code">("form");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim()) return setError("Enter your email.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setLoading(true); setError("");
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (error) return setError(error.message);
    if (data.session) return router.replace("/"); // email confirmation switched off
    setStep("code");
  }

  async function verify() {
    setLoading(true); setError("");
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setLoading(false);
    if (error) return setError(error.message);
    router.replace("/");
  }

  async function resend() {
    setError(""); setInfo("");
    const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
    if (error) setError(error.message); else setInfo("New code sent.");
  }

  return (
    <AuthShell
      image={heroImages.auth}
      title={step === "form" ? "Create account" : "Check your email"}
      subtitle={step === "form" ? "It takes a minute." : `We sent a 6-digit code to ${email.trim()}.`}
      footer={
        <>
          <Text style={authMuted}>Already registered?</Text>
          <TouchableOpacity onPress={() => router.replace("/sign-in")}>
            <Text style={authLink}>Sign in</Text>
          </TouchableOpacity>
        </>
      }
    >
      <AuthError message={error} />
      {info ? <Text style={{ color: "#86efac", marginBottom: 8 }}>{info}</Text> : null}
      {step === "form" ? (
        <>
          <AuthInput icon="mail-outline" placeholder="Email" value={email} onChangeText={setEmail}
            keyboardType="email-address" autoComplete="email" />
          <AuthInput icon="lock-closed-outline" placeholder="Password (8+ characters)" value={password}
            onChangeText={setPassword} secure />
          <AuthInput icon="lock-closed-outline" placeholder="Confirm password" value={confirm}
            onChangeText={setConfirm} secure />
          <AuthButton label="Create account" onPress={submit} loading={loading} />
          <Text style={[authMuted, { fontSize: 12, textAlign: "center", marginTop: 12 }]}>
            By continuing you agree to our{" "}
            <Text style={authLink} onPress={() => router.push("/terms")}>Terms</Text> and{" "}
            <Text style={authLink} onPress={() => router.push("/privacy-policy")}>Privacy Policy</Text>.
          </Text>
        </>
      ) : (
        <>
          <AuthInput icon="keypad-outline" placeholder="6-digit code" value={code}
            onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
          <AuthButton label="Verify" onPress={verify} loading={loading} />
          <TouchableOpacity onPress={resend} style={{ alignSelf: "center", marginTop: 14 }}>
            <Text style={authLink}>Resend code</Text>
          </TouchableOpacity>
        </>
      )}
    </AuthShell>
  );
}