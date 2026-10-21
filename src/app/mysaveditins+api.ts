import { supabase } from "@/lib/auth/supabase";
import { verifySession } from "@/lib/auth/verifySession";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function readBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { user, error } = await verifySession(
    request.headers.get("Authorization") ?? undefined,
  );
  if (!user) return json({ error }, 401);

  const { data, error: fetchError } = await supabase
    .from("saved_itineraries")
    .select("*, location(location_id, city, country)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (fetchError) return json({ error: fetchError.message }, 500);
  return json({ data }, 200);
}

export async function POST(request: Request) {
  const { user, error } = await verifySession(
    request.headers.get("Authorization") ?? undefined,
  );
  if (!user) return json({ error }, 401);

  const body = await readBody(request);
  const location_id = body?.location_id;
  const schedule = body?.schedule;

  if (
    !location_id ||
    !Array.isArray(schedule) ||
    schedule.length === 0 ||
    schedule.length > 30
  ) {
    return json({ error: "Missing location_id or a valid schedule" }, 400);
  }
  if (JSON.stringify(schedule).length > 100_000) {
    return json({ error: "Itinerary is too large" }, 400);
  }

  const { data, error: insertError } = await supabase
    .from("saved_itineraries")
    .insert({ user_id: user.id, location_id, schedule, created_at: new Date() })
    .select();

  if (insertError) return json({ error: insertError.message }, 500);
  return json({ data }, 200);
}

export async function DELETE(request: Request) {
  const { user, error } = await verifySession(
    request.headers.get("Authorization") ?? undefined,
  );
  if (!user) return json({ error }, 401);

  const body = await readBody(request);
  const itinerary_id = body?.itinerary_id;
  if (!itinerary_id) return json({ error: "Missing itinerary_id" }, 400);

  const { error: deleteError } = await supabase
    .from("saved_itineraries")
    .delete()
    .eq("user_id", user.id)
    .eq("itinerary_id", itinerary_id);

  if (deleteError) return json({ error: deleteError.message }, 500);
  return json({ success: true }, 200);
}
