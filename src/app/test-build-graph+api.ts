import { supabase } from "@/lib/auth/supabase";
import { haversine } from "@/lib/processing/dijkistra";
import { Coordinates } from "@/lib/types";
import * as fs from "fs";
import * as path from "path";

// graph_edges is already populated. Set to true only to rebuild it from scratch
// (clear the table first, or the insert will hit duplicate keys).
const REBUILD_GRAPH = false;

// Splits one CSV line, keeping commas that sit inside quoted fields
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

function buildAirportLookup(): {
  airportCoords: Record<string, Coordinates>;
  airportLookupRows: any[];
} {
  const airportCoords: Record<string, Coordinates> = {};
  const airportLookupRows: any[] = [];
  const fileContent = fs.readFileSync(
    path.join(process.cwd(), "airports.dat"),
    "utf-8",
  );
  const lines = fileContent.split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = splitCsvLine(line);
    if (fields.length < 8) continue;

    const airportId = fields[0].trim();
    const airportName = fields[1].trim();
    const city = fields[2].trim();
    const country = fields[3].trim();
    const iataRaw = fields[4].trim();
    const iata = /^[A-Z]{3}$/.test(iataRaw) ? iataRaw : null;
    const latitude = parseFloat(fields[6]);
    const longitude = parseFloat(fields[7]);

    airportLookupRows.push({
      airport_id: airportId,
      airport_name: airportName,
      city,
      country,
      iata,
    });

    if (isNaN(latitude) || isNaN(longitude)) continue;
    airportCoords[airportId] = { latitude, longitude };
  }
  return { airportCoords, airportLookupRows };
}

type GraphEdge = {
  source_id: string;
  destination_id: string;
  weight: number;
};

export async function GET() {
  try {
    const { airportCoords, airportLookupRows } = buildAirportLookup();

    // Update airport_lookup in chunks (creates missing rows, updates existing ones)
    for (let i = 0; i < airportLookupRows.length; i += 1000) {
      const chunk = airportLookupRows.slice(i, i + 1000);
      const { error } = await supabase
        .from("airport_lookup")
        .upsert(chunk, { onConflict: "airport_id" });
      if (error) {
        return new Response(JSON.stringify({ error }), { status: 500 });
      }
    }

    let edgeCount: number | undefined;

    if (REBUILD_GRAPH) {
      const fileContent = fs.readFileSync(
        path.join(process.cwd(), "routes.dat"),
        "utf-8",
      );
      const lines = fileContent.split("\n");
      const edgeMap: Record<string, GraphEdge> = {};

      for (const line of lines) {
        if (!line.trim()) continue;
        const fields = line.split(",");
        const sourceId = fields[3];
        const destId = fields[5];
        const stops = parseInt(fields[7]);
        const sourceCoords = airportCoords[sourceId];
        const destCoords = airportCoords[destId];
        if (!sourceCoords || !destCoords) continue;

        const distance = haversine(sourceCoords, destCoords);
        const weight = distance + stops * 1000;
        edgeMap[`${sourceId}-${destId}`] = {
          source_id: sourceId,
          destination_id: destId,
          weight,
        };
      }

      const edgesForDb = Object.values(edgeMap);
      const { error } = await supabase.from("graph_edges").insert(edgesForDb);
      if (error) {
        return new Response(JSON.stringify({ error }), { status: 500 });
      }
      edgeCount = edgesForDb.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        lookupCount: airportLookupRows.length,
        withIata: airportLookupRows.filter((r) => r.iata).length,
        edgeCount,
      }),
      { status: 200 },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
}