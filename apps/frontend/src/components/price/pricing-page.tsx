"use client";

import React from "react";
import { Button, Card, CardBody, CardHeader, Chip } from "@heroui/react";
import { CheckIcon, StarIcon, SparklesIcon } from "@heroicons/react/24/solid";
import { FrequencyEnum } from "./pricing-types";
import CreemCheckoutButton from "./creem-checkout-button";
import PriceComparison from "./price-comparison";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0f2e] via-[#0a0a0a] to-[#000000] overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-[#6d28d9]/40 to-[#ec4899]/20 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#3b82f6]/10 to-[#8b5cf6]/30 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full bg-gradient-to-r from-[#a855f7]/5 to-[#d946ef]/5 blur-[150px]" />
      </div>

      {/* Hero Section */}
      <div className="relative z-10 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-[#a855f7] to-[#ec4899] bg-clip-text text-transparent mb-6">
              AI Girl Generator Pricing Plans
            </h1>
            <p className="text-xl text-white/60 max-w-3xl mx-auto mb-12 font-light">
              Unlock the power of AI-generated portraits with our flexible pricing plans.
              From casual creators to professional studios.
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-white">
          Choose Your Plan
        </h2>
        <PricingOptionsSection />
        <PriceComparison />
        <TrustSignals />
        <FAQSection />
      </div>
    </div>
  );
}

function PricingOptionsSection() {
  const pricingOptions = [
    {
      id: "free",
      title: "Free",
      description: "Perfect for getting started",
      price: "$0",
      period: "",
      features: [
        "6 credits per day",
        "Text-to-Image: Core starter model",
        "720p max resolution",
        "Watermarked downloads",
        "Standard queue",
        "Prompt history"
      ],
      buttonText: "Start Free",
      href: "/auth/signin?callbackUrl=%2F",
      isButton: true,
      popular: false
    },
    {
      id: "member",
      title: "Member",
      description: "Best value for creators",
      price: "$14.9",
      originalPrice: "$29.9",
      period: "/month",
      features: [
        "800 credits per month",
        "Text-to-Image: Includes premium & max tiers",
        "Image-to-Image: Includes enhanced stylizers",
        "Image-to-Video: Includes fast & pro generators",
        "1080p & 2K downloads",
        "No watermarks",
        "Priority queue",
        "Prompt history"
      ],
      buttonText: "Upgrade to Member",
      popular: true,
      isButton: false,
      productId: "gg-tier-member"
    },
    {
      id: "credits-600",
      title: "600 Credits",
      description: "One-time credit pack",
      price: "$19",
      originalPrice: "$30",
      period: "",
      isLimitedTime: true,
      features: [
        "Credits never expire",
        "All generation types",
        "Instant activation",
        "Text-to-Image: Includes premium & max tiers",
        "Image-to-Image: Includes enhanced stylizers",
        "Image-to-Video: Includes fast & pro generators",
        "1080p & 2K downloads",
        "No watermarks"
      ],
      buttonText: "Buy Credits",
      popular: false,
      isButton: false,
      productId: "gg-pack-600"
    }
  ];

  return (
    <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16 pt-8">
      {pricingOptions.map((option) => (
        <div key={option.id} className="relative">
          {option.popular && !(option as any).isLimitedTime && (
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-50">
              <Chip
                color="secondary"
                variant="solid"
                startContent={<StarIcon className="w-4 h-4" />}
                className="px-4 py-2 bg-gradient-to-r from-[#a855f7] to-[#ec4899] text-white font-medium"
              >
                Most Popular
              </Chip>
            </div>
          )}
          {(option as any).isLimitedTime && (
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-50">
              <div className="flex flex-col items-center gap-1">
                {option.popular && (
                  <Chip
                    color="secondary"
                    variant="solid"
                    startContent={<StarIcon className="w-3 h-3" />}
                    className="px-3 py-1 bg-gradient-to-r from-[#a855f7] to-[#ec4899] text-white text-xs font-medium"
                  >
                    Most Popular
                  </Chip>
                )}
                <Chip
                  color="danger"
                  variant="solid"
                  className="px-4 py-2 bg-gradient-to-r from-[#ef4444] to-[#dc2626] text-white font-medium"
                >
                  Limited Time {option.id === 'member' ? '50% OFF' : '37% OFF'}
                </Chip>
              </div>
            </div>
          )}
          <Card
            className={`bg-gradient-to-br from-white/5 to-white/[0.02] border ${
              option.popular
                ? "border-2 border-[#a855f7] shadow-2xl"
                : "border-white/10"
            } backdrop-blur-sm hover:border-white/20 transition-all duration-300 group hover:scale-105`}
          >

          <CardHeader className="text-center pb-4 pt-8">
            <div className="w-full">
              <h3 className="text-2xl font-bold text-white mb-2">{option.title}</h3>
              <p className="text-white/70 mb-4">{option.description}</p>
              <div className="flex items-center justify-center gap-2">
                {(option as any).originalPrice && (
                  <span className="text-lg text-white/40 line-through mr-2">
                    {(option as any).originalPrice}
                  </span>
                )}
                <span className="text-4xl font-bold text-white">
                  {option.price}
                </span>
                <span className="text-white/60">
                  {option.period}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardBody className="pt-2">
            <ul className="space-y-3 mb-8">
              {option.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckIcon className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-white/80 text-left">{feature}</span>
                </li>
              ))}
            </ul>

            {option.isButton ? (
              <Button
                as="a"
                href={option.href}
                variant="bordered"
                size="lg"
                className="w-full font-semibold bg-transparent border-white/20 text-white hover:bg-white/10 hover:border-white/40 transition-all duration-300"
                startContent={<SparklesIcon className="w-5 h-5" />}
              >
                {option.buttonText}
              </Button>
            ) : (
              <CreemCheckoutButton
                productId={option.productId as any}
                interval={option.id === "credits-600" ? FrequencyEnum.OneTime : FrequencyEnum.Monthly}
                variant="solid"
                color="primary"
                size="lg"
                className="w-full font-semibold bg-gradient-to-r from-[#a855f7] to-[#ec4899] hover:from-[#9333ea] hover:to-[#db2777] border-0 transition-all duration-300 text-white"
              >
                {option.buttonText}
              </CreemCheckoutButton>
            )}
          </CardBody>
          </Card>
        </div>
      ))}
    </div>
  );
}

