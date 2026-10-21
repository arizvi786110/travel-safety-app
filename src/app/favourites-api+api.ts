import { supabase } from "@/lib/auth/supabase";
import { verifySession } from "@/lib/auth/verifySession";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization") ?? undefined;
  const { user, error } = await verifySession(authHeader);

  if (!user) {
    return new Response(JSON.stringify({ error }), { status: 401 });
  }

  const { data: favourites, error: fetchError } = await supabase
    .from("favourites")
    .select("*, location(location_id, city, country)")
    .eq("user_id", user.id);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
    });
  }

  if (!favourites || favourites.length === 0) {
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  }

  const countries = favourites
    .map((f: any) => f.location?.country)
    .filter(Boolean);
  const { data: themes } = await supabase
    .from("country_theme")
    .select("*")
    .in("country", countries);

  const themeMap: Record<string, string> = {};
  (themes ?? []).forEach((t: any) => {
    themeMap[t.country] = t.theme;
  });

  const enriched = favourites.map((f: any) => ({
    ...f,
    theme: themeMap[f.location?.country] ?? "city",
  }));

  return new Response(JSON.stringify({ data: enriched }), { status: 200 });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization") ?? undefined;
  const { user, error } = await verifySession(authHeader);

  if (!user) {
    return new Response(JSON.stringify({ error }), { status: 401 });
  }

  const body = await request.json();
  const { location_id, season } = body;

  if (!location_id || !season) {
    return new Response(
      JSON.stringify({ error: "Missing location or season" }),
      { status: 400 },
    );
  }

  const { data, error: insertError } = await supabase
    .from("favourites")
    .insert({
      user_id: user.id,
      fav_locationid: location_id,
      season,
      created_at: new Date(),
    })
    .select();

  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ data }), { status: 200 });
}

export async function DELETE(request: Request) {
  const authHeader = request.headers.get("Authorization") ?? undefined;
  const { user, error } = await verifySession(authHeader);

  if (!user) {
    return new Response(JSON.stringify({ error }), { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
  }

  const { location_id, season } = body ?? {};
  if (!location_id) {
    return new Response(JSON.stringify({ error: "Missing location_id" }), { status: 400 });
  }

  let query = supabase
    .from("favourites")
    .delete()
    .eq("user_id", user.id)
    .eq("fav_locationid", location_id);
  if (season) query = query.eq("season", season);

  const { error: deleteError } = await query;
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
