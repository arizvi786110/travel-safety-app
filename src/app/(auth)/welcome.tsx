import { AuthButton, AuthShell, authMuted } from "@/components/AuthShell";
import { heroImages } from "@/lib/images";
import { useRouter } from "expo-router";
import { Text } from "react-native";

export default function Welcome() {
  const router = useRouter();
  return (
    <AuthShell
      image={heroImages.auth}
      title="Know before you go"
      subtitle="Safety insights from live news, plus flights and itineraries for wherever you're heading."
    >
      <AuthButton
        label="Create account"
        onPress={() => router.push("/sign-up")}
      />
      <AuthButton
        label="I already have an account"
        secondary
        onPress={() => router.push("/sign-in")}
      />
      <Text
        style={[
          authMuted,
          { textAlign: "center", marginTop: 14, fontSize: 12 },
        ]}
      >
        Scores are guidance based on public news, not guarantees.
      </Text>
    </AuthShell>
  );
}
