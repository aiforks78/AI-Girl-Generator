import React from "react";
import FAQClientWrapper from "../faq-client";
import { ChevronDown } from "lucide-react";
import Script from "next/script";
import Link from "next/link";

const faqs: Array<{ question: string; answer: React.ReactNode; answerText: string }> = [
  {
    question: "Which AI models power Girl Generator?",
    answer: "Girl Generator blends a curated mix of starter, premium, and max-tier diffusion models for images, plus dedicated remix and video engines for advanced workflows. The free tier focuses on the core starter model so you can test the pipeline before upgrading.",
    answerText: "Girl Generator blends a curated mix of starter, premium, and max-tier diffusion models for images, plus dedicated remix and video engines for advanced workflows. The free tier focuses on the core starter model so you can test the pipeline before upgrading.",
  },
  {
    question: "How much does Girl Generator cost to use?",
    answer: (
      <>
        Girl Generator uses transparent pay-as-you-go credits with no hidden fees. You review the exact cost before confirming a generation, so there are no surprise tiers or credit traps. Check our{" "}
        <Link href="/pricing" className="link-primary" title="View detailed pricing plans">
          pricing page
        </Link>{" "}
        for detailed plans.
      </>
    ),
    answerText: "Girl Generator uses transparent pay-as-you-go credits with no hidden fees. You review the exact cost before confirming a generation, so there are no surprise tiers or credit traps. Check our pricing page for detailed plans.",
  },
  {
    question: "Can I use Girl Generator images commercially?",
    answer: "Yes. Paid plans provide watermark-free downloads, and each generation is logged in your account so you have a usage record for licensing purposes.",
    answerText: "Yes. Paid plans provide watermark-free downloads, and each generation is logged in your account so you have a usage record for licensing purposes.",
  },
  {
    question: "Can Girl Generator create diverse lifestyle scenes?",
    answer: (
      <>
        Absolutely. Once you lock in your hero portrait, our{" "}
        <Link href="/image-to-image" className="link-primary" title="Explore lifestyle scene variations">
          image-to-image workflow
        </Link>{" "}
        lets you remix outfits, lighting, and camera angles while preserving identity. You can combine prompts with reference photos or inspiration boards to steer each lifestyle scene.
      </>
    ),
    answerText: "Absolutely. Once you lock in your hero portrait, our image-to-image workflow lets you remix outfits, lighting, and camera angles while preserving identity. You can combine prompts with reference photos or inspiration boards to steer each lifestyle scene.",
  },
  {
    question: "Do I need complex prompts for Girl Generator?",
    answer: "No. Describe your concept in plain English and our AI girl generator tooling expands it with guardrailed prompt engineering behind the scenes, keeping results consistent without prompt gymnastics.",
    answerText: "No. Describe your concept in plain English and our AI girl generator tooling expands it with guardrailed prompt engineering behind the scenes, keeping results consistent without prompt gymnastics.",
  },
  {
    question: "What video features does Girl Generator offer?",
    answer: (
      <>
        Girl Generator converts stills into 8-second cinematic clips sized for social platforms with our{" "}
        <Link href="/image-to-video" className="link-primary" title="Try our image to video generator">
          image to video generator
        </Link>
        . You can stack multiple renders in your editor to build longer narratives.
      </>
    ),
    answerText: "Girl Generator converts stills into 8-second cinematic clips sized for social platforms with our image to video generator. You can stack multiple renders in your editor to build longer narratives.",
  },
  {
    question: "How fast is Girl Generator compared to other AI girl generators?",
    answer: (
      <>
        Portrait generations usually complete in under a minute with our{" "}
        <Link href="/text-to-image" className="link-primary" title="Try our text to image generator">
          text to image generator
        </Link>
        , and{" "}
        <Link href="/image-to-video" className="link-primary" title="Convert images to videos">
          video upgrades
        </Link>{" "}
        generally add another minute depending on queue load. Actual timing can vary based on traffic and the size of your batch.
      </>
    ),
    answerText: "Portrait generations usually complete in under a minute with our text to image generator, and video upgrades generally add another minute depending on queue load. Actual timing can vary based on traffic and the size of your batch.",
  },
  {
    question: "Is Girl Generator safe and secure to use?",
    answer: "Girl Generator applies enterprise-grade encryption, secure payments, and moderation pipelines to guard your data and outputs throughout the generation process.",
    answerText: "Girl Generator applies enterprise-grade encryption, secure payments, and moderation pipelines to guard your data and outputs throughout the generation process.",
  },
  {
    question: "What file formats does Girl Generator support?",
    answer: (
      <>
        You can export PNG or JPG stills up to 2K resolution with our{" "}
        <Link href="/text-to-image" className="link-primary" title="Generate high-quality images">
          image generators
        </Link>
        , plus MP4 clips optimized for major social platforms. Every asset is ready for multi-device publishing straight away.
      </>
    ),
    answerText: "You can export PNG or JPG stills up to 2K resolution with our image generators, plus MP4 clips optimized for major social platforms. Every asset is ready for multi-device publishing straight away.",
  },
];

export default function FAQ() {
  // Generate JSON-LD structured data for FAQ
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answerText
      }
    }))
  };

  return (
    <>
      {/* Add structured data for Google */}
      <Script
        id="faq-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <section className="relative py-24 bg-gradient-to-b from-gray-900 via-slate-900 to-black overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-purple-600/10 to-pink-600/5 blur-[80px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-gradient-to-tr from-blue-600/10 to-cyan-600/5 blur-[60px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Girl Generator FAQ</span>
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Everything you need to know about Girl Generator - the ultimate AI girl generator. Get answers about creating photorealistic AI girls with our advanced girl generator platform.
          </p>
        </div>

        {/* FAQ Items */}
        <FAQClientWrapper>
          <div className="space-y-4" itemScope itemType="https://schema.org/FAQPage">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300"
                itemScope
                itemProp="mainEntity"
                itemType="https://schema.org/Question"
              >
                <summary className="flex items-center justify-between p-8 cursor-pointer list-none hover:bg-white/[0.02] transition-colors duration-200">
                  <h3
                    className="text-xl font-semibold text-white pr-4"
                    itemProp="name"
                  >
                    {faq.question}
                  </h3>
                  <div className="flex-shrink-0">
                    <ChevronDown className="w-6 h-6 text-white/60 group-open:rotate-180 transition-transform duration-300" />
                  </div>
                </summary>

                <div
                  className="px-8 pb-8 pt-0"
                  itemScope
                  itemProp="acceptedAnswer"
                  itemType="https://schema.org/Answer"
                >
                  <div className="border-t border-white/10 pt-6">
                    <p
                      className="text-white/70 leading-relaxed text-lg"
                      itemProp="text"
                    >
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </FAQClientWrapper>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-col items-center gap-4 bg-gradient-to-br from-white/5 to-white/10 border border-white/20 rounded-2xl px-8 py-6 backdrop-blur-sm">
            <div className="text-white font-semibold text-lg">
              Still have questions about Girl Generator?
            </div>
            <p className="text-white/60 text-sm max-w-md">
              Reach out to our support team for workflow tips, licensing guidance, or help choosing the right credits plan.
            </p>
            <div className="flex items-center justify-center mt-2">
              <a
                href="mailto:support@girlgenerator.net"
                className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors duration-200"
              >
                📧 Email Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}
