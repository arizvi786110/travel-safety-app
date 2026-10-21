import { Coordinates } from "@/lib/types";
import { haversine } from "@/lib/processing/dijkistra"; // confirm this matches your actual filename

type ScheduleEntry = {
  start: number;
  end: number;
  type: "getReady" | "rest" | "meal" | "activity" | "free";
  location?: Coordinates;
};

type ProposedActivity = {
  activity: { name: string; location: Coordinates };
  duration: number;
  startTime: number;
};

const assumedAvgSpeed = 30;

function findReferenceActivity(schedule: ScheduleEntry[], beforeTime: number) {
  const sorted = schedule
    .filter((e) => e.start < beforeTime)
    .sort((a, b) => b.start - a.start);

  for (const entry of sorted) {
    if (entry.type === "activity") {
      return entry;
    }
  }
  return null;
}

function estimateTravelTimeHrs(from: Coordinates, to: Coordinates): number {
  const distanceKm = haversine(from, to);
  return distanceKm / assumedAvgSpeed;
}

export function initialiseSchedule(
  sleepBlock: ScheduleEntry,
  getReadyBlock: ScheduleEntry,
  mealBlock: ScheduleEntry[],
  restBlock: ScheduleEntry[]
): ScheduleEntry[] {
  const occupiedBlock: ScheduleEntry[] = [sleepBlock, getReadyBlock, ...mealBlock, ...restBlock];
  occupiedBlock.sort((a, b) => a.start - b.start);

  const schedule: ScheduleEntry[] = [];

  for (let i = 0; i < occupiedBlock.length; i++) {
    schedule.push(occupiedBlock[i]);

    const currentEnd = occupiedBlock[i].end;
    const nextStart = i + 1 < occupiedBlock.length ? occupiedBlock[i + 1].start : 24;

    if (nextStart > currentEnd) {
      schedule.push({ start: currentEnd, end: nextStart, type: "free" });
    }
  }
  return schedule;
}

export function checkFeasibility(
  schedule: ScheduleEntry[],
  proposedActivity: ProposedActivity
): { success: boolean; schedule?: ScheduleEntry[]; error?: string } {
  const { activity, duration, startTime } = proposedActivity;

  const referenceActivity = findReferenceActivity(schedule, startTime);
  let travelTime: number;

  if (referenceActivity && referenceActivity.location) {
    travelTime = estimateTravelTimeHrs(referenceActivity.location, activity.location);
  } else {
    travelTime = 0;
  }

  const requestStart = startTime;
  const requestEnd = startTime + travelTime + duration;

  const matchingFreeRangeIndex = schedule.findIndex(
    (range) =>
      range.type === "free" &&
      range.start <= requestStart &&
      range.end >= requestEnd
  );

  if (matchingFreeRangeIndex === -1) {
    return { success: false, error: "No matching free time slot available for this placement" };
  }

  const matchingFreeRange = schedule[matchingFreeRangeIndex];
  const newSchedule = [...schedule];
  newSchedule.splice(matchingFreeRangeIndex, 1);

  const newEntries: ScheduleEntry[] = [];
  if (matchingFreeRange.start < requestStart) {
    newEntries.push({ start: matchingFreeRange.start, end: requestStart, type: "free" });
  }
  newEntries.push({
    start: requestStart,
    end: requestEnd,
    type: "activity",
    location: activity.location,
  });
  if (requestEnd < matchingFreeRange.end) {
    newEntries.push({ start: requestEnd, end: matchingFreeRange.end, type: "free" });
  }

  newSchedule.splice(matchingFreeRangeIndex, 0, ...newEntries);
  newSchedule.sort((a, b) => a.start - b.start);

  return { success: true, schedule: newSchedule };
}