function TrustSignals() {
  return (
    <div className="mt-24 text-center">
      <p className="text-white/50 mb-8">Engineered for production-grade AI workflows</p>
      <div className="flex items-center justify-center gap-8 text-white/40">
        <div className="text-sm font-medium">🔒 Secure Payments</div>
        <div className="text-sm font-medium">⚡ GPU-Powered</div>
        <div className="text-sm font-medium">🌍 Global CDN</div>
        <div className="text-sm font-medium">📧 24/7 Support</div>
      </div>
    </div>
  );
}

function FAQSection() {
  const faqs = [
    {
      question: "Can I change or cancel my subscription?",
      answer: "Yes, you can upgrade, downgrade, or cancel your subscription at any time. Changes take effect at the start of your next billing cycle."
    },
    {
      question: "What happens to unused credits?",
      answer: "For subscription plans, unused credits roll over to the next month (up to 2x your monthly allocation). Credit packs never expire."
    },
    {
      question: "Do you offer refunds?",
      answer: "We offer a 7-day money-back guarantee for subscription plans. Credit pack purchases are final once credits are used."
    },
    {
      question: "Can I use generated images commercially?",
      answer: "Yes! All paid plans include commercial usage rights. Free plan images are for personal use only."
    },
    {
      question: "What payment methods do you accept?",
      answer: "All payments are processed securely by Creem. You can pay with major credit or debit cards, and—where supported—digital wallets like Apple Pay or Google Pay."
    }
  ];

  return (
    <div className="mt-24 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-12 text-white">Frequently Asked Questions</h2>
      <div className="space-y-6">
        {faqs.map((faq, index) => (
          <Card key={index} className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-sm">
            <CardBody className="p-6">
              <h3 className="font-semibold text-lg mb-3 text-white">
                {faq.question}
              </h3>
              <p className="text-white/70 leading-relaxed">
                {faq.answer}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
