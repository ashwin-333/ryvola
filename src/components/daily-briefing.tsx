"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2, RefreshCw } from "lucide-react";

export function DailyBriefing() {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function fetchBriefing() {
    setLoading(true);
    setError(false);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:
            "Give me a quick daily briefing. What should I focus on today and why? Keep it to 2-3 sentences max. Be specific about which assignment/task and why it's the priority. If I have nothing urgent, say so briefly.",
          history: [],
        }),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setBriefing(data.response);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBriefing();
  }, []);

  if (error) return null;

  return (
    <div className="rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50/80 to-blue-50/80 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-violet-100">
          <Image src="/ryvolalogo.png" alt="Ryvola" width={64} height={64} className="h-16 w-16 max-w-none object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-600">
              Daily Briefing
            </p>
            {!loading && (
              <button
                onClick={fetchBriefing}
                className="rounded p-1 text-violet-300 transition-colors hover:text-violet-500"
                title="Refresh"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            )}
          </div>
          {loading ? (
            <div className="flex items-center gap-2 py-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
              <span className="text-xs text-violet-400">Analyzing your workload...</span>
            </div>
          ) : (
            <p className="text-[13px] leading-relaxed text-zinc-700">
              {briefing}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
