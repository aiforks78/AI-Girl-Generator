import PricingPage from "@/components/price/pricing-page";

export const metadata = {
  title: "Pricing Plans – Girl Generator AI",
  description: "Compare Girl Generator plans: free daily credits, Pro HD upscales, commercial license, team seats & priority support. Pick the AI girl generator plan for you.",
  alternates: {
    canonical: "/pricing",
  },
  keywords: "AI pricing, portrait generator pricing, subscription plans, credit packs, AI art pricing",
  openGraph: {
    title: "Pricing Plans – Girl Generator AI",
    description: "Flexible pricing for AI-generated portraits. Free tier available, premium plans starting at $19.90/month.",
    type: "website",
    images: [
      {
        url: "/og/pricing.jpg",
        width: 1200,
        height: 630,
        alt: "Girl Generator Pricing Plans",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing Plans – Girl Generator AI",
    description: "Flexible pricing for AI-generated portraits. Free tier available, premium plans starting at $19.90/month.",
    images: [
      {
        url: "/og/pricing.jpg",
        alt: "Girl Generator Pricing Plans",
      },
    ],
  },
};

// Structured Data for Pricing (valid schema.org Offer list)
const structuredData = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Girl Generator AI Subscription",
  description: "AI-powered portrait generation service with multiple subscription tiers",
  brand: {
    "@type": "Brand",
    name: "Girl Generator"
  },
  offers: [
    {
      "@type": "Offer",
      name: "Free Plan",
      price: "0",
      priceCurrency: "USD",
      description: "10 credits per day, 720p resolution with watermark",
      availability: "https://schema.org/InStock"
    },
    {
      "@type": "Offer",
      name: "Member Plan (Monthly)",
      price: "29.90",
      priceCurrency: "USD",
      description: "300 credits per month, 4K resolution, no watermarks",
      availability: "https://schema.org/InStock"
    },
    {
      "@type": "Offer",
      name: "Member Plan (Yearly)",
      price: "238.80",
      priceCurrency: "USD",
      description: "Yearly billing, 20% discount vs monthly",
      availability: "https://schema.org/InStock"
    }
  ]
};

// FAQ Structured Data for rich snippets
const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Can I change or cancel my subscription?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, you can upgrade, downgrade, or cancel your subscription at any time. Changes take effect at the start of your next billing cycle."
      }
    },
    {
      "@type": "Question",
      "name": "What happens to unused credits?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "For subscription plans, unused credits roll over to the next month (up to 2x your monthly allocation). Credit packs never expire."
      }
    },
    {
      "@type": "Question",
      "name": "Do you offer refunds?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We offer a 7-day money-back guarantee for subscription plans. Credit pack purchases are final once credits are used."
      }
    },
    {
      "@type": "Question",
      "name": "Can I use generated images commercially?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes! All paid plans include commercial usage rights. Free plan images are for personal use only."
      }
    },
    {
      "@type": "Question",
      "name": "What payment methods do you accept?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We accept all major credit cards, PayPal, Apple Pay, Google Pay, and various local payment methods via our secure payment processor."
      }
    }
  ]
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <PricingPage />
    </>
  );
}
