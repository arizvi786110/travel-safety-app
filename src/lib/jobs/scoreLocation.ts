import { supabase } from "@/lib/auth/supabase";
import {
  colourMatch,
  getAverageSentiment,
  getProcessedArticles,
  getSentCount,
} from "@/lib/data-sources/safetyNews";

export async function scoreLocation(location: { location_id: number; city: string }) {
  const articles = await getProcessedArticles(location.city);

  // No articles is no evidence, not "safe". Don't write green scores.
  if (articles.length === 0) return false;

  const avgSentiment = getAverageSentiment(articles);
  const { articleMatches, keyWordCounts } = getSentCount(articles);
  const ratings = colourMatch(articleMatches, keyWordCounts, avgSentiment);

  const now = new Date();
  const scoreRows: any[] = [];
  const historyRows: any[] = [];
  for (const category in ratings) {
    scoreRows.push({
      sc_locationid: location.location_id,
      category,
      rating: ratings[category],
      last_updated: now,
    });
    historyRows.push({
      sch_locationid: location.location_id,
      category,
      rating: ratings[category],
      recorded_at: now,
    });
  }

  const { error: upsertError } = await supabase.from("safety_scores").upsert(scoreRows);
  if (upsertError) throw upsertError;

  const { error: historyError } = await supabase.from("score_history").insert(historyRows);
  if (historyError) throw historyError;

  return true;
}