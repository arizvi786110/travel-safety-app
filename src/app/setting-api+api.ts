import { supabase } from "@/lib/auth/supabase";
import { verifySession } from "@/lib/auth/verifySession";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization") ?? undefined;
  const { user, error } = await verifySession(authHeader);

  if (!user) {
    return new Response(JSON.stringify({ error }), { status: 401 });
  }

  const { data, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
    });
  }
  return new Response(JSON.stringify({ data }), { status: 200 });
}

export async function PATCH(request: Request) {
  const authHeader = request.headers.get("Authorization") ?? undefined;
  const { user, error } = await verifySession(authHeader);

  if (!user) {
    return new Response(JSON.stringify({ error }), { status: 401 });
  }

  const body = await request.json();
  const { home_country } = body;

  if (!home_country) {
    return new Response(JSON.stringify({ error: "Missing home_country" }), {
      status: 400,
    });
  }

  const { data, error: upsertError } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, home_country: home_country })
    .select();

  if (upsertError) {
    return new Response(JSON.stringify({ error: upsertError.message }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ data }), { status: 200 });
}
