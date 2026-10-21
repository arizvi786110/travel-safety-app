import LegalPage from "@/components/LegalPage";

export default function Terms() {
  return (
    <LegalPage
      title="Terms & Conditions"
      updated="October 2026"
      sections={[
        {
          heading: "About this app",
          body: "This is a personal portfolio project built by [your name]. By creating an account or using the app you agree to these terms.",
        },
        {
          heading: "Safety information is a guide, not advice",
          body: "Safety ratings are generated automatically from news articles using keyword and sentiment analysis. They can be incomplete, out of date or wrong, and a missing rating does not mean a place is safe. Always check official government travel advice (for example the UK FCDO) and arrange travel insurance before you travel. You are responsible for your own travel decisions.",
        },
        {
          heading: "Your account",
          body: "Keep your sign-in details private and use an email address you control. You are responsible for activity on your account.",
        },
        {
          heading: "Acceptable use",
          body: "Do not misuse the app: no attempts to break it, overload it, scrape it, or access other people's data.",
        },
        {
          heading: "Third-party data",
          body: "Weather, news and place information come from third-party services (Open-Meteo, Perigon, Google Places). We do not guarantee their accuracy or availability.",
        },
        {
          heading: "Availability",
          body: "The app is provided as is. As a personal project it may change, break, or be taken down at any time.",
        },
        {
          heading: "Liability",
          body: "To the extent the law allows, we are not liable for loss or harm arising from your reliance on the app. Nothing in these terms limits liability that cannot be limited by law, including for death or personal injury caused by negligence, or for fraud.",
        },
        {
          heading: "Changes and governing law",
          body: "We may update these terms and will change the date above when we do. These terms are governed by the laws of England and Wales. Contact: [your email].",
        },
      ]}
    />
  );
}