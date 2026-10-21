import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/auth/supabaseClient";
import { Session } from "@supabase/supabase-js";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/sign-in");
    }
  }, [loading, session]);

  if (loading) {
    return null; 
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}