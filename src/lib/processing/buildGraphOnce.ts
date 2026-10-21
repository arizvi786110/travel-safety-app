import * as fs from "fs";
import * as path from "path";
import { supabase } from "../auth/supabase";
import { Coordinates } from "../types";

function buildAirportLookup(): Record<string, Coordinates> {
  const airportCoords: Record<string, Coordinates> = {};
  const fileContent = fs.readFileSync(
    path.join(__dirname, "airports.dat"),
    "utf-8",
  );
  const lines = fileContent.split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = line.split(",");
    const airportId = fields[0].replace(/"/g, "");
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
  const fileContent = fs.readFileSync(
    path.join(__dirname, "routes.dat"),
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

    const key = `${sourceId}-${destId}`;
    edgeMap[key] = { source_id: sourceId, destination_id: destId, weight };
  }

  const edgesForDb = Object.values(edgeMap);
  const { error } = await supabase.from("graph_edges").insert(edgesForDb);

  if (error) {
    console.error("Insert failed:", error);
  } else {
    console.log(`Inserted ${edgesForDb.length} edges into graph_edges`);
  }
}

const airportCoords = buildAirportLookup();
buildGraphAndInsert(airportCoords);
