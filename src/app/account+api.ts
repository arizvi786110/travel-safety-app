import { supabase } from "@/lib/auth/supabase"; // service-role client
import { verifySession } from "@/lib/auth/verifySession";
import { json, rateLimited, serverError } from "@/lib/http";

// Every public table that has a user_id column (from the SQL query)
const USER_TABLES = ["favourites", "flight_search_log", "profiles", "saved_itineraries"];

export async function DELETE(request: Request) {
  const { user, error } = await verifySession(
    request.headers.get("Authorization") ?? undefined,
  );
  if (!user) return json({ error }, 401);
  if (rateLimited(`delete-account:${user.id}`, 3)) {
    return json({ error: "Too many requests" }, 429);
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {}
  if (body?.confirm !== "DELETE") {
    return json({ error: "Confirmation required" }, 400);
  }

  try {
    for (const table of USER_TABLES) {
      const { error: delError } = await supabase
        .from(table)
        .delete()
        .eq("user_id", user.id);
      if (delError) return serverError(`delete-account ${table}`, delError);
    }
    const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
    if (authError) return serverError("delete-account auth", authError);

    return json({ success: true }, 200);
  } catch (err) {
    return serverError("delete-account", err);
  }
}