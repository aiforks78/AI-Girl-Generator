"use client";

import React from "react";
import { Card, CardBody, Button } from "@heroui/react";
import { CheckCircleIcon, SparklesIcon, ArrowRightIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";

export default function SuccessPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardBody className="text-center p-8">
          <div className="mb-6">
            <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600">
              Thank you for your purchase. Your account has been upgraded successfully.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-green-800 font-medium mb-2">
              <SparklesIcon className="w-5 h-5" />
              Account Activated
            </div>
            <p className="text-sm text-green-700">
              Your credits have been added to your account and you now have access to all premium features.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              color="primary"
              variant="solid"
              size="lg"
              className="w-full"
              onPress={() => router.push("/dashboard")}
              endContent={<ArrowRightIcon className="w-4 h-4" />}
            >
              Go to Dashboard
            </Button>

            <Button
              variant="light"
              size="lg"
              className="w-full"
              onPress={() => router.push("/generate")}
            >
              Start Generating
            </Button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-2">
              Welcome to the Girl Generator community! 🎉
            </p>
            <p className="text-xs text-gray-400">
              You'll receive a confirmation email shortly.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
