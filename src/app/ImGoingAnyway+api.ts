import { verifySession } from "@/lib/auth/verifySession";
import { supabase } from "@/lib/auth/supabase";
import { json, serverError } from "@/lib/http";

export async function GET(request: Request) {
  const { user, error } = await verifySession(
    request.headers.get("Authorization") ?? undefined,
  );
  if (!user) return json({ error }, 401);

  const city = new URL(request.url).searchParams.get("city")?.trim();
  if (!city || city.length > 100) {
    return json({ error: "Missing city" }, 400);
  }

  const { data: location, error: locationError } = await supabase
    .from("location")
    .select("*")
    .eq("city", city)
    .single();

  if (locationError || !location) {
    return json({ error: "Location not found" }, 404);
  }
  return json({ location }, 200);
}