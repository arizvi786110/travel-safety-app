import { runAgent } from "@/lib/agent/agent";
import { verifySession } from "@/lib/auth/verifySession";

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY = 20;
const MAX_REQUESTS_PER_MINUTE = 10;

const recentRequests = new Map<string, number[]>();

function isRateLimited(userId: string) {
  const now = Date.now();
  const hits = (recentRequests.get(userId) ?? []).filter((t) => now - t < 60_000);
  hits.push(now);
  recentRequests.set(userId, hits);
  return hits.length > MAX_REQUESTS_PER_MINUTE;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization") ?? undefined;
  const { user, error } = await verifySession(authHeader);
  if (!user) return json({ error }, 401);

  if (isRateLimited(user.id)) {
    return json({ error: "You're sending messages too quickly. Try again in a minute." }, 429);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return json({ error: "Message must be between 1 and 1000 characters" }, 400);
  }

  const history = Array.isArray(body?.history)
    ? body.history
        .filter(
          (m: any) =>
            (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string",
        )
        .slice(-MAX_HISTORY)
        .map((m: any) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    : [];

  const token = authHeader!.replace("Bearer ", "");

  try {
    const result = await runAgent(message, token, history);
    return json(result, 200);
  } catch (err) {
    console.error("Agent error", err);
    return json({ error: "The assistant ran into a problem. Please try again." }, 500);
  }
}