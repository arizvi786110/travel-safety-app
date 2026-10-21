import { supabase } from "@/lib/auth/supabase";
import { verifySession } from "@/lib/auth/verifySession";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(request: Request) {
  const { user, error } = await verifySession(request.headers.get("Authorization") ?? undefined);
  if (!user) return json({ error }, 401);

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 60) return json({ results: [] });

  const escaped = q.replace(/[\\%_]/g, "\\$&");
  const { data, error: rpcError } = await supabase.rpc("search_airport_cities", {
    search_text: escaped,
    max_results: 8,
  });

  if (rpcError) {
    console.error("search_airport_cities failed", rpcError);
    return json({ error: "Search failed" }, 500);
  }

  return json({ results: data ?? [] });
}