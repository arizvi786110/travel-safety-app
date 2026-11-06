export type ThemeName =
  | "city"
  | "beach"
  | "mountainous"
  | "desert"
  | "forest"
  | "historic"
  | "countryside"
  | "food"
  | "islands"
  | "religious"
  | "roadtrips"
  | "snowy"
  | "wildlife"
  | "waterfalls"
  | "adventure";

export const themeImages: Record<ThemeName, number> = {
  city: require("../../assets/images/themes/city.jpg"),
  beach: require("../../assets/images/themes/beach.jpg"),
  mountainous: require("../../assets/images/themes/mountainous.jpg"),
  desert: require("../../assets/images/themes/desert.jpg"),
  forest: require("../../assets/images/themes/forest.jpg"),
  historic: require("../../assets/images/themes/historic.jpg"),
  countryside: require("../../assets/images/themes/countryside.jpg"),
  food: require("../../assets/images/themes/food-and-markets.jpg"),
  islands: require("../../assets/images/themes/islands.jpg"),
  religious: require("../../assets/images/themes/religious-places.jpg"),
  roadtrips: require("../../assets/images/themes/roadtrips.jpg"),
  snowy: require("../../assets/images/themes/snowy.jpg"),
  wildlife: require("../../assets/images/themes/wildlife.jpg"),
  waterfalls: require("../../assets/images/themes/waterfalls.jpg"),
  adventure: require("../../assets/images/themes/adventure.jpg"),
};
export function themeImage(theme?: string | null) {
  return themeImages[theme as ThemeName] ?? themeImages.city;
}

export const heroImages = {
  home: require("../../assets/images/homescreen.jpg"),
  explore: require("../../assets/images/chatbot.jpg"),
  assistant: require("../../assets/images/chatbot.jpg"),
  auth: require("../../assets/images/homescreen.jpg"),
  reset: require("../../assets/images/password-reset.jpg"),
  welcome: require("../../assets/images/startScreen.jpg"),
  signIn: require("../../assets/images/signInsignUp.jpg"),
  savedItineraries: require("../../assets/images/saved-itineraries.jpg"),
  flightPlanner: require("../../assets/images/flightPlanner.jpg"),
};
