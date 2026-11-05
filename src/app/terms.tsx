import LegalPage from "@/components/LegalPage";

const CONTACT = "rizviaalia7861@gmail.com";

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Use"
      updated="October 2026"
      intro="SafePath is a personal project operated by Aalia Rizvi that helps you research destinations. By creating an account or using the app you agree to these terms."
      sections={[
        {
          heading: "Guidance, not guarantees",
          body: [
            "Safety scores, news summaries, weather and travel tips are automatically generated from public sources and are for general guidance only. They can be incomplete, delayed or wrong.",
            "SafePath is not a substitute for official government travel advice. Always check your government's current travel guidance before you travel, and use your own judgement.",
          ],
        },
        {
          heading: "Flights and prices",
          body: [
            "Flight routes are illustrative and use older public route data, so a suggested route may not currently be operated. Prices come from a third-party source and may change or be unavailable. SafePath does not sell tickets or take bookings.",
          ],
        },
        {
          heading: "AI assistant",
          body: [
            "The chat assistant uses an AI model. It can make mistakes, so check anything important, especially safety, health, visa and entry information, before relying on it.",
          ],
        },
        {
          heading: "Your account",
          body: [
            "You are responsible for keeping your password safe and for activity on your account. Please give a real email address and don't use the app to harm others or to attempt to disrupt or abuse the service.",
          ],
        },
        {
          heading: "Availability and changes",
          body: [
            "The app is provided as is, without warranties, and may change, be interrupted or be withdrawn at any time. We may update these terms, and continuing to use the app means you accept the updated version.",
          ],
        },
        {
          heading: "Liability",
          body: [
            "To the extent the law allows, SafePath and its creator are not liable for loss, injury or damage arising from your use of, or reliance on, information in the app. Nothing here limits liability that cannot be limited by law.",
          ],
        },
        {
          heading: "Third-party content",
          body: [
            "News, weather, place and flight information come from third-party providers and belong to them. Some photos come from Pexels contributors.",
          ],
        },
        { heading: "Contact", body: [`Questions about these terms: ${CONTACT}`] },
      ]}
    />
  );
}