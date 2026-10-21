const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function getLocationInfo(city: string, authToken?: string) {
  const response = await fetch(
    `${API_URL}/location_detail?city=${encodeURIComponent(city)}`,
    { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} },
  );

  if (response.status === 200) return await response.json();
  if (response.status === 400) return { error: "Missing city name" };
  if (response.status === 401) return { error: "The user needs to be signed in to look up a new destination" };
  if (response.status === 404) return { error: `No information found for "${city}"` };
  return { error: "Something went wrong fetching location info" };
}

export async function findFlightRoute(source: string, destination: string) {
  const response = await fetch(
    `${API_URL}/flight-search?from=${encodeURIComponent(source)}&to=${encodeURIComponent(destination)}`,
  );

  if (response.status === 200) return await response.json();
  if (response.status === 400) return { error: "Missing departure or arrival city" };
  if (response.status === 404) {
    const body = await response.json().catch(() => null);
    return { error: body?.error ?? "No airport found for one of those cities" };
  }
  return { error: "Something went wrong finding a route" };
}

export async function manageFavourites(
  action: "view" | "add" | "remove",
  authToken: string,
  location_id?: number,
  season?: string,
) {
  const headers = {
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "application/json",
  };
  const url = `${API_URL}/favourites-api`;

  if (action === "view") {
    const response = await fetch(url, { headers });
    if (response.status === 200) return await response.json();
    if (response.status === 401) return { error: "You need to be logged in to view favourites" };
    return { error: "Something went wrong fetching favourites" };
  }

  if (action === "add") {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ location_id, season: season ?? "now" }),
    });
    if (response.status === 200) return await response.json();
    if (response.status === 401) return { error: "You need to be logged in to add favourites" };
    if (response.status === 400) return { error: "Missing location or season" };
    return { error: "Something went wrong adding that favourite" };
  }

  if (action === "remove") {
    const response = await fetch(url, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ location_id, season }),
    });
    if (response.status === 200) return await response.json();
    if (response.status === 401) return { error: "You need to be logged in to remove a favourite" };
    if (response.status === 400) return { error: "Missing location" };
    return { error: "Something went wrong removing that favourite" };
  }

  return { error: "Unknown favourites action" };
}

export async function getGoingAnywaysInfo(city: string) {
  const response = await fetch(`${API_URL}/ImGoingAnyway?city=${encodeURIComponent(city)}`);

  if (response.status === 200) return await response.json();
  if (response.status === 400) return { error: "Missing city name" };
  if (response.status === 404) return { error: `No information found for "${city}"` };
  return { error: "Something went wrong fetching location info" };
}