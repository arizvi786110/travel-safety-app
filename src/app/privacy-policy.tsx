import LegalPage from "@/components/LegalPage";

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="October 2026"
      sections={[
        {
          heading: "Who we are",
          body: "This app is a personal portfolio project built by [your name]. Questions or requests about your data: [your email].",
        },
        {
          heading: "What we collect",
          body: "Your email address and password (your password is stored in hashed form by our authentication provider, so we never see it); an optional home country; destinations you save as favourites; itineraries you save; the cities you search for; and the messages you send to the chat assistant.",
        },
        {
          heading: "How we use it",
          body: "To sign you in, show your saved data, and produce safety information, weather, nearby places, flight routes and chat answers. We do not sell your data or use it for advertising.",
        },
        {
          heading: "Who processes it for us",
          body: "Supabase hosts our database and sign-in. Groq processes your chat messages to generate replies. Open-Meteo receives city names and coordinates for weather and location lookup. Perigon receives city names to find news articles. Google Places receives city coordinates to find nearby places.",
        },
        {
          heading: "Storage and security",
          body: "Your account data, favourites and itineraries are stored in Supabase until you ask us to delete them. Chat history is kept on your device during a conversation and is not saved by the app afterwards. Your sign-in session is stored in your device's secure storage, and data is sent over encrypted connections.",
        },
        {
          heading: "Your rights",
          body: "Under UK data protection law you can ask to see, correct or delete your data. There is no in-app delete button yet, so email [your email] and we will delete your account and its data.",
        },
        {
          heading: "Children",
          body: "This app is not intended for children under 13.",
        },
        {
          heading: "Changes",
          body: "If this policy changes, we will update the date above.",
        },
      ]}
    />
  );
}