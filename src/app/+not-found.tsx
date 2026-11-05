import ErrorScreen from "@/components/ErrorScreen";
import { Stack, useRouter } from "expo-router";

export default function NotFound() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ErrorScreen
        icon="compass-outline"
        title="Lost your way?"
        message="We couldn't find that page. It may have moved, or the link may be wrong."
        actionLabel="Back to home"
        onAction={() => router.replace("/")}
      />
    </>
  );
}