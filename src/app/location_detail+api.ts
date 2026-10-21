import { supabase } from "@/lib/auth/supabase";
import { verifySession } from "@/lib/auth/verifySession";
import { getWeather } from "@/lib/data-sources/weather";
import { scoreLocation } from "@/lib/jobs/scoreLocation";

const MAX_CITY_LENGTH = 100;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

async function findLocation(city: string, country?: string) {
  let query = supabase.from("location").select("*").ilike("city", escapeLike(city));
  if (country) query = query.eq("country", country);
  const { data } = await query.limit(1);
  return data?.[0] ?? null;
}

async function geocode(city: string, countryCode?: string) {
  const params = new URLSearchParams({
    name: city,
    count: "1",
    language: "en",
    format: "json",
  });
  if (countryCode) params.set("countryCode", countryCode);

  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
  if (!res.ok) return null;
  const data = await res.json();
  const hit = data.results?.[0];
  if (!hit) return null;
  return {
    city: String(hit.name).slice(0, 50),
    country: String(hit.country ?? "Unknown").slice(0, 50),
    latitude: hit.latitude,
    longitude: hit.longitude,
  };
}

async function getScores(locationId: number) {
  const { data, error } = await supabase
    .from("safety_scores")
    .select("*")
    .eq("sc_locationid", locationId);
  if (error) {
    console.error("Safety scores query failed", error);
    return null;
  }
  return data && data.length > 0 ? data : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const city = url.searchParams.get("city")?.trim();
  const countryCode = url.searchParams.get("country_code")?.trim().toUpperCase();

  if (!city) return json({ error: "Missing city" }, 400);
  if (city.length > MAX_CITY_LENGTH) return json({ error: "City name too long" }, 400);
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
    return json({ error: "Invalid country_code" }, 400);
  }

  let location: any = null;
  let place: Awaited<ReturnType<typeof geocode>> = null;
  let newlyAdded = false;
  let scored = false;

  if (countryCode) {
    // A country was chosen, so resolve the name inside that country first
    place = await geocode(city, countryCode);
    if (!place) return json({ error: "Location not found" }, 404);
    location = await findLocation(place.city, place.country);
  } else {
    location = await findLocation(city);
  }

  if (!location) {
    // Creating a location costs a news API call, so require sign-in
    const { user } = await verifySession(request.headers.get("Authorization") ?? undefined);
    if (!user) return json({ error: "Sign in to look up new destinations" }, 401);

    place = place ?? (await geocode(city));
    if (!place) return json({ error: "Location not found" }, 404);

    // The canonical name may already exist (e.g. typed "london", stored "London")
    location = await findLocation(place.city, place.country);

    if (!location) {
      const { data, error } = await supabase.from("location").insert(place).select().single();
      if (error) {
        // Another request may have inserted it first
        location = await findLocation(place.city, place.country);
        if (!location) return json({ error: "Could not save that location" }, 500);
      } else {
        location = data;
        newlyAdded = true;
      }
    }

    if (newlyAdded) {
      try {
        scored = await scoreLocation(location);
      } catch (err) {
        console.error("Scoring failed for new location", err);
      }
    }
  }

  const safetyScores = await getScores(location.location_id);

  let weather: any = null;
  try {
    weather = await getWeather(location.latitude, location.longitude);
  } catch (err) {
    console.error("Weather failed", err);
  }

  return json({ location, safetyScores, weather, newlyAdded, scored }, 200);
}