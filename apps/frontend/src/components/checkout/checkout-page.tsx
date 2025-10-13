"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardBody, Button, Spinner, Divider } from "@heroui/react";
import { CheckIcon, ArrowLeftIcon } from "@heroicons/react/24/solid";
import { useAuth } from "@/providers/auth-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { type CreemProduct, formatPrice } from "@/lib/creem";

interface CheckoutPageProps {
  product: CreemProduct;
}

export default function CheckoutPage({ product }: CheckoutPageProps) {
  const { status, user, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);

  // Determine selected interval for display (defaults to monthly, then yearly, then one-time)
  const selectedInterval = useMemo(() => {
    const p = (searchParams?.get('interval') || '').toLowerCase();
    if (p === 'yearly' && product.pricing.yearly) return 'yearly' as const;
    if (p === 'onetime' && product.pricing.oneTime) return 'onetime' as const;
    if (product.pricing.monthly) return 'monthly' as const;
    if (product.pricing.yearly) return 'yearly' as const;
    return 'onetime' as const;
  }, [searchParams, product.pricing]);

  useEffect(() => {
    if (status === "authenticated") {
      const timer = window.setTimeout(() => {
        setIsLoading(false);
      }, 2000);
      return () => window.clearTimeout(timer);
    }
    if (status === "unauthenticated") {
      setIsLoading(false);
    }
  }, [status]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a0f2e] via-[#0a0a0a] to-[#000000] overflow-hidden relative flex items-center justify-center">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-[#6d28d9]/40 to-[#ec4899]/20 blur-[120px]" />
          <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#3b82f6]/10 to-[#8b5cf6]/30 blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full bg-gradient-to-r from-[#a855f7]/5 to-[#d946ef]/5 blur-[150px]" />
        </div>
        <div className="text-center relative z-10">
          <Spinner size="lg" color="primary" className="mb-4" />
          <p className="text-white/80">Preparing your checkout...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a0f2e] via-[#0a0a0a] to-[#000000] overflow-hidden relative flex items-center justify-center">
        <div className="text-center relative z-10 space-y-4 p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
          <h1 className="text-2xl font-semibold text-white">Sign in to continue</h1>
          <p className="text-white/70 max-w-sm">
            Please log in to complete your purchase and manage your subscription.
          </p>
          <Button
            radius="sm"
            className="bg-white text-black font-semibold"
            onPress={() => {
              void login({ returnTo: typeof window !== "undefined" ? window.location.href : undefined });
            }}
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0f2e] via-[#0a0a0a] to-[#000000] overflow-hidden relative py-12">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-[#6d28d9]/40 to-[#ec4899]/20 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#3b82f6]/10 to-[#8b5cf6]/30 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full bg-gradient-to-r from-[#a855f7]/5 to-[#d946ef]/5 blur-[150px]" />
      </div>
      <div className="max-w-2xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Button
            variant="light"
            startContent={<ArrowLeftIcon className="w-4 h-4 text-white" />}
            onPress={() => router.back()}
            className="mb-4 text-white hover:bg-white/10"
          >
            Back to Pricing
          </Button>
          <h1 className="text-3xl font-bold text-white mb-2">Complete Your Purchase</h1>
          <p className="text-white/70">Secure checkout powered by Creem</p>
        </div>

        {/* Checkout Card */}
        <Card className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-sm shadow-2xl">
          <CardBody className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">{product.name}</h2>
                <div className="space-y-1">
                  {product.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-white/70">
                      <CheckIcon className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {selectedInterval === 'monthly' && product.pricing.monthly && formatPrice(product.pricing.monthly, product.currency)}
                  {selectedInterval === 'yearly' && product.pricing.yearly && formatPrice(product.pricing.yearly, product.currency)}
                  {selectedInterval === 'onetime' && product.pricing.oneTime && formatPrice(product.pricing.oneTime, product.currency)}
                </div>
                <div className="text-sm text-white/60">
                  {selectedInterval === 'monthly' && "/month"}
                  {selectedInterval === 'yearly' && "/year"}
                  {selectedInterval === 'onetime' && "one-time"}
                </div>
              </div>
            </div>

            <Divider className="mb-6" />

            {/* Customer Info */}
            <div className="mb-6">
              <h3 className="font-medium text-white mb-3">Account Information</h3>
              <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <p className="text-sm text-white/60">Signed in as</p>
                <p className="font-medium text-white">{user?.email}</p>
              </div>
            </div>

            {/* Creem Checkout Placeholder */}
            <div className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center mb-6">
              <div className="text-white/60 mb-4">
                <div className="w-16 h-16 bg-white/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                  💳
                </div>
                <p className="font-medium mb-2 text-white">Creem Checkout Widget</p>
                <p className="text-sm">
                  This is where the actual Creem checkout widget would appear.
                  <br />
                  It would handle payment methods, VAT collection, and processing.
                </p>
              </div>
            </div>

            {/* Trust Signals */}
            <div className="flex items-center justify-center gap-6 text-sm text-white/60">
              <div className="flex items-center gap-1">
                🔒 Secure SSL
              </div>
              <div className="flex items-center gap-1">
                💳 All Cards Accepted
              </div>
              <div className="flex items-center gap-1">
                🛡️ Money Back Guarantee
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Additional Info */}
        <div className="text-center mt-8 text-sm text-white/60">
          <p>By completing this purchase, you agree to our <span className="text-white underline">Terms of Service</span> and <span className="text-white underline">Privacy Policy</span>.</p>
          <p className="mt-2">Need help? Contact our support team at <span className="text-white">support@girlgenerator.ai</span></p>
        </div>
      </div>
    </div>
  );
}
