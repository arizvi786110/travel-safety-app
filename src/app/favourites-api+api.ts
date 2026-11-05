import { supabase } from "@/lib/auth/supabase";
import { verifySession } from "@/lib/auth/verifySession";
import { json, serverError } from "@/lib/http";

async function readBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

//every handler has verifySession
export async function GET(request: Request) {
  const { user, error } = await verifySession(request.headers.get("Authorization") ?? undefined);
  if (!user) return json({ error }, 401);

  const { data: favourites, error: fetchError } = await supabase
    .from("favourites")
    .select("*, location(location_id, city, country)")
    .eq("user_id", user.id);
  if (fetchError) return serverError("favourites GET", fetchError);
  if (!favourites || favourites.length === 0) return json({ data: [] });

  const countries = favourites.map((f: any) => f.location?.country).filter(Boolean);
  const { data: themes, error: themeError } = await supabase
    .from("country_theme")
    .select("country, theme")
    .in("country", countries);
  // Themes are cosmetic: fall back to the default image instead of failing the whole list
  if (themeError) console.error("favourites themes:", themeError.message);

  const themeMap: Record<string, string> = {};
  (themes ?? []).forEach((t: any) => {
    themeMap[t.country] = t.theme;
  });

  return json({
    data: favourites.map((f: any) => ({
      ...f,
      theme: themeMap[f.location?.country] ?? "city",
    })),
  });
}

export async function POST(request: Request) {
  const { user, error } = await verifySession(request.headers.get("Authorization") ?? undefined);
  if (!user) return json({ error }, 401);

  const body = await readBody(request);
  const location_id = body?.location_id;
  const season = body?.season;
  if (!location_id || typeof season !== "string" || season.length === 0 || season.length > 20) {
    return json({ error: "Missing or invalid location or season" }, 400);
  }

  const { data, error: insertError } = await supabase
    .from("favourites")
    .insert({ user_id: user.id, fav_locationid: location_id, season, created_at: new Date() })
    .select();
  if (insertError) return serverError("favourites POST", insertError);
  return json({ data });
}

export async function DELETE(request: Request) {
  const { user, error } = await verifySession(request.headers.get("Authorization") ?? undefined);
  if (!user) return json({ error }, 401);

  const body = await readBody(request);
  const location_id = body?.location_id;
  const season = body?.season;
  if (!location_id) return json({ error: "Missing location_id" }, 400);

  let query = supabase
    .from("favourites")
    .delete()
    .eq("user_id", user.id)
    .eq("fav_locationid", location_id);
  if (typeof season === "string" && season) query = query.eq("season", season);

  const { error: deleteError } = await query;
  if (deleteError) return serverError("favourites DELETE", deleteError);
  return json({ success: true });
}