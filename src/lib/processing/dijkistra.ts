import * as fs from 'fs';
import * as path from 'path';
import { Coordinates } from "@/lib/types";

type Edge= {
    destination:string;
    weight:number;
  };

type Graph= Record<string, Edge[]>;

function buildAirportLookup(): Record<string, Coordinates> {
  const airportCoords: Record<string, Coordinates> = {};
  const fileContent= fs.readFileSync(path.join(__dirname, 'airports.dat'), 'utf-8');
  const lines= fileContent.split('\n');


  for (const line of lines){
    if(!line.trim()) continue;

    const fields= line.split(',');
    const airportId= fields[0].replace(/"/g, '');
    const latitude= parseFloat(fields[6]);
    const longitude= parseFloat(fields[7]);

    if (isNaN(latitude) || isNaN(longitude)) continue;
    airportCoords[airportId]= {latitude, longitude};
  }
  return airportCoords;
}

export function haversine(coord1: Coordinates, coord2:Coordinates): number{
  const rlat1= coord1.latitude * (Math.PI/180);
  const rlong1= coord1.longitude * (Math.PI/180);
  const rlat2= coord2.latitude * (Math.PI/180);
  const rlong2= coord2.longitude * (Math.PI/180);

  const diffLat= rlat1-rlat2;
  const diffLong= rlong1-rlong2;

  const a= Math.sin(diffLat/2)**2 + Math.cos(rlat1)*Math.cos(rlat2)* Math.sin(diffLong/2)**2;
  const c= 2 * Math.asin(Math.min(1,Math.sqrt(a)));
  const distance= 6371 *c;

  return distance;

}

function buildGraph(airportCoords:Record<string, Coordinates>){
  const fileContent= fs.readFileSync(path.join(__dirname, 'routes.dat'), 'utf-8');
  const lines= fileContent.split('\n');
  const graph: Graph = {};
  for (const line of lines){
    if(!line.trim()) continue;

    const fields= line.split(',');
    const sourceId= fields[3];
    const destId= fields[5];
    const stops= parseInt(fields[7]);
    const sourceCoords= airportCoords[sourceId];
    const destCoords= airportCoords[destId];

    const distance= haversine(sourceCoords, destCoords);
    const weight= distance + stops*1000;

    if(!graph[sourceId]){
      graph[sourceId]=[];
    }
    graph[sourceId].push({destination:destId, weight:weight });
  }

  return graph

}

function dijkistra(graph: Graph, source:string): Record<string, number>{
  const distances: Record<string, number> = {};
  for (const node in graph){
    distances[node]= Infinity;
  }
  distances[source]=0;

  const queue: string[]=  [source];
  const visited= new Set<string>();

  while (queue.length > 0){
    let smallestIndex=0;
    for(let i = 1; i<queue.length; i++){
      if(distances[queue[i]] < distances[queue[smallestIndex]]){
        smallestIndex= i;
      }
    }
    const currentNode= queue[smallestIndex];
    queue.splice(smallestIndex,1);

    if(visited.has(currentNode)) continue;
    visited.add(currentNode);

    const nextTo= graph[currentNode] || [];
    for(const edge of nextTo) {
      const newDist= distances[currentNode]+ edge.weight;
      if(newDist < distances[edge.destination]){
        distances[edge.destination]= newDist;
        queue.push(edge.destination);
      }
    }
  }

  return distances
  }

  const airportCoords= buildAirportLookup();
  const graph= buildGraph(airportCoords);
  const distances= dijkistra(graph, "2968");
  console.log(distances)