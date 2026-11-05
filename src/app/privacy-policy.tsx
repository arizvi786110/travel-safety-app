import LegalPage from "@/components/LegalPage";

const CONTACT = "rizviaalia7861@gmail.com";

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="October 2026"
      intro="SafePath is operated by Aalia Rizvi, who is responsible for the personal data described in this policy. You can contact her at the email address at the bottom of this page."
      sections={[
        {
          heading: "What we collect",
          body: [
            "Account details: your email address and a password (stored securely hashed by our authentication provider, never in plain text).",
            "Your content: favourites, saved itineraries, your home country setting, and the messages you send to the assistant.",
            "We do not collect your precise device location, contacts or photos.",
          ],
        },
        {
          heading: "How we use it",
          body: [
            "To sign you in, save your trips and settings, show relevant safety information, and answer your questions in the assistant. We do not sell your data and do not use it for advertising.",
          ],
        },
        {
          heading: "Services that process data",
          body: [
            "Supabase stores your account and saved data. Your assistant messages are sent to an AI model provider to generate replies. Destination names and travel dates you search may be sent to news, weather, maps/places and flight-price providers to fetch results. These providers process data under their own policies.",
          ],
        },
        {
          heading: "Retention",
          body: [
            "We keep your data while your account exists. You can delete your account at any time from Profile → Delete account, which permanently removes your account, favourites, saved itineraries and settings.",
          ],
        },
        {
          heading: "Your rights",
          body: [
            "You can delete your account yourself in the app. For anything else (access or correction), contact us.",
          ],
        },
        {
          heading: "Security",
          body: [
            "Data is sent over encrypted connections and access is restricted, but no system is perfectly secure.",
          ],
        },
        {
          heading: "Children",
          body: ["SafePath is not intended for children under 13."],
        },
        {
          heading: "Contact",
          body: [`Privacy questions or requests: ${CONTACT}`],
        },
      ]}
    />
  );
}
