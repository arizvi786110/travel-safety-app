import { getPlaces } from "@/lib/data-sources/places";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = url.searchParams.get("latitude");
  const longitude = url.searchParams.get("longitude");
  const radius = url.searchParams.get("radius");
  const categoriesParam = url.searchParams.get("categories");

  if (!latitude || !longitude || !radius || !categoriesParam) {
    return new Response(
      JSON.stringify({ error: "Missing required parameters" }),
      { status: 400 },
    );
  }

  const includedTypes = categoriesParam.split(",");

  try {
    const places = await getPlaces(
      Number(latitude),
      Number(longitude),
      Number(radius),
      includedTypes,
      10,
    );

    return new Response(JSON.stringify({ places }), { status: 200 });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error fetching places" }),
      { status: 500 },
    );
  }
}
