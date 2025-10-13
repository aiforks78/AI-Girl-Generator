"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { apiFetch } from "@/lib/api-client";
import { Squares2X2Icon } from "@heroicons/react/24/outline";
import { modelLabel } from "@/lib/labels";
import { MODEL_IDS } from "@shared/model-ids";

type Tx = {
  id: string;
  action: string;
  amount: number;
  balance_after: number;
  created_at: string;
  metadata?: any;
  job_id?: number;
  job_info?: { prompt?: string; style?: string; status?: string; model_id?: string };
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const labelFor = (action: string) => {
  switch (action) {
    case "purchase":
      return "Credits Purchase";
    case "signup_bonus":
      return "Signup Bonus";
    case "daily_checkin":
      return "Daily Check-in";
    case "daily_topup":
      return "Daily Top-up";
    case "txt2img":
      return "Text to Image";
    case "img2img":
      return "Image to Image";
    case "img2vid":
    case "img2video":
      return "Image to Video";
    case "preview":
      return "Generation";
    case "hd":
      return "HD Upgrade";
    case "refund":
      return "Refund";
    default:
      return action?.replace(/_/g, " ") || "Unknown";
  }
};

const describeSource = (tx: Tx) => {
  const metadata = tx.metadata || {};
  const jobModel = tx.job_info?.model_id ? String(tx.job_info.model_id) : null;
  if (tx.action === 'create_character') return 'Create character';
  if (jobModel) {
    const normalized = jobModel.toLowerCase().replace(/\s+/g, '-');
    const canonical = (() => {
      if (normalized === MODEL_IDS.PRIMARY_TXT2IMG.toLowerCase() || normalized.includes('flux-schnell')) {
        return MODEL_IDS.PRIMARY_TXT2IMG;
      }
      if (normalized === MODEL_IDS.INLINE_TXT2IMG.toLowerCase() || normalized === 'banana' || normalized === 'nano-banana') {
        return MODEL_IDS.INLINE_TXT2IMG;
      }
      if (normalized === MODEL_IDS.IMG2IMG.toLowerCase() || normalized.includes('seedream')) {
        return MODEL_IDS.IMG2IMG;
      }
      if (normalized === MODEL_IDS.PREMIUM_TXT2IMG.toLowerCase() || normalized.includes('kontext-pro')) {
        return MODEL_IDS.PREMIUM_TXT2IMG;
      }
      if (normalized === MODEL_IDS.MAX_TXT2IMG.toLowerCase() || normalized.includes('kontext-max')) {
        return MODEL_IDS.MAX_TXT2IMG;
      }
      return normalized;
    })();
    return modelLabel(canonical) || canonical;
  }
  if (metadata?.reason) return String(metadata.reason);
  if (metadata?.source) return String(metadata.source);
  if (tx.job_info?.status) return String(tx.job_info.status);
  return "—";
};

export default function CreditsClientPage() {
  const router = useRouter();
  const { status } = useAuth();
  const [loading, setLoading] = useState(true);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/user/transactions?limit=${limit}&page=${page}`, { cache: "no-store" });
        const json = await res.json();
        const list: Tx[] = json?.data?.transactions || [];
        const pg = json?.data?.pagination || {};
        setTxs(list);
        setTotal(pg.total || list.length || 0);
        setPages(pg.pages || 1);
        setHasNext(!!pg.has_next);
        setHasPrev(!!pg.has_prev);
      } catch {
        setTxs([]);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      void load();
    }
  }, [status, page, limit]);

  return (
    <div className="min-h-full bg-gray-950 text-white pt-[72px]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">My Credits</h1>
          <button
            onClick={() => router.push("/account")}
            className="px-3 py-1.5 rounded-lg border border-gray-700 bg-[#111827] text-white text-sm"
          >
            Back to Account
          </button>
        </div>

        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Squares2X2Icon className="w-5 h-5 text-white/80" />
            Credit History Summary
          </h2>
          <p className="text-sm text-white/60">{`Total ${total} credit transaction${total === 1 ? "" : "s"} found`}</p>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-6">
          <h3 className="text-lg font-semibold mb-2">Transaction History</h3>
          <p className="text-sm text-white/60 mb-4">View all your credit transactions and usage</p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/70 border-b border-gray-800">
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Type</th>
                  <th className="py-3 pr-4">Amount</th>
                  <th className="py-3 pr-4">Source</th>
                  <th className="py-3 pr-4">Balance</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-white/60">Loading...</td>
                  </tr>
                ) : txs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-white/60">No transactions found</td>
                  </tr>
                ) : (
                  txs.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-800/70 hover:bg-white/5">
                      <td className="py-3 pr-4 whitespace-nowrap">{formatDate(tx.created_at)}</td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white/10 border border-white/10">
                          <span className="w-3 h-3 rounded-sm bg-white/40" />
                          {labelFor(tx.action)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={tx.amount >= 0 ? "text-green-400" : "text-red-400"}>
                          {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} Credits
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-white/80">{describeSource(tx)}</td>
                      <td className="py-3 pr-4 text-white/70">{typeof tx.balance_after === "number" ? tx.balance_after : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-white/60">Page {page} of {pages}</div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1.5 rounded-lg border border-gray-700 bg-[#111827] text-white text-sm disabled:opacity-50"
                disabled={!hasPrev || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <button
                className="px-3 py-1.5 rounded-lg border border-gray-700 bg-[#111827] text-white text-sm disabled:opacity-50"
                disabled={!hasNext || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
