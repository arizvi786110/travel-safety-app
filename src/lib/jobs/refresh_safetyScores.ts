import { supabase } from "@/lib/auth/supabase";
import { scoreLocation } from "@/lib/jobs/scoreLocation";

const REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000;

export async function refreshSafetyScores() {
  const { data: locations, error } = await supabase
    .from("location")
    .select("location_id, city, safety_scores(category, last_updated)");

  if (error || !locations) {
    console.error("refreshSafetyScores: could not load locations", error);
    return;
  }

  const now = Date.now();

  for (const location of locations) {
    const scores: { last_updated: string | null }[] = Array.isArray(location.safety_scores)
      ? location.safety_scores
      : [];
    const oldest =
      scores.length > 0
        ? Math.min(...scores.map((s) => new Date(s.last_updated ?? 0).getTime()))
        : 0;

    if (scores.length < 4 || now - oldest > REFRESH_INTERVAL_MS) {
      try {
        await scoreLocation(location);
      } catch (err) {
        console.error(`Failed to score ${location.city}`, err);
      }
    }
  }
}