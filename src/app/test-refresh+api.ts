import { refreshSafetyScores } from "@/lib/jobs/refresh_safetyScores";

export async function GET() {
  try {
    await refreshSafetyScores();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
}
