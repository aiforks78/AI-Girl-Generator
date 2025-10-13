import type { Frequency, Tier } from "./pricing-types";

import { FrequencyEnum, TiersEnum } from "./pricing-types";

export const frequencies: Array<Frequency> = [
  {
    key: FrequencyEnum.Monthly,
    label: "Monthly",
    priceSuffix: "/month",
  },
  {
    key: FrequencyEnum.Yearly,
    label: "Yearly",
    priceSuffix: "/year",
  },
];

export const tiers: Array<Tier> = [
  {
    key: TiersEnum.Free,
    id: {
      [FrequencyEnum.Monthly]: 0,
      [FrequencyEnum.Yearly]: 0,
      [FrequencyEnum.OneTime]: 0,
    },
    amount: {
      [FrequencyEnum.Monthly]: 0,
      [FrequencyEnum.Yearly]: 0,
      [FrequencyEnum.OneTime]: 0,
    },
    interval: {
      [FrequencyEnum.Monthly]: "month",
      [FrequencyEnum.Yearly]: "year",
      [FrequencyEnum.OneTime]: "one_time",
    },
    title: "Free",
    price: {
      yearly: "$0",
      monthly: "$0",
      onetime: "$0",
    },
    // Use NextAuth default sign-in page; direct signup route does not exist
    href: "/auth/signin?callbackUrl=%2F",
    featured: false,
    mostPopular: false,
    description: "Perfect for getting started",
    features: {
      yearly: [
        "10 credits per day",
        "Primary text-to-image model only",
        "720p max resolution",
        "Watermarked downloads",
        "Standard queue"
      ],
      monthly: [
        "10 credits per day",
        "Primary text-to-image model only",
        "720p max resolution",
        "Watermarked downloads",
        "Standard queue"
      ],
      onetime: [
        "10 credits per day",
        "Primary text-to-image model only",
        "720p max resolution",
        "Watermarked downloads",
        "Standard queue"
      ],
    },
    buttonText: "Start Free",
    buttonColor: "default",
    buttonVariant: "bordered",
  },
  {
    key: TiersEnum.Member,
    id: {
      [FrequencyEnum.Monthly]: 1,
      [FrequencyEnum.Yearly]: 2,
      [FrequencyEnum.OneTime]: 1,
    },
    amount: {
      [FrequencyEnum.Monthly]: 2990,
      [FrequencyEnum.Yearly]: 23880, // 20% discount
      [FrequencyEnum.OneTime]: 2990,
    },
    interval: {
      [FrequencyEnum.Monthly]: "month",
      [FrequencyEnum.Yearly]: "year",
      [FrequencyEnum.OneTime]: "month",
    },
    title: "Member",
    description: "Best value for creators",
    href: "/checkout/member",
    mostPopular: true,
    price: {
      yearly: "$19.90",
      monthly: "$29.90",
      onetime: "$29.90",
    },
    previousPrice: {
      yearly: "$29.90",
      monthly: "",
      onetime: "",
    },
    featured: false,
    features: {
      yearly: [
        "300 credits per month",
        "All bundled AI models (premium, max, img2img)",
        "1080p & 4K downloads",
        "No watermarks",
        "Priority queue",
        "Prompt history",
        "Advanced styles"
      ],
      monthly: [
        "300 credits per month",
        "All bundled AI models (premium, max, img2img)",
        "1080p & 4K downloads",
        "No watermarks",
        "Priority queue",
        "Prompt history",
        "Advanced styles"
      ],
      onetime: [
        "300 credits per month",
        "All bundled AI models (premium, max, img2img)",
        "1080p & 4K downloads",
        "No watermarks",
        "Priority queue",
        "Prompt history",
        "Advanced styles"
      ],
    },
    buttonText: "Upgrade to Member",
    buttonColor: "primary",
    buttonVariant: "solid",
  },
];
