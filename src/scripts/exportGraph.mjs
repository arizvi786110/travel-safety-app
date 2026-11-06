import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const graph = {};
let from = 0;
const pageSize = 1000;
while (true) {
  const { data, error } = await supabase
    .from("graph_edges")
    .select("source_id,destination_id,weight")
    .order("source_id")
    .order("destination_id")
    .range(from, from + pageSize - 1);
  if (error) throw error;
  if (!data || data.length === 0) break;
  for (const r of data) {
    (graph[r.source_id] ??= []).push([r.destination_id, Math.round(r.weight)]);
  }
  if (data.length < pageSize) break;
  from += pageSize;
}
writeFileSync("src/lib/processing/graph.json", JSON.stringify(graph));
console.log("Wrote graph.json with", Object.keys(graph).length, "source airports");