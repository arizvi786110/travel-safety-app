import { verifySession } from "@/lib/auth/verifySession";
import { getPlaces } from "@/lib/data-sources/places";
import { json, rateLimited, serverError } from "@/lib/http";

const ALLOWED_CATEGORIES = [
  "restaurant",
  "museum",
  "park",
  "cafe",
  "tourist_attraction",
];
const MAX_RADIUS = 5000;

export async function GET(request: Request) {
  const { user, error } = await verifySession(
    request.headers.get("Authorization") ?? undefined,
  );
  if (!user) return json({ error }, 401);
  if (rateLimited(`itinerary:${user.id}`, 30)) {
    return json({ error: "Too many requests. Try again in a minute." }, 429);
  }

  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("latitude"));
  const longitude = Number(url.searchParams.get("longitude"));
  const radius = Number(url.searchParams.get("radius"));
  const requested = (url.searchParams.get("categories") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  if (
    !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
    !Number.isFinite(longitude) || Math.abs(longitude) > 180 ||
    !Number.isFinite(radius) || radius < 1 || radius > MAX_RADIUS
  ) {
    return json({ error: "Invalid location or radius" }, 400);
  }
  if (requested.some((c) => !ALLOWED_CATEGORIES.includes(c))) {
    return json({ error: "Invalid category" }, 400);
  }
  const includedTypes = requested.length > 0 ? requested : ALLOWED_CATEGORIES;

  try {
    const places = await getPlaces(latitude, longitude, radius, includedTypes, 10);
    return json({ places }, 200);
  } catch (err) {
    return serverError("itinerary", err);
  }
}