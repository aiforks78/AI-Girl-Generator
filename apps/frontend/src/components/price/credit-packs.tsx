export interface CreditPack {
  id: string;
  credits: number;
  price: number;
  originalPrice?: number;
  popular?: boolean;
  bestValue?: boolean;
  description: string;
  pricePerCredit: string;
}

export const creditPacks: CreditPack[] = [
  {
    id: "pack-100",
    credits: 100,
    price: 9.9,
    description: "Perfect for occasional use",
    pricePerCredit: "$0.099",
  },
  {
    id: "pack-300",
    credits: 300,
    price: 24.9,
    popular: true,
    description: "Most popular choice",
    pricePerCredit: "$0.083",
  },
  {
    id: "pack-1000",
    credits: 1000,
    price: 69.9,
    originalPrice: 99.9,
    bestValue: true,
    description: "Best value for power users",
    pricePerCredit: "$0.070",
  },
];