import {
    checkFeasibility,
    initialiseSchedule,
} from "@/lib/processing/itineraryBuilder";

export async function GET() {
  const sleepBlock = { start: 0, end: 8, type: "getReady" as const };
  const getReadyBlock = { start: 8, end: 10, type: "getReady" as const };
  const mealBlocks = [
    { start: 13, end: 14, type: "meal" as const },
    { start: 19, end: 20, type: "meal" as const },
  ];
  const restBlocks = [{ start: 15, end: 16, type: "rest" as const }];

  const schedule = initialiseSchedule(
    sleepBlock,
    getReadyBlock,
    mealBlocks,
    restBlocks,
  );

  const attempt1 = checkFeasibility(schedule, {
    activity: {
      name: "City Museum",
      location: { latitude: 51.5074, longitude: -0.1278 },
    },
    duration: 2,
    startTime: 10,
  });

  // Riverside Park — a different location, placed after the museum
  const attempt2 = checkFeasibility(attempt1.schedule ?? schedule, {
    activity: {
      name: "Riverside Park",
      location: { latitude: 51.501, longitude: -0.1419 },
    },
    duration: 1.5,
    startTime: 16.5,
  });

  return new Response(
    JSON.stringify({ initialSchedule: schedule, attempt1, attempt2 }),
    { status: 200 },
  );
}
