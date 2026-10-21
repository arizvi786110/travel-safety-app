import { dijkistras, getGraph } from "@/lib/processing/dijkistra";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const source = url.searchParams.get("source");
  const destination = url.searchParams.get("destination");

  if (!source || !destination) {
    return new Response(
      JSON.stringify({ error: "Missing source or destination" }),
      { status: 400 },
    );
  }

  const graph = await getGraph();

  if (!graph[source] || !graph[destination]) {
    return new Response(JSON.stringify({ error: "Airport ID not found" }), {
      status: 404,
    });
  }

  try {
    const distances = dijkistras(graph, source);
    const distanceToDestination = distances[destination];

    if (
      distanceToDestination === undefined ||
      distanceToDestination === Infinity
    ) {
      return new Response(
        JSON.stringify({ path: null, message: "No route found" }),
        { status: 200 },
      );
    }

    return new Response(JSON.stringify({ distance: distanceToDestination }), {
      status: 200,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error calculating route" }),
      { status: 500 },
    );
  }
}
