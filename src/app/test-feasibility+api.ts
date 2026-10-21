import { checkFeasibility } from "@/lib/processing/itineraryBuilder";

export async function POST(request: Request) {
  const body = await request.json();
  const { schedule, proposedActivity } = body;

  if (!schedule || !proposedActivity) {
    return new Response(
      JSON.stringify({ error: "Missing schedule or proposedActivity" }),
      { status: 400 },
    );
  }

  try {
    const result = checkFeasibility(schedule, proposedActivity);
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
}
