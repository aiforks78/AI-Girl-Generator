export const metadata = {
  title: 'Cookie Notice – Girl Generator',
  description: 'Learn how Girl Generator uses cookies and your choices.',
  alternates: {
    canonical: '/cookies',
  },
};

export default function CookiesPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 pt-24 md:pt-28 pb-16 text-white">
      <h1 className="text-4xl md:text-5xl font-extrabold">Cookie Notice</h1>
      <p className="mt-2 mb-8 text-sm text-white/60">Effective Date: September 6, 2025</p>

      <div className="text-white/80 leading-relaxed space-y-8">
        <p className="mb-5 leading-8">
          This Cookie Notice explains how Girl Generator uses cookies and similar tracking technologies when you visit our website and use our services. By using Girl Generator, you consent to our use of cookies as described in this notice.
        </p>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">1. What Are Cookies?</h2>
          <p className="mb-5 leading-8">
            Cookies are small text files that are placed on your device (computer, smartphone, or tablet) when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners.
          </p>
          <p className="mb-5 leading-8">
            Cookies can be "session cookies" (which expire when you close your browser) or "persistent cookies" (which remain on your device until they expire or you delete them).
          </p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">2. Types of Cookies We Use</h2>

          <h3 className="mt-6 mb-2 text-lg font-semibold text-white">2.1 Strictly Necessary Cookies</h3>
          <p className="mb-5 leading-8">
            These cookies are essential for the operation of our website. They enable core functionality such as:
          </p>
          <ul className="list-disc ml-6 space-y-2 mb-5">
            <li>Authentication and account access</li>
            <li>Security and fraud prevention</li>
            <li>Remembering your login state</li>
            <li>Load balancing and system stability</li>
          </ul>
          <p className="mb-5 leading-8">
            Without these cookies, certain services you have requested cannot be provided. These cookies do not collect information for marketing purposes.
          </p>

          <h3 className="mt-6 mb-2 text-lg font-semibold text-white">2.2 Performance and Analytics Cookies</h3>
          <p className="mb-5 leading-8">
            These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. We use services like Google Analytics to:
          </p>
          <ul className="list-disc ml-6 space-y-2 mb-5">
            <li>Count the number of visitors and see how they move around the site</li>
            <li>Understand which pages are most and least popular</li>
            <li>Identify technical issues and improve site performance</li>
            <li>Track aggregate usage patterns</li>
          </ul>
          <p className="mb-5 leading-8">
            The information collected is aggregated and anonymous. We do not allow third-party analytics services to use this data for their own marketing purposes.
          </p>

          <h3 className="mt-6 mb-2 text-lg font-semibold text-white">2.3 Functionality Cookies</h3>
          <p className="mb-5 leading-8">
            These cookies allow our website to remember choices you make (such as your language preference, theme settings, or other customization) and provide enhanced, personalized features. Examples include:
          </p>
          <ul className="list-disc ml-6 space-y-2 mb-5">
            <li>Remembering your display preferences</li>
            <li>Storing your recently used prompts or settings</li>
            <li>Remembering items in your gallery view preferences</li>
          </ul>
          <p className="mb-5 leading-8">
            These cookies do not track your browsing activity on other websites.
          </p>

          <h3 className="mt-6 mb-2 text-lg font-semibold text-white">2.4 Targeting/Advertising Cookies</h3>
          <p className="mb-5 leading-8">
            Currently, Girl Generator does not use advertising cookies or engage in behavioral advertising. If this changes in the future, we will update this Cookie Notice and obtain your consent where required by law.
          </p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">3. Third-Party Cookies</h2>
          <p className="mb-5 leading-8">
            Some cookies on our site are set by third-party services that appear on our pages. These may include:
          </p>
          <ul className="list-disc ml-6 space-y-2 mb-5">
            <li><strong className="text-white">Google Analytics:</strong> For website analytics and performance monitoring</li>
            <li><strong className="text-white">Payment Processors:</strong> For secure payment processing (e.g., Stripe)</li>
            <li><strong className="text-white">Authentication Providers:</strong> For social login features (e.g., Google OAuth)</li>
          </ul>
          <p className="mb-5 leading-8">
            We do not control these third-party cookies. Please refer to the third parties' websites for more information about their cookies and how to manage them:
          </p>
          <ul className="list-disc ml-6 space-y-2 mb-5">
            <li>
              <a href="https://policies.google.com/technologies/cookies" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-purple-200 underline">
                Google Cookie Policy
              </a>
            </li>
            <li>
              <a href="https://stripe.com/cookies-policy/legal" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-purple-200 underline">
                Stripe Cookie Policy
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">4. How to Control Cookies</h2>
          <p className="mb-5 leading-8">
            You have the right to decide whether to accept or reject cookies. You can exercise your cookie preferences by:
          </p>

          <h3 className="mt-6 mb-2 text-lg font-semibold text-white">4.1 Browser Settings</h3>
          <p className="mb-5 leading-8">
            Most web browsers allow you to control cookies through their settings. You can set your browser to:
          </p>
          <ul className="list-disc ml-6 space-y-2 mb-5">
            <li>Block all cookies</li>
            <li>Block only third-party cookies</li>
            <li>Delete cookies when you close your browser</li>
            <li>Alert you when a website tries to set a cookie</li>
          </ul>
          <p className="mb-5 leading-8">
            Please note that if you choose to block all cookies, some features of Girl Generator may not function properly. Strictly necessary cookies are required for core functionality.
          </p>
          <p className="mb-5 leading-8">
            For more information on how to manage cookies in popular browsers:
          </p>
          <ul className="list-disc ml-6 space-y-2 mb-5">
            <li>
              <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-purple-200 underline">
                Google Chrome
              </a>
            </li>
            <li>
              <a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-purple-200 underline">
                Mozilla Firefox
              </a>
            </li>
            <li>
              <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-purple-200 underline">
                Safari
              </a>
            </li>
            <li>
              <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-purple-200 underline">
                Microsoft Edge
              </a>
            </li>
          </ul>

          <h3 className="mt-6 mb-2 text-lg font-semibold text-white">4.2 Opt-Out Tools</h3>
          <p className="mb-5 leading-8">
            For analytics cookies, you can opt out of Google Analytics tracking by installing the{' '}
            <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-purple-200 underline">
              Google Analytics Opt-out Browser Add-on
            </a>.
          </p>

          <h3 className="mt-6 mb-2 text-lg font-semibold text-white">4.3 Mobile Devices</h3>
          <p className="mb-5 leading-8">
            On mobile devices, you can control tracking through your device settings:
          </p>
          <ul className="list-disc ml-6 space-y-2 mb-5">
            <li><strong className="text-white">iOS:</strong> Settings → Privacy → Tracking → Allow Apps to Request to Track (toggle off)</li>
            <li><strong className="text-white">Android:</strong> Settings → Google → Ads → Opt out of Ads Personalization</li>
          </ul>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">5. Do Not Track Signals</h2>
          <p className="mb-5 leading-8">
            Some browsers incorporate a "Do Not Track" (DNT) feature. Currently, there is no industry standard for how to respond to DNT signals. Girl Generator does not currently respond to DNT signals, but we respect your privacy choices and you can control cookies as described above.
          </p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">6. Changes to This Cookie Notice</h2>
          <p className="mb-5 leading-8">
            We may update this Cookie Notice from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the updated notice on our website and updating the "Effective Date" at the top.
          </p>
          <p className="mb-5 leading-8">
            We encourage you to review this Cookie Notice periodically to stay informed about how we use cookies.
          </p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">7. Contact Us</h2>
          <p className="mb-5 leading-8">
            If you have any questions about our use of cookies or this Cookie Notice, please contact us at:
          </p>
          <p className="mb-5 leading-8">
            <strong className="text-white">Email:</strong>{' '}
            <a href="mailto:support@girlgenerator.net" className="text-purple-300 hover:text-purple-200 underline">
              support@girlgenerator.net
            </a>
          </p>
          <p className="mb-5 leading-8">
            For more information about how we handle your personal data, please see our{' '}
            <a href="/privacy" className="text-purple-300 hover:text-purple-200 underline">
              Privacy Policy
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}
