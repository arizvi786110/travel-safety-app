import { supabase } from "@/lib/auth/supabase";
import { verifySession } from "@/lib/auth/verifySession";

const DAILY_LIMIT_PER_USER = 5;
const MONTHLY_CAP = 200; 
const CACHE_HOURS = 6;
const CURRENCY = "GBP";
const MAX_OFFERS = 10;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const latest = new Date(today.getTime() + 330 * 24 * 60 * 60 * 1000);
  return date >= today && date <= latest;
}

async function airportsForCity(city: string) {
  const { data, error } = await supabase.rpc("top_airports_for_city", {
    city_name: city,
    max_airports: 3,
  });
  if (error) {
    console.error("top_airports_for_city failed", error);
    return [];
  }
  return (data ?? []) as { iata: string; airport_name: string; routes: number }[];
}

async function countSearches(since: Date, userId?: string) {
  let query = supabase
    .from("flight_search_log")
    .select("id", { count: "exact", head: true })
    .gte("searched_at", since.toISOString());
  if (userId) query = query.eq("user_id", userId);
  const { count } = await query;
  return count ?? 0;
}

function toOffer(raw: any) {
  const segments: any[] = raw?.flights ?? [];
  if (segments.length === 0 || typeof raw.price !== "number") return null;
  const first = segments[0];
  const last = segments[segments.length - 1];
  return {
    price: raw.price,
    airlines: Array.from(new Set(segments.map((s) => s.airline).filter(Boolean))),
    logo: raw.airline_logo ?? first.airline_logo ?? null,
    flightNumbers: segments.map((s) => s.flight_number).filter(Boolean),
    departure: { airport: first.departure_airport?.id, time: first.departure_airport?.time },
    arrival: { airport: last.arrival_airport?.id, time: last.arrival_airport?.time },
    stops: segments.length - 1,
    via: (raw.layovers ?? []).map((l: any) => l.id).filter(Boolean),
    durationMinutes:
      raw.total_duration ?? segments.reduce((n, s) => n + (s.duration ?? 0), 0),
  };
}

export async function GET(request: Request) {
  const { user, error } = await verifySession(request.headers.get("Authorization") ?? undefined);
  if (!user) return json({ error }, 401);

  if (process.env.FLIGHT_PRICES_ENABLED === "false") {
    return json({ error: "Live prices are switched off right now." }, 503);
  }

  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    console.error("SERPAPI_KEY is not set");
    return json({ error: "Price lookups aren't set up yet." }, 503);
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from")?.trim() ?? "";
  const to = url.searchParams.get("to")?.trim() ?? "";
  const date = url.searchParams.get("date")?.trim() ?? "";

  if (!from || !to || from.length > 100 || to.length > 100) {
    return json({ error: "Enter a departure and arrival city." }, 400);
  }
  if (!isValidDate(date)) {
    return json({ error: "Choose a date from tomorrow up to about 11 months ahead." }, 400);
  }

  const [fromAirports, toAirports] = await Promise.all([airportsForCity(from), airportsForCity(to)]);
  if (fromAirports.length === 0) return json({ error: `No airport found for "${from}".` }, 404);
  if (toAirports.length === 0) return json({ error: `No airport found for "${to}".` }, 404);

  const fromIds = fromAirports.map((a) => a.iata);
  const toIds = toAirports.map((a) => a.iata);
  const cacheKey = `${fromIds.join(",")}>${toIds.join(",")}|${date}|${CURRENCY}`;

  const { data: cached } = await supabase
    .from("flight_price_cache")
    .select("payload, fetched_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_HOURS * 3600 * 1000) {
    return json({ ...cached.payload, cached: true, fetchedAt: cached.fetched_at });
  }

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  if ((await countSearches(dayAgo, user.id)) >= DAILY_LIMIT_PER_USER) {
    return json(
      { error: `You've used today's ${DAILY_LIMIT_PER_USER} live price lookups. Try again tomorrow.` },
      429,
    );
  }
  if ((await countSearches(monthStart)) >= MONTHLY_CAP) {
    return json({ error: "Live prices are paused for this month. Please check back soon." }, 503);
  }

  await supabase.from("flight_search_log").insert({ user_id: user.id });

  const params = new URLSearchParams({
    engine: "google_flights",
    departure_id: fromIds.join(","),
    arrival_id: toIds.join(","),
    outbound_date: date,
    type: "2", 
    currency: CURRENCY,
    hl: "en",
    gl: "uk",
    api_key: apiKey,
  });

  let data: any;
  try {
    const res = await fetch(`https://serpapi.com/search?${params.toString()}`);
    data = await res.json();
  } catch (err) {
    console.error("SerpApi request failed", err);
    return json({ error: "Couldn't reach the price service." }, 502);
  }

  if (data?.error) {
    console.error("SerpApi error:", data.error);
    if (/no results|hasn't returned any results/i.test(String(data.error))) {
      return json({ offers: [], from: fromIds, to: toIds, date, currency: CURRENCY, cached: false });
    }
    return json({ error: "The price service returned an error." }, 502);
  }

  const offers = [...(data.best_flights ?? []), ...(data.other_flights ?? [])]
    .map(toOffer)
    .filter((o): o is NonNullable<ReturnType<typeof toOffer>> => o !== null)
    .sort((a, b) => a.price - b.price)
    .slice(0, MAX_OFFERS);

  const insights = data.price_insights
    ? {
        lowest: data.price_insights.lowest_price ?? null,
        level: data.price_insights.price_level ?? null,
        typicalLow: data.price_insights.typical_price_range?.[0] ?? null,
        typicalHigh: data.price_insights.typical_price_range?.[1] ?? null,
      }
    : null;

  const payload = {
    from: fromIds,
    to: toIds,
    date,
    currency: CURRENCY,
    offers,
    insights,
    link: data.search_metadata?.google_flights_url ?? null,
    source: "Google Flights",
  };

  if (offers.length > 0) {
    await supabase.from("flight_price_cache").upsert({
      cache_key: cacheKey,
      payload,
      fetched_at: new Date().toISOString(),
    });
  }

  return json({ ...payload, cached: false, fetchedAt: new Date().toISOString() });
}