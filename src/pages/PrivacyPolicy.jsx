export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#f5f0eb] py-16 px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-heading font-bold text-5xl text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-400 font-body text-sm mb-10">Last updated: May 1, 2026</p>

        {[
          {
            title: "1. Introduction",
            body: `Welcome to Virtually Dressed ("we", "our", or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our application.`,
          },
          {
            title: "2. Information We Collect",
            body: `We collect information you provide directly to us, including:
• Account information such as your name and email address.
• Body measurements and physical attributes (height, weight, body shape, skin tone, hair color) that you voluntarily enter to personalise your avatar.
• Photos you upload for avatar creation or clothing items.
• Outfits you create, save, and optionally share publicly.
• URLs or links to clothing items you add to your wardrobe.`,
          },
          {
            title: "3. How We Use Your Information",
            body: `We use the information we collect to:
• Provide, operate, and maintain the Virtually Dressed service.
• Generate and display your personalised avatar.
• Store and organise your virtual wardrobe and outfits.
• Enable community features such as publicly shared outfits.
• Improve and develop new features of the application.
• Communicate with you about updates or support.`,
          },
          {
            title: "4. Sharing of Information",
            body: `We do not sell, trade, or rent your personal information to third parties. We may share information in the following limited circumstances:
• Outfits you choose to make public will be visible to other users of the platform.
• With service providers who assist us in operating the platform, under strict confidentiality obligations.
• If required by law or to protect the rights and safety of our users.`,
          },
          {
            title: "5. Data Storage & Security",
            body: `Your data is stored securely on our platform. Photos and images you upload are stored in our cloud infrastructure. We implement industry-standard security measures to protect your information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.`,
          },
          {
            title: "6. Your Rights",
            body: `You have the right to:
• Access the personal data we hold about you.
• Correct inaccurate or incomplete data.
• Delete your account and associated data at any time from the "My Avatar" settings page.
• Withdraw consent for any optional data processing.

To exercise these rights, please contact us at the email below.`,
          },
          {
            title: "7. Cookies",
            body: `We use session cookies to keep you logged in and maintain your preferences. We do not use third-party advertising or tracking cookies.`,
          },
          {
            title: "8. Children's Privacy",
            body: `Virtually Dressed is not intended for use by anyone under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that a child has provided us with personal information, we will delete it promptly.`,
          },
          {
            title: "9. Changes to This Policy",
            body: `We may update this Privacy Policy from time to time. We will notify you of any significant changes by updating the "Last updated" date at the top of this page. Continued use of the app after changes constitutes acceptance of the updated policy.`,
          },
          {
            title: "10. Contact Us",
            body: `If you have any questions or concerns about this Privacy Policy, please contact us at:\n\nhello@virtuallydressed.app`,
          },
        ].map((section) => (
          <div key={section.title} className="mb-8">
            <h2 className="font-heading font-bold text-2xl text-gray-900 mb-3">{section.title}</h2>
            <p className="font-body text-gray-600 text-sm leading-relaxed whitespace-pre-line">{section.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}