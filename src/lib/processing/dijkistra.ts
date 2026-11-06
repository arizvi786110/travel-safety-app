
import { Coordinates } from "@/lib/types";
import graphData from "./graph.json";

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

export function dijkistras(graph: Graph, source: string): Record<string, number> {
  const distances: Record<string, number> = {};
  for (const node in graph) distances[node] = Infinity;
  distances[source] = 0;

  // Min-heap of [distance, node]
  const heap: [number, string][] = [[0, source]];
  const push = (item: [number, string]) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = (): [number, string] => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };

  const visited = new Set<string>();
  while (heap.length > 0) {
    const [dist, node] = pop();
    if (visited.has(node)) continue;
    visited.add(node);
    for (const edge of graph[node] ?? []) {
      const next = dist + edge.weight;
      // Destination-only airports are not keys in the graph, so treat them as Infinity
      if (next < (distances[edge.destination] ?? Infinity)) {
        distances[edge.destination] = next;
        push([next, edge.destination]);
      }
    }
  }
  return distances;
}

let cachedGraph: Graph | null = null;

const graph: Graph = {};
for (const [source, edges] of Object.entries(graphData as unknown as Record<string, [string, number][]>)) {
  graph[source] = edges.map(([destination, weight]) => ({ destination, weight }));
}

export async function getGraph(): Promise<Graph> {
  return graph;
}