import { getPlaces } from "@/lib/data-sources/places";
import { getSafetyNews } from "@/lib/data-sources/safetyNews";
import { getWeather } from "@/lib/data-sources/weather";
import { useEffect } from "react";
import { Text, View } from "react-native";

export default function Index() {
  useEffect(() => {
    async function runTest() {
      try {
        await getWeather(51.5074, -0.1278);
        await getSafetyNews(
          "",
          "Social Issues",
          "",
          "2026-07-01",
          "",
          "Politics",
          "",
          "London",
          "Article",
        );
        await getPlaces(51.5074, -0.1278, 1000, ["restaurant", "museum"], 10);
      } catch (e) {
        console.log("ERROR", e);
      }
    }
    runTest();
  }, []);
  return (
    <View>
      <Text>Testing APIs</Text>
    </View>
  );
}
