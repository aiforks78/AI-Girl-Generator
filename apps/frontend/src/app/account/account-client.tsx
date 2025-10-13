"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/providers/auth-provider";
import { UserIcon, CreditCardIcon, ChartBarSquareIcon } from "@heroicons/react/24/outline";
import { apiFetch } from "@/lib/api-client";

type SubscriptionInfo = {
  plan_name: string;
  plan_interval: string;
  plan_price: number;
  subscription_status: "active" | "inactive" | string;
  remain_count: number;
  current_period_start: string | Date;
  current_period_end: string | Date;
  cancel_at_period_end: boolean;
} | null;

export default function AccountClientPage() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [subInfo, setSubInfo] = useState<SubscriptionInfo>(null);
  const name = user?.name || "User";
  const email = user?.email || "";
  const avatar = user?.image || "";

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const creditsResponse = await apiFetch("/user/credits", { cache: "no-store" });
        if (cancelled) return;
        if (creditsResponse.ok) {
          const data = await creditsResponse.json().catch(() => null);
          if (!data || cancelled) return;

          const creditValue = data?.data?.credits;
          if (typeof creditValue === "number") {
            setCredits(creditValue);
          }
        }
      } catch {}

      try {
        const subResponse = await apiFetch("/user/get_user_subscription_info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
          cache: "no-store"
        });
        if (cancelled) return;
        if (subResponse.ok) {
          const data = await subResponse.json().catch(() => null);
          if (!data || cancelled) return;

          if (data && typeof data === "object") {
            setSubInfo(data as SubscriptionInfo);
          }
        }
      } catch {}
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const planName = subInfo?.plan_name || "Free Plan";
  const status = (subInfo?.subscription_status || "active").toLowerCase();

  return (
    <div className="min-h-full bg-gray-950 text-white pt-[72px]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Account</h1>

        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-white/80" />
            Account Information
          </h2>
          <p className="text-sm text-white/60 mb-6">Manage your account details and subscription</p>

          <div className="flex items-center gap-4 mb-6">
            {avatar ? (
              <Image src={avatar} alt="avatar" width={56} height={56} className="rounded-full" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-lg font-semibold">
                {name?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate max-w-[240px]">{name}</span>
                <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{planName?.toLowerCase().includes("free") ? "Free" : planName}</span>
              </div>
              <div className="text-sm text-white/70 truncate">{email}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-white/70 mb-1 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400" /> Current Plan
              </div>
              <div className="text-base">{planName}</div>
            </div>
            <div>
              <div className="text-sm text-white/70 mb-1 flex items-center gap-2">
                <CreditCardIcon className="w-4 h-4 text-white/70" /> Available Credits
              </div>
              <div className="text-base"><span className="text-brand-400">{credits ?? "—"}</span> Credits</div>
            </div>
          </div>

          <div className="border-t border-gray-800 my-6" />

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => (window.location.href = "/pricing")}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium"
            >
              Upgrade Plan
            </button>
            <button
              onClick={() => (window.location.href = "/credits")}
              className="px-4 py-2 rounded-lg border border-gray-700 bg-[#111827] text-white font-medium"
            >
              View Credit History
            </button>
          </div>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
            <ChartBarSquareIcon className="w-5 h-5 text-white/80" />
            Account Statistics
          </h2>
          <p className="text-sm text-white/60 mb-6">Overview of your account activity</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-800 bg-[#0f172a] p-5 text-center">
              <div className="text-2xl font-bold text-brand-400">{credits ?? "—"}</div>
              <div className="text-xs text-white/70 mt-1">Available Credits</div>
            </div>
            <div className="rounded-xl border border-gray-800 bg-[#0f172a] p-5 text-center">
              <div className="text-2xl font-bold text-green-400">{planName?.toLowerCase().includes("free") ? "Free" : planName}</div>
              <div className="text-xs text-white/70 mt-1">Account Type</div>
            </div>
            <div className={`rounded-xl border border-gray-800 bg-[#0f172a] p-5 text-center ${status === "active" ? "" : "opacity-70"}`}>
              <div className={`text-2xl font-bold ${status === "active" ? "text-purple-400" : "text-white/60"}`}>{status === "active" ? "Active" : "Inactive"}</div>
              <div className="text-xs text-white/70 mt-1">Account Status</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
