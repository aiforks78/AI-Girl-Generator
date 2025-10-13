import SuccessPage from "@/components/checkout/success-page";

export const metadata = {
  title: "Payment Successful - Girl Generator",
  description: "Your payment has been processed successfully.",
  robots: "noindex, nofollow",
};

export default function Page() {
  return <SuccessPage />;
}