import { supabase } from "@/lib/auth/supabase";
import { verifySession } from "@/lib/auth/verifySession";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

// The airport data spells a few countries differently from our country table.
// These are my best guesses at the airport data's spellings; the route logs
// when a country matches no airports so any mismatch shows up in the terminal.
const AIRPORT_COUNTRY_ALIASES: Record<string, string[]> = {
  Czechia: ["Czech Republic"],
  "Côte d'Ivoire": ["Cote d'Ivoire", "Ivory Coast"],
  "Democratic Republic of the Congo": ["Congo (Kinshasa)"],
  "Republic of the Congo": ["Congo (Brazzaville)"],
  Myanmar: ["Burma"],
  "North Macedonia": ["Macedonia"],
  Eswatini: ["Swaziland"],
  "Timor-Leste": ["East Timor"],
  "Cabo Verde": ["Cape Verde"],
  Palestine: ["West Bank", "Gaza Strip"],
};

async function findCountry(iso3: string | null, iso2: string | null, names: string[]) {
  if (iso3 && /^[A-Za-z]{3}$/.test(iso3)) {
    const { data } = await supabase
      .from("country_capital")
      .select("*")
      .eq("iso3", iso3.toUpperCase())
      .limit(1);
    if (data?.[0]) return data[0];
  }
  if (iso2 && /^[A-Za-z]{2}$/.test(iso2)) {
    const { data } = await supabase
      .from("country_capital")
      .select("*")
      .eq("iso2", iso2.toUpperCase())
      .limit(1);
    if (data?.[0]) return data[0];
  }
  for (const name of names) {
    if (!name) continue;
    const { data } = await supabase
      .from("country_capital")
      .select("*")
      .ilike("country", escapeLike(name))
      .limit(1);
    if (data?.[0]) return data[0];
  }
  return null;
}

export async function GET(request: Request) {
    const { user, error: authError } = await verifySession(
        request.headers.get("Authorization") ?? undefined,
    );
  if (!user) return json({ error: authError }, 401);
  const url = new URL(request.url);
  const iso3 = url.searchParams.get("iso3");
  const iso2 = url.searchParams.get("iso2");
  const name = url.searchParams.get("name")?.trim() ?? "";
  const admin = url.searchParams.get("admin")?.trim() ?? "";

  if (!iso3 && !iso2 && !name && !admin) {
    return json({ error: "Missing country" }, 400);
  }
  if (name.length > 100 || admin.length > 100) {
    return json({ error: "Country name too long" }, 400);
  }

  const row = await findCountry(iso3, iso2, [name, admin]);
  if (!row) {
    console.log("country-info: no match for", { iso3, iso2, name, admin });
    return json({ error: "No data for this country yet" }, 404);
  }

  const candidates = [row.country, ...(AIRPORT_COUNTRY_ALIASES[row.country] ?? [])];
  const { data: cityRows, error: citiesError } = await supabase.rpc(
    "top_cities_for_country",
    { country_names: candidates, max_cities: 10 },
  );

  if (citiesError) {
    console.error("country-info: cities query failed", citiesError.message);
  } else if (!cityRows || cityRows.length === 0) {
    console.log("country-info: no airports matched", candidates);
  }

  const seen = new Set<string>([row.capital.toLowerCase()]);
  const cities: string[] = [row.capital];
  for (const c of cityRows ?? []) {
    const key = String(c.city).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      cities.push(c.city);
    }
  }

  return json(
    {
      country: { name: row.country, iso2: row.iso2, iso3: row.iso3 },
      capital: row.capital,
      cities,
    },
    200,
  );
}
