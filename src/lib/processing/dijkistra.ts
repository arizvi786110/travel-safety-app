import { supabase } from "@/lib/auth/supabase";
import { Coordinates } from "@/lib/types";

export function haversine(coord1: Coordinates, coord2: Coordinates): number {
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
  const distance = 6371 * c;

  return distance;
}

type Edge = {
  destination: string;
  weight: number;
};

type Graph = Record<string, Edge[]>;

export function dijkistras(
  graph: Graph,
  source: string,
): Record<string, number> {
  const distances: Record<string, number> = {};
  for (const node in graph) {
    distances[node] = Infinity;
  }
  distances[source] = 0;

  const queue: string[] = [source];
  const visited = new Set<string>();

  while (queue.length > 0) {
    let smallestIndex = 0;
    for (let i = 1; i < queue.length; i++) {
      if (distances[queue[i]] < distances[queue[smallestIndex]]) {
        smallestIndex = i;
      }
    }
    const currentNode = queue[smallestIndex];
    queue.splice(smallestIndex, 1);

    if (visited.has(currentNode)) continue;
    visited.add(currentNode);

    const nextTo = graph[currentNode] || [];
    for (const edge of nextTo) {
      const newDist = distances[currentNode] + edge.weight;
      if (newDist < distances[edge.destination]) {
        distances[edge.destination] = newDist;
        queue.push(edge.destination);
      }
    }
  }

  return distances;
}

let cachedGraph: Graph | null = null;

export async function getGraph(): Promise<Graph> {
  if (cachedGraph) return cachedGraph;

  const graph: Graph = {};
  const pageSize = 1000;
  let from = 0;
  let failed = false;

  while (true) {
    const { data, error } = await supabase
      .from("graph_edges")
      .select("*")
      .order("source_id")
      .order("destination_id")
      .range(from, from + pageSize - 1);

    if (error) {
      failed = true;
      break;
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      if (!graph[row.source_id]) {
        graph[row.source_id] = [];
      }
      graph[row.source_id].push({ destination: row.destination_id, weight: row.weight });
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  if (!failed) cachedGraph = graph;
  return graph;
}
