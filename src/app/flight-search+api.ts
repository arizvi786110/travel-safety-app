import { supabase } from "@/lib/auth/supabase";
import { dijkistras, getGraph } from "@/lib/processing/dijkistra";
import { verifySession } from "@/lib/auth/verifySession";
import { rateLimited } from "@/lib/http";

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

async function findAirports(city: string) {
  const { data } = await supabase
    .from("airport_lookup")
    .select("*")
    .ilike("city", escapeLike(city));
  return data ?? [];
}

export async function GET(request: Request) {
    const { user, error: authError } = await verifySession(
    request.headers.get("Authorization") ?? undefined,
  );
  if (!user) {
    return new Response(JSON.stringify({ error: authError }), { status: 401 });
  }
  if (rateLimited(`flight-search:${user.id}`, 30)) {
    return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 });
  }
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (!from || !to) {
    return new Response(JSON.stringify({ error: "Missing from or to city" }), {
      status: 400,
    });
  }
  if (from.length > 100 || to.length > 100) {
    return new Response(JSON.stringify({ error: "City name too long" }), { status: 400 });
  }

  try {
    const [fromAirports, toAirports] = await Promise.all([
      findAirports(from),
      findAirports(to),
    ]);

    if (fromAirports.length === 0) {
      return new Response(
        JSON.stringify({ error: `No airport found for "${from}"` }),
        { status: 404 },
      );
    }
    if (toAirports.length === 0) {
      return new Response(
        JSON.stringify({ error: `No airport found for "${to}"` }),
        { status: 404 },
      );
    }

    const graph = await getGraph();
    const fromCandidates = fromAirports
      .filter((a: any) => graph[a.airport_id])
      .slice(0, 5);
    const toCandidates = toAirports
      .filter((a: any) => graph[a.airport_id])
      .slice(0, 5);

    if (fromCandidates.length === 0 || toCandidates.length === 0) {
      return new Response(
        JSON.stringify({
          route: null,
          message: "No scheduled flights found for one of those cities.",
        }),
        { status: 200 },
      );
    }

    let best: any = null;
    for (const src of fromCandidates) {
      const distances = dijkistras(graph, src.airport_id);
      for (const dst of toCandidates) {
        const d = distances[dst.airport_id];
        if (
          d !== undefined &&
          d !== Infinity &&
          (best === null || d < best.distance)
        ) {
          best = {
            distance: Math.round(d),
            from: {
              name: src.airport_name,
              city: src.city,
              country: src.country,
            },
            to: {
              name: dst.airport_name,
              city: dst.city,
              country: dst.country,
            },
          };
        }
      }
    }

    if (!best) {
      return new Response(
        JSON.stringify({
          route: null,
          message: "No route found between those cities.",
        }),
        { status: 200 },
      );
    }

    return new Response(JSON.stringify({ route: best }), { status: 200 });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Something went wrong finding a route." }),
      { status: 500 },
    );
  }
}
