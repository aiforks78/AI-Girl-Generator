// Creem Payment Integration Types and Functions

export interface CreemCheckoutOptions {
  productId: string;
  customerId?: string;
  successUrl?: string;
  cancelUrl?: string;
  // Selected billing interval for subscriptions or one-time packs
  interval?: 'monthly' | 'yearly' | 'onetime';
  metadata?: Record<string, any>;
}

export interface CreemProduct {
  id: string;
  name: string;
  pricing: {
    monthly?: number;
    yearly?: number;
    oneTime?: number;
  };
  currency: string;
  features: readonly string[];
}

// Product IDs mapping to Creem
export const CREEM_PRODUCTS = {
  'gg-tier-free': {
    id: 'gg-tier-free',
    name: 'Free Plan',
    pricing: { monthly: 0, yearly: 0 },
    currency: 'USD',
    features: ['10 credits/day', '720p resolution', 'Watermarked']
  },
  'gg-tier-member': {
    id: 'gg-tier-member',
    name: 'Member Plan',
    pricing: { monthly: 2990, yearly: 23880 }, // in cents
    currency: 'USD',
    features: ['300 credits/month', '4K resolution', 'No watermarks', 'All AI models']
  },
  'gg-pack-100': {
    id: 'gg-pack-100',
    name: '100 Credit Pack',
    pricing: { oneTime: 990 },
    currency: 'USD',
    features: ['100 credits', 'Never expires']
  },
  'gg-pack-300': {
    id: 'gg-pack-300',
    name: '300 Credit Pack',
    pricing: { oneTime: 2490 },
    currency: 'USD',
    features: ['300 credits', 'Never expires', 'Popular choice']
  },
  'gg-pack-1000': {
    id: 'gg-pack-1000',
    name: '1000 Credit Pack',
    pricing: { oneTime: 6990 },
    currency: 'USD',
    features: ['1000 credits', 'Never expires', 'Best value']
  },
} as const;

export type CreemProductId = keyof typeof CREEM_PRODUCTS;

/**
 * Initialize Creem checkout
 * This would integrate with the actual Creem SDK
 */
export async function initializeCreemCheckout(options: CreemCheckoutOptions) {
  // This is a placeholder for actual Creem integration
  console.log('Initializing Creem checkout with options:', options);

  // In real implementation, this would:
  // 1. Load Creem SDK
  // 2. Create checkout session
  // 3. Open Creem modal
  // 4. Handle success/failure callbacks

  return new Promise((resolve) => {
    setTimeout(() => {
      const query = options.interval ? `?interval=${options.interval}` : '';
      resolve({
        checkoutUrl: `/checkout/${options.productId}${query}`,
        sessionId: `cs_${Math.random().toString(36).substr(2, 9)}`
      });
    }, 1000);
  });
}

/**
 * Handle Creem webhook events
 */
export function handleCreemWebhook(event: any) {
  switch (event.type) {
    case 'checkout.completed':
      // Handle successful payment
      console.log('Payment completed:', event.data);
      break;
    case 'checkout.failed':
      // Handle failed payment
      console.log('Payment failed:', event.data);
      break;
    case 'subscription.created':
      // Handle new subscription
      console.log('Subscription created:', event.data);
      break;
    case 'subscription.cancelled':
      // Handle subscription cancellation
      console.log('Subscription cancelled:', event.data);
      break;
    default:
      console.log('Unhandled webhook event:', event.type);
  }
}

/**
 * Format price for display
 */
export function formatPrice(cents: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/**
 * Get product by ID
 */
export function getCreemProduct(productId: CreemProductId): CreemProduct | null {
  return CREEM_PRODUCTS[productId] || null;
}
