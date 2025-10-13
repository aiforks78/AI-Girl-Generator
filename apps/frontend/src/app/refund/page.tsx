export const metadata = {
  title: 'Refund Policy – Girl Generator',
  description: 'Understand our refund policy and learn when you may be eligible for a refund.',
  alternates: {
    canonical: '/refund',
  },
};

export default function RefundPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 pt-24 md:pt-28 pb-16 text-white">
      <h1 className="text-4xl md:text-5xl font-extrabold">Refund Policy</h1>
      <p className="mt-2 mb-8 text-sm text-white/60">Effective Date: September 6, 2025</p>

      <div className="text-white/80 leading-relaxed space-y-8">
        <p className="mb-5 leading-8">
          We at Girl Generator want you to have a positive experience with our AI image generation service. If you are not fully satisfied with a purchase, we're here to help. This Refund Policy explains when you may be eligible for a refund and the process to request one. It forms part of our Terms of Service. By making a purchase on Girl Generator, you agree to this Refund Policy.
        </p>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">0. Payment Processing with Creem</h2>
          <p className="mb-5 leading-8">
            All payments, renewals, refunds, and dispute resolutions for Girl Generator are facilitated by Creem, Inc. (“Creem”). Charges on your statement will typically appear as <strong className="text-white">“CREEM*GIRL GENERATOR”</strong> or a localized variant. When you authorize a purchase, you acknowledge Creem’s billing terms and timelines in addition to this Refund Policy. Any refund approved by us will be issued through Creem back to your original payment method; depending on your bank, it can take up to 5–10 business days to settle.
          </p>
          <p className="leading-8">
            If you have questions about a transaction, contact us first at <a href="mailto:support@girlgenerator.net" className="text-purple-300 hover:text-purple-200 underline">support@girlgenerator.net</a>. Filing a chargeback or dispute with your bank before we review the case may delay resolution and can result in account suspension until the investigation is complete.
          </p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">1. Subscription Purchases</h2>

          <h3 className="mt-6 mb-2 text-lg font-semibold text-white">1.1 Free Trials</h3>
          <p className="mb-5 leading-8">
            If you started with a free trial and decided not to continue, make sure to cancel before the trial ends to avoid being charged. Charges incurred due to not canceling in time are generally not refundable. We send reminders before trial conversion when possible.
          </p>

          <h3 className="mt-6 mb-2 text-lg font-semibold text-white">1.2 General Non-Refundable Principle</h3>
          <p className="mb-5 leading-8">
            Payments for Girl Generator subscriptions are generally non-refundable once the subscription term has begun. We base this on industry practice that digital services delivered immediately are not returnable. However, we offer some exceptions (see below) to ensure fairness and legal compliance.
          </p>

          <h3 className="mt-6 mb-2 text-lg font-semibold text-white">1.3 7-Day Satisfaction Guarantee (New Subscribers)</h3>
          <p className="mb-5 leading-8">
            If you are a first-time subscriber and are unsatisfied, you may request a refund of your initial subscription fee within 7 days of purchase. To qualify:
          </p>
          <ul className="list-disc ml-6 space-y-2 mb-5">
            <li>You must be a new user or first-time subscriber of the paid plan (renewals and repeat subscribers don't qualify for this one-time guarantee).</li>
            <li>You have used no more than 50 credits or equivalent generation units in that period. (Using a substantial portion of your plan indicates satisfaction, so we limit refund eligibility to those who used the service only minimally.)</li>
            <li>You submit a refund request to us within 7 days of the charge (see Section 4 on how to request).</li>
          </ul>
          <p className="mb-5 leading-8">
            If these conditions are met, we will honor the refund request, no questions asked.
          </p>

          <h3 className="mt-6 mb-2 text-lg font-semibold text-white">1.4 Auto-Renewal Charges</h3>
          <p className="mb-5 leading-8">
            Subscriptions renew automatically through Creem at the end of each term until you cancel at least 24 hours before the renewal time. Renewals are generally not refundable once processed. If an annual plan renews unintentionally and you notify us within 7 days without using any additional credits, we may submit a courtesy refund request to Creem; approval is not guaranteed. Monthly renewals are not refundable after the billing date, but you can disable future renewals immediately from your account settings.
          </p>

          <h3 className="mt-6 mb-2 text-lg font-semibold text-white">1.5 Downgrades and Upgrades</h3>
          <p className="mb-5 leading-8">
            If you upgrade your subscription, charges for the upgrade are not refundable (since you get immediate benefit). If you downgrade, the change takes effect next billing cycle, and no refund is given for the current cycle (you retain higher tier access until term ends).
          </p>

          <h3 className="mt-6 mb-2 text-lg font-semibold text-white">1.6 Promotional Discounts</h3>
          <p className="mb-5 leading-8">
            If you received a promotional price or bonus credits and then receive a refund, Creem may reverse the promotion and we reserve the right to deduct the value of the used bonus credits or adjust the refund amount accordingly.
          </p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">2. Credit Packs and One-Time Purchases</h2>

          <h3 className="mt-6 mb-2 text-lg font-semibold text-white">2.1 Credit Packages</h3>
          <p className="mb-5 leading-8">
            If you purchase one-time credit packs (for generating images beyond subscription allotments), those are considered consumed at purchase. Unused credits from one-time purchases are generally non-refundable. An exception is if you purchased credits by mistake (e.g., accidentally bought the wrong package) and have not used any of those credits, and you contact us within 7 days, we can refund that purchase by removing the credits from your account.
          </p>

          <h3 className="mt-6 mb-2 text-lg font-semibold text-white">2.2 In-App Purchases (Mobile)</h3>
          <p className="mb-5 leading-8">
            Purchases made through the Apple App Store, Google Play, or other app platforms are subject to the store's refund policies. We cannot directly process refunds for purchases made through third-party app stores. To request a refund for an in-app purchase, you will need to request it via the respective store (Apple or Google). We can assist by providing information, but the decision is up to the store. Note: App stores often have strict criteria for refunds.
          </p>

          <h3 className="mt-6 mb-2 text-lg font-semibold text-white">2.3 Generation Failures</h3>
          <p className="mb-5 leading-8">
            If a generation task fails due to a system error on our side, the corresponding credits will be automatically returned to your account balance. If you believe a refund was missed, contact support and we will investigate and correct any discrepancy.
          </p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">3. Exceptional Circumstances</h2>

          <h3 className="mt-6 mb-2 text-lg font-semibold text-white">3.1 Service Outages or Errors</h3>
          <p className="mb-5 leading-8">
            If a technical issue on our side (server downtime, bugs) significantly prevented you from using the service you paid for, please reach out. We may extend your subscription or issue partial refunds/credits as appropriate. For example, if our service was down for several days in a month, we might credit you those days on your next cycle or extend your term. For failed generations caused by system errors, see Section 2.3 (automatic credit returns).
          </p>

          <h3 className="mt-6 mb-2 text-lg font-semibold text-white">3.2 Duplicate Charges</h3>
          <p className="mb-5 leading-8">
            If you were mistakenly charged twice or charged an incorrect amount, we will rectify it. This can happen if there was a payment processing error. Please notify us with proof, and we will refund any duplicate/erroneous charges promptly.
          </p>

          <h3 className="mt-6 mb-2 text-lg font-semibold text-white">3.3 Violation of Terms</h3>
          <p className="mb-5 leading-8">
            If your account is terminated due to violating our Terms of Service, you will not be entitled to a refund. This is because we had to end service due to misconduct. Similarly, if you engaged in fraudulent or abusive activities, no refund will be granted (and such cases may be reported to payment processors or authorities).
          </p>

          <h3 className="mt-6 mb-2 text-lg font-semibold text-white">3.4 Chargebacks</h3>
          <p className="mb-5 leading-8">
            Initiating a chargeback with your bank or credit card without contacting us first is considered a last resort. We encourage you to contact us to resolve any billing issues. If we receive a chargeback, we reserve the right to suspend your account during the dispute process (since a chargeback indicates an unsettled payment). We also reserve the right to contest unjustified chargebacks. False or fraudulent chargebacks may result in account termination and ineligibility for future use.
          </p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">4. How to Request a Refund or Report a Dispute</h2>
          <p className="mb-5 leading-8">
            To request a refund or contest a charge, follow the steps below so we can evaluate and process your case efficiently before it escalates with Creem or your payment provider:
          </p>
          <ol className="list-decimal ml-6 space-y-2 mb-5">
            <li>
              <strong className="text-white">Contact Support First:</strong> Email us at{' '}
              <a href="mailto:support@girlgenerator.net" className="text-purple-300 hover:text-purple-200 underline">
                support@girlgenerator.net
              </a>{' '}
              or submit a ticket through the in-product Help Center with the subject "Refund Request – Order #XXXX". Include your account email, purchase date, order ID/transaction ID, and a brief description of the issue.
            </li>
            <li>
              <strong className="text-white">Provide Evidence:</strong> Attach relevant screenshots (e.g., failed generation logs, duplicate charges, credit usage) and, if applicable, Creem’s receipt email. For App Store/Play Store purchases, include the platform receipt so we can direct you to the appropriate channel.
            </li>
            <li>
              <strong className="text-white">Allow Review Time:</strong> Our trust and billing team will respond within 3 business days. We may request additional details or logs to reproduce the issue. If your claim qualifies, we will submit the refund to Creem for processing and confirm once the gateway issues the reversal.
            </li>
          </ol>
          <p className="mb-5 leading-8">
            Approved refunds are returned to the original payment method through Creem. Depending on your bank or card issuer, the credit can take 5–10 business days to appear. If the refund is declined, we will explain why (common reasons include requests outside the eligible window, substantial usage of the plan, or account violations). Even if denied, you retain access to paid features for the remainder of the billing period unless your account was terminated for cause.
          </p>

          <h3 className="mt-6 mb-2 text-lg font-semibold text-white">4.1 Chargebacks &amp; Disputes</h3>
          <p className="mb-5 leading-8">
            Filing a chargeback through your bank or card issuer before contacting us may delay resolution and will trigger an automatic account hold while Creem investigates. Creem requires documentary evidence for disputes; if you receive a dispute inquiry, respond promptly with the requested materials. Failure to respond can result in the dispute being resolved against you, and repeated chargebacks may lead to permanent account bans under our repeat violator policy.
          </p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">5. Refund of Charges in Different Currencies</h2>
          <p className="mb-5 leading-8">
            Purchases might be charged in various currencies depending on your location. Refunds will be issued through Creem in the same currency as the original charge. Any differences caused by exchange rates, bank handling fees, or settlement timing are outside our control and are your responsibility.
          </p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">6. Policy on Platform-Specific Subscriptions</h2>
          <p className="mb-5 leading-8">
            If you subscribed via a specific platform (web vs. mobile app), the refund typically must be processed through that platform:
          </p>
          <ul className="list-disc ml-6 space-y-2 mb-5">
            <li><strong className="text-white">Website Subscriptions:</strong> Covered directly by this policy (contact us).</li>
            <li><strong className="text-white">Apple App Store Subscriptions:</strong> Apple handles refunds for in-app subscriptions. You should request via Apple support (as per their App Store refund procedures). Apple's decisions are outside our control, but you can contact us for documentation if needed.</li>
            <li><strong className="text-white">Google Play Subscriptions:</strong> Similar to Apple, Google Play may handle those refunds. Check the Google Play refund process.</li>
          </ul>
          <p className="mb-5 leading-8">
            We will do our best to assist or guide you, but ultimately the store's policy applies for in-app purchases.
          </p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">7. Changes to This Refund Policy</h2>
          <p className="mb-5 leading-8">
            We may update this Refund Policy occasionally (for example, to adjust time frames or conditions). We will notify users of significant changes by posting an update on our site or via email. The Effective Date above will always indicate the latest revision. Your continued use of Girl Generator after changes signifies acceptance of the revised policy for new purchases.
          </p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">8. Contact Us</h2>
          <p className="mb-5 leading-8">
            If you have questions about this Refund Policy or your eligibility, please contact us at{' '}
            <a href="mailto:support@girlgenerator.net" className="text-purple-300 hover:text-purple-200 underline">
              support@girlgenerator.net
            </a>
            . We're here to help and want to ensure you feel confident in your purchases with Girl Generator.
          </p>
        </section>
      </div>
    </main>
  );
}
