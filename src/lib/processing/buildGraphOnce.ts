
import * as fs from "fs";
import * as path from "path";
import { supabase } from "../auth/supabase";
import { Coordinates } from "../types";

// Splits one CSV line, keeping commas that are inside double quotes
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.replace(/\r$/, ""));
  return fields;
}

function buildAirportLookup(): Record<string, Coordinates> {
  const airportCoords: Record<string, Coordinates> = {};
  const fileContent = fs.readFileSync(path.join(__dirname, "airports.dat"), "utf-8");

  for (const line of fileContent.split("\n")) {
    if (!line.trim()) continue;
    const fields = parseCsvLine(line);
    const airportId = fields[0];
    const latitude = parseFloat(fields[6]);
    const longitude = parseFloat(fields[7]);
    if (isNaN(latitude) || isNaN(longitude)) continue;
    airportCoords[airportId] = { latitude, longitude };
  }
  return airportCoords;
}

function haversine(coord1: Coordinates, coord2: Coordinates): number {
  const rlat1 = coord1.latitude * (Math.PI / 180);
  const rlong1 = coord1.longitude * (Math.PI / 180);
  const rlat2 = coord2.latitude * (Math.PI / 180);
  const rlong2 = coord2.longitude * (Math.PI / 180);

  const diffLat = rlat1 - rlat2;
  const diffLong = rlong1 - rlong2;

  const a =
    Math.sin(diffLat / 2) ** 2 +
    Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(diffLong / 2) ** 2;
  const c = 2 * Math.asin(Math.min(1, Math.sqrt(a)));
  return 6371 * c;
}

type GraphEdge = {
  source_id: string;
  destination_id: string;
  weight: number;
};

async function buildGraphAndInsert(airportCoords: Record<string, Coordinates>) {
  const fileContent = fs.readFileSync(path.join(__dirname, "routes.dat"), "utf-8");
  const edgeMap: Record<string, GraphEdge> = {};

  for (const line of fileContent.split("\n")) {
    if (!line.trim()) continue;
    const fields = parseCsvLine(line);
    const sourceId = fields[3];
    const destId = fields[5];
    const stops = parseInt(fields[7]) || 0;
    const sourceCoords = airportCoords[sourceId];
    const destCoords = airportCoords[destId];
    if (!sourceCoords || !destCoords) continue;

    const distance = haversine(sourceCoords, destCoords);
    const weight = distance + stops * 1000;

    edgeMap[`${sourceId}-${destId}`] = { source_id: sourceId, destination_id: destId, weight };
  }

  const edgesForDb = Object.values(edgeMap);

  const { count, error: countError } = await supabase
    .from("graph_edges")
    .select("*", { count: "exact", head: true });
  if (countError) {
    console.error("Could not check graph_edges:", countError.message);
    return;
  }
  if ((count ?? 0) > 0) {
    if (!process.argv.includes("--replace")) {
      console.error(`graph_edges already has ${count} rows. Re-run with --replace to delete them first.`);
      return;
    }
    const { error: deleteError } = await supabase
      .from("graph_edges")
      .delete()
      .not("source_id", "is", null);
    if (deleteError) {
      console.error("Delete failed:", deleteError.message);
      return;
    }
  }

  const CHUNK = 1000;
  for (let i = 0; i < edgesForDb.length; i += CHUNK) {
    const { error } = await supabase.from("graph_edges").insert(edgesForDb.slice(i, i + CHUNK));
    if (error) {
      console.error(`Insert failed at row ${i}:`, error.message);
      return;
    }
  }
  console.log(`Inserted ${edgesForDb.length} edges into graph_edges`);
}

if (process.argv.includes("--run")) {
  buildGraphAndInsert(buildAirportLookup());
} else {
  console.log("Not running. Pass --run to build and insert the graph.");
}