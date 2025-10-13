import { notFound } from "next/navigation";
import { getCreemProduct, type CreemProductId } from "@/lib/creem";
import CheckoutPage from "@/components/checkout/checkout-page";
import { Suspense } from "react";
type CheckoutParams = Promise<{ productId: string }>;

export async function generateMetadata({ params }: { params: CheckoutParams }) {
  const { productId } = await params;
  const product = getCreemProduct(productId as CreemProductId);

  if (!product) {
    return {
      title: "Checkout - Girl Generator",
    };
  }

  return {
    title: `Checkout ${product.name} - Girl Generator`,
    description: `Complete your purchase of ${product.name}`,
    robots: "noindex, nofollow", // Don't index checkout pages
  };
}

export default async function Page({ params }: { params: CheckoutParams }) {
  const { productId } = await params;
  const product = getCreemProduct(productId as CreemProductId);

  if (!product) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading…</div>}>
      <CheckoutPage product={product} />
    </Suspense>
  );
}

// Generate static paths for known products
export async function generateStaticParams() {
  return [
    { productId: 'gg-tier-member' },
    { productId: 'gg-pack-100' },
    { productId: 'gg-pack-300' },
    { productId: 'gg-pack-1000' },
  ];
}
