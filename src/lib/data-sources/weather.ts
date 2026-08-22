export async function getWeather(latitude:number, longitude:number){
    const response= await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code&timezone=auto`)
    const data = await response.json()
    console.log(data)
    return data
}