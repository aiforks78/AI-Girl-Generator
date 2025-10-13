export const metadata = {
  title: "Contact – Girl Generator",
  description: "Contact the Girl Generator team for support, partnership or media inquiries. We usually reply within 24 hours.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 md:px-6 py-16 md:py-24 text-white">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-6">Contact Us</h1>
      <p className="text-white/70 text-lg mb-12">
        Have questions or need assistance? We're here to help! Reach out to us through any of the methods below.
      </p>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <section className="bg-white/5 rounded-lg p-6 border border-white/10">
          <h2 className="text-2xl font-semibold mb-4 text-white">Email Support</h2>
          <p className="text-white/70 mb-4">
            For general inquiries, technical support, or billing questions:
          </p>
          <a
            href="mailto:support@girlgenerator.net"
            className="text-purple-300 hover:text-purple-200 underline text-lg font-medium"
          >
            support@girlgenerator.net
          </a>
          <p className="text-white/60 text-sm mt-4">
            We typically respond within 24-48 hours during business days.
          </p>
        </section>

        <section className="bg-white/5 rounded-lg p-6 border border-white/10">
          <h2 className="text-2xl font-semibold mb-4 text-white">Business Inquiries</h2>
          <p className="text-white/70 mb-4">
            For partnerships, press, or business opportunities:
          </p>
          <a
            href="mailto:business@girlgenerator.net"
            className="text-purple-300 hover:text-purple-200 underline text-lg font-medium"
          >
            business@girlgenerator.net
          </a>
        </section>
      </div>

      <section className="bg-white/5 rounded-lg p-8 border border-white/10 mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-white">Frequently Asked Questions</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">How do I reset my password?</h3>
            <p className="text-white/70">
              You can reset your password from the login page by clicking "Forgot Password" and following the instructions sent to your email.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">How does the credit system work?</h3>
            <p className="text-white/70">
              Credits are used to generate images and videos. Each generation type consumes a different amount of credits. You can purchase credits or subscribe to a plan for monthly credits.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Can I get a refund?</h3>
            <p className="text-white/70">
              Please see our{' '}
              <a href="/refund" className="text-purple-300 hover:text-purple-200 underline">
                Refund Policy
              </a>{' '}
              for detailed information about refund eligibility and how to request one.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Do you offer API access?</h3>
            <p className="text-white/70">
              API access is currently in development. Please contact us at{' '}
              <a href="mailto:business@girlgenerator.net" className="text-purple-300 hover:text-purple-200 underline">
                business@girlgenerator.net
              </a>{' '}
              to express your interest and we'll notify you when it becomes available.
            </p>
          </div>
        </div>
      </section>

      <section className="text-center">
        <h2 className="text-2xl font-semibold mb-4 text-white">Need More Help?</h2>
        <p className="text-white/70 mb-6">
          Check out our documentation and guides, or reach out directly through email.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/privacy"
            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 transition-colors"
          >
            Privacy Policy
          </a>
          <a
            href="/terms"
            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 transition-colors"
          >
            Terms of Service
          </a>
          <a
            href="/refund"
            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 transition-colors"
          >
            Refund Policy
          </a>
        </div>
      </section>
    </main>
  );
}
