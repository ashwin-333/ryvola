"use client";

import { useState } from "react";
import { Share2, Check, Copy, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SharePlanButton({ assignmentId }: { assignmentId: string }) {
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });

      if (!res.ok) throw new Error("Failed to create share link");

      const data = await res.json();
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(fullUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (shareUrl) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1">
          <span className="max-w-[160px] truncate text-[11px] text-zinc-500">
            {shareUrl}
          </span>
          <button
            onClick={copyLink}
            className="rounded p-0.5 text-zinc-400 transition-colors hover:text-zinc-600"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </div>
        <button
          onClick={() => setShareUrl(null)}
          className="rounded p-1 text-zinc-300 hover:text-zinc-500"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleShare}
      disabled={loading}
      className="h-8 gap-1.5 text-xs"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Share2 className="h-3 w-3" />
      )}
      Share Plan
    </Button>
  );
}
