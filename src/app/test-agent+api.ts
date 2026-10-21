import { runAgent } from "@/lib/agent/agent";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query");
  const authHeader = request.headers.get("Authorization") ?? undefined;
  const token = authHeader?.replace("Bearer ", "") ?? null;

  if (!query) {
    return new Response(JSON.stringify({ error: "Missing query param" }), {
      status: 400,
    });
  }

  const result = await runAgent(query, token, []);
  return new Response(JSON.stringify(result), { status: 200 });
}
