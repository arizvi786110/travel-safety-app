export async function getPlaces(latitude:number,longitude:number, radius: number, includedTypes:string[], maxResultCount:number){

    const headers: Headers = new Headers()
    headers.set('Content-Type', 'application/json')
    const apiKey = process.env.GOOGLE_PLACE_API_KEY
    if (!apiKey) throw new Error('Environment variable GOOGLE_PLACE_API_KEY is not set')
    headers.set('X-Goog-Api-Key', apiKey)
    headers.set('X-Goog-FieldMask', 'places.displayName, places.location')

    const request: RequestInfo= new Request('https://places.googleapis.com/v1/places:searchNearby',{
        method: 'POST',
        headers:headers,
        body: JSON.stringify({
            locationRestriction:{
                circle:{
                    center:{
                        latitude: latitude,
                        longitude: longitude,
                    },
                    radius:radius,
                }
            },
            includedTypes: includedTypes,
            maxResultCount: maxResultCount })
    })
    const response= await fetch(request)
    const data = await response.json()
    console.log(data)
    return data
}