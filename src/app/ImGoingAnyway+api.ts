import { supabase } from "@/lib/auth/supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const city = url.searchParams.get("city");

  if (!city) {
    return new Response(JSON.stringify({ error: "Missing city" }), {
      status: 400,
    });
  }

  const { data: location, error: locationError } = await supabase
    .from("location")
    .select("*")
    .eq("city", city)
    .single();

  if (locationError || !location) {
    return new Response(JSON.stringify({ error: "Location not found" }), {
      status: 404,
    });
  }
  return new Response(JSON.stringify({ location }), { status: 200 });
}
