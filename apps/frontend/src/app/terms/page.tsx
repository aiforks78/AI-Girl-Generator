export const metadata = {
  title: 'Terms of Service – Girl Generator',
  description: 'Read the terms that govern the use of Girl Generator.',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 pt-24 md:pt-28 pb-16 text-white">
      <h1 className="text-4xl md:text-5xl font-extrabold">Terms of Service</h1>
      <p className="mt-2 mb-8 text-sm text-white/60">Effective Date: January 1, 2025</p>

      <div className="text-white/80 leading-relaxed space-y-8">
        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">1. Acceptance of Terms</h2>
          <p className="mb-5 leading-8">
            By accessing and using Girl Generator ("the Service"), you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">2. Description of Service</h2>
          <p className="mb-5 leading-8">
            Girl Generator is an AI-powered platform that allows users to generate images and videos using artificial intelligence models.
            The Service includes text-to-image, image-to-image, and image-to-video generation capabilities.
          </p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">3. User Account</h2>
          <p className="mb-5 leading-8">
            The Service is intended for individuals who are at least 18 years old (or the age of majority in your jurisdiction, if higher). By creating an account, you represent that you meet this requirement. Accounts created by or on behalf of minors are subject to immediate suspension.
          </p>
          <p className="mb-5 leading-8">
            To use certain features of the Service, you must create an account. You are responsible for:
          </p>
          <ul className="list-disc ml-6 space-y-2 mb-5">
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized use</li>
          </ul>
          <p className="leading-8">
            If you engage in revenue-sharing programs, affiliate payouts, or other commercial collaborations offered through Girl Generator or its partners, you agree to comply with any Know Your Customer (KYC), Anti-Money Laundering (AML), tax reporting, or identity verification procedures mandated by Creem or applicable financial institutions. Failure to complete required verification may result in delayed or withheld disbursements and/or account suspension.
          </p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">4. Credits, Billing, and Refunds</h2>
          <p className="mb-5 leading-8">
            Girl Generator operates on a credit-based model with optional subscriptions. Payments, recurring charges, and dispute handling are processed by our payment facilitator, Creem, Inc. (“Creem”). By purchasing credits or subscribing, you authorize Creem to charge your selected payment method on our behalf and agree that all payment disputes will be resolved under Creem’s billing policies in addition to these Terms.
          </p>
          <p className="mb-5 leading-8">
            You understand and agree that:
          </p>
          <ul className="list-disc ml-6 space-y-2 mb-5">
            <li>Your card or bank statement will display charges as <strong className="text-white">“CREEM*GIRL GENERATOR”</strong> (or similar regional descriptor supplied by Creem).</li>
            <li>Subscriptions renew automatically at the interval you select until you cancel. Cancel at least 24 hours before the next renewal to avoid additional charges. Cancellation takes effect at the end of the current billing period.</li>
            <li>We may apply sales tax, VAT, GST, or other applicable taxes as determined by your billing address. Prices may be displayed in your local currency; If conversion is required, Creem or your bank sets the exchange rate.</li>
            <li>Credits purchased directly from us do not expire but are non-transferable and have no cash value. Promo credits may carry additional restrictions disclosed at issuance.</li>
            <li>If a generation fails due to platform error and no usable output is produced, we will automatically restore the consumed credits. If the issue persists, contact <a href="mailto:support@girlgenerator.net" className="text-purple-300 hover:text-purple-200 underline">support@girlgenerator.net</a> for manual review.</li>
          </ul>
          <p className="mb-5 leading-8">
            Refund requests are governed by our <a href="/refund" className="text-purple-300 hover:text-purple-200 underline">Refund Policy</a> and Creem’s dispute timelines. Filing a chargeback or payment dispute without first contacting us may lead to account suspension. We reserve the right to decline refunds for accounts that violate these Terms or abuse the credit system. For more information on refunds, failures, or contested charges, submit a support ticket via email or through the in-product help center; Creem may require supporting documentation to review the case.</p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">5. Acceptable Use &amp; Prohibited Content</h2>
          <p className="mb-5 leading-8">
            Girl Generator is designed for respectful, non-NSFW creative work. You agree that you will not use the Service to generate, upload, request, or distribute any content that:
          </p>
          <ul className="list-disc ml-6 space-y-2 mb-5">
            <li>Contains nudity, explicit sexual activity, fetish content, or promotes commercial sexual services</li>
            <li>Depicts, sexualizes, or places minors (real, fictional, or implied) in suggestive or exploitative scenarios</li>
            <li>Encourages sexual violence, revenge porn, stalking, harassment, or non-consensual intimate imagery</li>
            <li>Includes graphic self-harm, extreme gore, or otherwise poses a significant risk to personal safety</li>
            <li>Violates any law, infringes intellectual property rights, or facilitates fraud, impersonation, or scams</li>
            <li>Attempts to bypass our safety filters, moderation systems, credit metering, or rate limits</li>
          </ul>
          <p className="mb-4 leading-8">
            We employ automated safety filters, human review, and abuse detection tooling to block or flag disallowed prompts, uploads, or generations. When we detect violations we may:
          </p>
          <ul className="list-disc ml-6 space-y-2 mb-5">
            <li>Immediately stop the generation and remove the associated assets</li>
            <li>Issue warnings, temporarily suspend features, or place the account under manual review</li>
            <li>Terminate accounts that engage in repeat, severe, or intentional violations</li>
          </ul>
          <p className="leading-8">
            Users who believe a moderation action was taken in error may contact <a href="mailto:support@girlgenerator.net" className="text-purple-300 hover:text-purple-200 underline">support@girlgenerator.net</a> to request a review. Appeals are handled by a dedicated trust and safety reviewer within five business days. Reinstated accounts remain subject to heightened monitoring; repeated or egregious violations will result in permanent bans without refund.
          </p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">6. Content Ownership &amp; Rights</h2>
          <p className="mb-5 leading-8">
            You retain ownership of the content you upload or generate while using the Service. By submitting any text, images, reference materials, or other assets, you represent and warrant that you have obtained all necessary permissions, licenses, and consents (including copyright, likeness, location, and property releases) required to lawfully use such materials with Girl Generator.
          </p>
          <p className="mb-5 leading-8">
            You may not upload, request, or distribute content that impersonates, deepfakes, or otherwise depicts a real person—alive or deceased—without that person’s explicit consent. This includes attempting to recreate celebrities, public figures, or private individuals in ways that could mislead, defame, or violate their privacy or publicity rights. You also agree not to use the Service to fabricate events, credentials, or statements that could deceive or harm others.
          </p>
          <p className="mb-5 leading-8">
            By using the Service, you grant Girl Generator a limited, worldwide, non-exclusive, royalty-free license to host, process, transcode, display (solely in publicly accessible galleries that you expressly opt into), and analyze your content for the purposes of operating, improving, and safeguarding the Service. We do not sell, resell, or commercially exploit user content independent of these purposes. To protect the platform, we may retain copies of moderated or reported content for evidence, compliance, and safety auditing.
          </p>
          <p className="mb-5 leading-8">
            You are solely responsible for how you use the outputs generated by the Service. You agree not to employ them for harassment, impersonation, disinformation, election interference, defamation, invasion of privacy, or other unlawful activities. If we receive a credible claim that content you generated infringes intellectual property, likeness, or other protected rights, we may remove or disable access to the disputed material, suspend the associated account, and notify you of the claim. Repeated or egregious offenses can result in permanent account termination without refund.
          </p>
          <p className="leading-8">
            Rights holders or affected individuals can report suspected infringement or unauthorized use by emailing <a href="mailto:legal@girlgenerator.net" className="text-purple-300 hover:text-purple-200 underline">legal@girlgenerator.net</a>. We will investigate, preserve relevant records, and cooperate with legitimate legal processes, including sharing generation metadata when required by law. Appeals must include supporting documentation; resolved appeals may lead to reinstatement, but restored accounts remain subject to further monitoring.
          </p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">7. DMCA Notice &amp; Repeat Infringer Policy</h2>
          <p className="mb-5 leading-8">
            Girl Generator respects the intellectual property rights of others and expects the same from our users. We have adopted the following policy in compliance with the U.S. Digital Millennium Copyright Act (DMCA). If you believe that content available through the Service infringes your copyright, please submit a written notice to our designated DMCA agent:
          </p>
          <div className="mb-5 leading-8 text-white/80">
            <p className="font-semibold">Designated Agent</p>
            <p>Girl Generator Inc.<br />Attn: DMCA Agent<br />548 Market Street PMB 62937<br />San Francisco, CA 94104-5401<br />United States</p>
            <p>Email: <a href="mailto:dmca@girlgenerator.net" className="text-purple-300 hover:text-purple-200 underline">dmca@girlgenerator.net</a></p>
          </div>
          <p className="mb-4 leading-8">
            Your DMCA notification must include the following information (17 U.S.C. §512(c)(3)):
          </p>
          <ul className="list-disc ml-6 space-y-2 mb-5">
            <li>A physical or electronic signature of the copyright owner or a person authorized to act on their behalf</li>
            <li>Identification of the copyrighted work claimed to have been infringed, or a representative list if multiple works are covered</li>
            <li>Identification of the material that is claimed to be infringing, including the URL or other specific location within the Service</li>
            <li>Your contact information, including name, mailing address, telephone number, and email address</li>
            <li>A statement that you have a good-faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law</li>
            <li>A statement, under penalty of perjury, that the information in the notice is accurate and that you are authorized to act on behalf of the copyright owner</li>
          </ul>
          <p className="mb-4 leading-8">
            If we remove or disable access to content in response to a valid notice, we will make a good-faith attempt to notify the user who posted it. That user may submit a counter-notification pursuant to 17 U.S.C. §512(g)(3) that must include:
          </p>
          <ul className="list-disc ml-6 space-y-2 mb-5">
            <li>Their physical or electronic signature</li>
            <li>Identification of the material that has been removed or to which access has been disabled, and the location at which the material appeared before it was removed or access disabled</li>
            <li>A statement under penalty of perjury that they have a good-faith belief the material was removed or disabled as a result of mistake or misidentification</li>
            <li>Their name, address, telephone number, and a statement that they consent to the jurisdiction of the Federal District Court for the judicial district in which their address is located (or, if outside the United States, that they consent to jurisdiction in any United States judicial district in which Girl Generator may be found) and that they will accept service of process from the person who provided the original notification or their agent</li>
          </ul>
          <p className="leading-8">
            Upon receipt of a valid counter-notification, we may restore the material in 10 business days unless the original complainant files an action seeking a court order to restrain the user from engaging in the infringing activity. In accordance with the DMCA and other applicable laws, Girl Generator enforces a policy of terminating, in appropriate circumstances and at our sole discretion, users deemed to be repeat infringers. We also retain the discretion to limit access to the Service and/or terminate the accounts of any users who infringe the intellectual property rights of others, whether or not there is repeat infringement.
          </p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">8. Intellectual Property</h2>
          <p className="mb-5 leading-8">
            The Service, including its design, features, and underlying technology, is protected by intellectual property laws.
            You may not copy, modify, distribute, or reverse engineer any part of the Service.
          </p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">9. Disclaimer of Warranties</h2>
          <p className="mb-5 leading-8">
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. We do not guarantee:
          </p>
          <ul className="list-disc ml-6 space-y-2 mb-5">
            <li>Uninterrupted or error-free operation</li>
            <li>The accuracy or quality of generated content</li>
            <li>That the Service will meet your specific requirements</li>
          </ul>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">10. Limitation of Liability</h2>
          <p className="mb-5 leading-8">
            To the maximum extent permitted by law, Girl Generator shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages arising from your use of the Service.
          </p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">11. Termination</h2>
          <p className="mb-5 leading-8">
            We reserve the right to suspend or terminate your account at any time for:
          </p>
          <ul className="list-disc ml-6 space-y-2 mb-5">
            <li>Violation of these Terms of Service</li>
            <li>Fraudulent or illegal activity</li>
            <li>Extended period of inactivity</li>
          </ul>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">12. Governing Law, Dispute Resolution &amp; Force Majeure</h2>
          <p className="mb-5 leading-8">
            These Terms and any dispute or claim arising out of or relating to them, the Service, or our relationship with you shall be governed by and construed in accordance with the laws of the Hong Kong Special Administrative Region of the People’s Republic of China, without regard to its conflict of law principles. If you are accessing the Service from a jurisdiction that requires a different governing law, relevant consumer protection laws will prevail only to the minimum extent mandated by local legislation.
          </p>
          <p className="mb-5 leading-8">
            The parties will first attempt to resolve any dispute amicably through good-faith negotiations within thirty (30) days from the date either party provides written notice of the dispute. If the dispute cannot be resolved within that period, it shall be submitted to binding arbitration administered by the Shenzhen Court of International Arbitration (SCIA) in accordance with its then-current rules. The arbitration will be conducted in English, before a single arbitrator appointed under the SCIA rules, and the arbitral award may be enforced in any court having jurisdiction. Notwithstanding the foregoing, either party may seek temporary or preliminary injunctive relief in any court of competent jurisdiction to protect its rights pending final resolution.
          </p>
          <p className="mb-5 leading-8">
            Each provision of these Terms operates separately. If any provision is found unenforceable, the remaining provisions will remain in full force and effect, and the unenforceable provision will be interpreted to the maximum extent permissible. Failure to enforce any right or provision will not constitute a waiver of that right or provision.
          </p>
          <p className="leading-8">
            Neither party shall be liable for any delay or failure to perform its obligations (except for payment obligations) where such delay or failure results from events beyond the party’s reasonable control, including but not limited to natural disasters, war, terrorism, labor disputes, government actions, utility failures, or widespread internet outages (“Force Majeure Event”). The affected party will use commercially reasonable efforts to mitigate the impact and resume performance as soon as practicable.
          </p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">13. Changes to Terms</h2>
          <p className="mb-5 leading-8">
            We may update these Terms of Service from time to time. We will notify you of any material changes by
            posting the new terms on this page and updating the "Effective Date" above.
          </p>
        </section>

        <section>
          <h2 className="mt-10 mb-4 text-2xl md:text-3xl font-semibold text-white">14. Contact Us</h2>
          <p className="mb-5 leading-8">
            If you have any questions about these Terms of Service, please contact us at{' '}
            <a href="mailto:support@girlgenerator.net" className="text-purple-300 hover:text-purple-200 underline">
              support@girlgenerator.net
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
