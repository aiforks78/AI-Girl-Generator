"use client";

import React, { useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { CreditCardIcon } from "@heroicons/react/24/solid";
import { toast } from "sonner";
import { initializeCreemCheckout, type CreemProductId } from "@/lib/creem";
import { useAuth } from "@/providers/auth-provider";
import { FrequencyEnum } from "@/components/price/pricing-types";

interface CreemCheckoutButtonProps {
  productId: CreemProductId;
  children: React.ReactNode;
  variant?: "solid" | "bordered" | "flat";
  color?: "primary" | "secondary" | "success" | "warning" | "danger" | "default";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  interval?: FrequencyEnum.Monthly | FrequencyEnum.Yearly | FrequencyEnum.OneTime;
}

export default function CreemCheckoutButton({
  productId,
  children,
  variant = "solid",
  color = "primary",
  size = "lg",
  className = "",
  disabled = false,
  interval,
}: CreemCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user, login } = useAuth();

  const handleCheckout = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);

    try {
      // If user is not logged in and it's not a free plan, redirect to login
      if (!user && productId !== 'gg-tier-free') {
        await login({ returnTo: typeof window !== "undefined" ? window.location.href : undefined });
        setIsLoading(false);
        return;
      }

      // Initialize Creem checkout
      const checkoutResult = await initializeCreemCheckout({
        productId,
        customerId: user?.id,
        successUrl: `${window.location.origin}/checkout/success`,
        cancelUrl: `${window.location.origin}/pricing`,
        interval,
        metadata: {
          userId: user?.id,
          userEmail: user?.email,
        },
      });

      // Redirect to checkout URL (in real implementation, this would open Creem modal)
      if (checkoutResult && typeof checkoutResult === 'object' && 'checkoutUrl' in checkoutResult) {
        window.location.href = (checkoutResult as any).checkoutUrl;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Unable to start checkout', {
        description: error instanceof Error ? error.message : 'Please try again later.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      variant={variant}
      color={color}
      size={size}
      className={`w-full font-semibold ${className}`}
      disabled={disabled || isLoading}
      startContent={
        isLoading ? (
          <Spinner size="sm" color="white" />
        ) : (
          <CreditCardIcon className="w-5 h-5 text-white" />
        )
      }
    >
      {isLoading ? "Processing..." : children}
    </Button>
  );
}
