import { getPlaces } from "@/lib/data-sources/places";
import { Coordinates } from "@/lib/types";
import { get, request } from "http";
import { haversine } from "@/lib/processing/dijkistra"; 
const availablePlaces = [
  { name: "City Museum", location: { latitude: 51.5074, longitude: -0.1278 }, category: "history" },
  { name: "Riverside Park", location: { latitude: 51.5010, longitude: -0.1419 }, category: "outdoor" },
  { name: "Old Town Market", location: { latitude: 51.5155, longitude: -0.0922 }, category: "food" },
];


const numberOfDays= 5;
const maxActivitiesPerDay=3

type ScheduleEntry= {
    start: number;
    end: number;
    type: "getReady" | "rest" | "meal" | "activity" | "free";
    location?: Coordinates;
}
function initialiseSchedule(sleepBlock: ScheduleEntry, getReadyBlock: ScheduleEntry, mealBlock:ScheduleEntry[], restBlock:ScheduleEntry[]):ScheduleEntry[]{
    const occupiedBlock: ScheduleEntry[]= [
        sleepBlock,
        getReadyBlock,
        ...mealBlock,
        ...restBlock,
    ];

    occupiedBlock.sort((a, b) => a.start-b.start);

    const schedule: ScheduleEntry[]= [];

    for( let i=0; i< occupiedBlock.length; i++){
        schedule.push(occupiedBlock[i]);

        const currentEnd= occupiedBlock[i].end;
        const nextStart = i+1 < occupiedBlock.length ? occupiedBlock[i+1].start :24;

        if(nextStart > currentEnd) {
            schedule.push({start: currentEnd, end:nextStart, type:"free"});
        }
    }
    return schedule;
}

const testAttempts= [
    { activity: availablePlaces[0], duration: 2, startTime: 10 },
    { activity: availablePlaces[1], duration: 1.5, startTime: 16.5 },
]

function findReferenceActivity(schedule: ScheduleEntry[], beforeTime: number){
    const sorted= schedule
    .filter(e => e.start<beforeTime)
    .sort((a, b) => b.start - a.start);

    for(const entry of sorted){
        if(entry.type == "activity"){
            return entry;
        }
    }
    return null;
}

const assumedAvgSpeed= 30;

function estimateTravelTimeHrs(from: Coordinates, to: Coordinates){
    const distanceKm= haversine(from, to);
    return distanceKm/assumedAvgSpeed;
}
for (let i = 1; i<=numberOfDays; i++){
    let daysConfirmed= false;
    let activitiesPlacedToday= 0;

    const sleepBlock: ScheduleEntry = { start: 0, end: 8, type: "getReady" }; // TODO: add a real "sleep" type to the union later
    const getReadyBlock: ScheduleEntry = { start: 8, end: 10, type: "getReady" }; // includes 1hr travel buffer folded in
    const restBlocks: ScheduleEntry[] = [{ start: 15, end: 16, type: "rest" }];
    const mealBlocks: ScheduleEntry[] = [
        { start: 13, end: 14, type: "meal" },
        { start: 19, end: 20, type: "meal" },
    ];

    let schedule: ScheduleEntry[]= initialiseSchedule(sleepBlock,getReadyBlock, mealBlocks, restBlocks );

    let attemptsIndex=0;

    while(!daysConfirmed && activitiesPlacedToday < maxActivitiesPerDay){
        if(attemptsIndex >= testAttempts.length){
            daysConfirmed=true;
            break;
        }
        let placedSuccessfully= false;
        let cachedTravelTime: number | null= null;

        const attempt= testAttempts[attemptsIndex];
        const chosenActivity= attempt.activity;
        const chosenDuraction= attempt.duration;
        const chosenStartTime= attempt.startTime;

        while(!placedSuccessfully){
            if(cachedTravelTime=== null){
                const referenceActivity= findReferenceActivity(schedule, chosenStartTime);
                if(referenceActivity && referenceActivity.location){
                    cachedTravelTime=0.25;
                }else{
                    cachedTravelTime=0;
                }
            }
            const requestStart= chosenStartTime;
            const requestEnd= chosenStartTime + cachedTravelTime+chosenDuraction;
            const  matchingFreeRangeIndex= schedule.findIndex(
                range =>
                    range.type === "free" &&
                range.start <= requestStart &&
                range.end >= requestEnd
            );

            if(matchingFreeRangeIndex !== -1){
                const matchingFreeRange= schedule[matchingFreeRangeIndex];
                schedule.splice(matchingFreeRangeIndex, 1);

                const newEntries: ScheduleEntry[]=[];
                if(matchingFreeRange.start < requestStart){
                    newEntries.push({start:matchingFreeRange.start, end:requestStart, type:"free"})
                }
                newEntries.push({
                    start:requestStart,
                    end: requestEnd,
                    type: "activity",
                    location: chosenActivity.location,
                });
                if(requestEnd< matchingFreeRange.end){
                    newEntries.push({start: requestEnd, end: matchingFreeRange.end,  type: "free"});
                }
                
                schedule.splice(matchingFreeRangeIndex, 0, ...newEntries);
                schedule.sort((a,b)=> a.start- b.start);

                placedSuccessfully=true;
                activitiesPlacedToday++;
            }else{
                console.log('invalid placement for ${chosenActivity.name} at ${requestStart}');
                placedSuccessfully=true
            }
        }
        attemptsIndex++;
    }
    console.log(`Day ${i} final schedule:`, schedule);
}
