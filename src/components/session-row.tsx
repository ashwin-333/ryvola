"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";

type SessionBlock = {
  id: string;
  start_time: string;
  end_time: string;
  task?: {
    title: string;
    assignment?: { title: string };
  };
};

export function SessionRow({ block }: { block: SessionBlock }) {
  const [removing, setRemoving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  async function handleRemove() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }

    setRemoving(true);
    try {
      const res = await fetch("/api/calendar/delete-block", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId: block.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message);
      setRemoving(false);
      setConfirming(false);
    }
  }

  return (
    <div className="group flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-zinc-50">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-zinc-900">
          {block.task?.title}
        </p>
        <p className="text-[11px] text-zinc-400">
          {block.task?.assignment?.title}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="text-[11px] font-medium text-zinc-600">
            {new Date(block.start_time).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
          <p className="text-[11px] text-zinc-400">
            {new Date(block.start_time).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}{" "}
            -{" "}
            {new Date(block.end_time).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
        <button
          onClick={handleRemove}
          disabled={removing}
          className={`flex-shrink-0 rounded-md p-1.5 transition-all ${
            confirming
              ? "bg-red-100 text-red-500"
              : "text-zinc-300 opacity-0 hover:bg-red-50 hover:text-red-400 group-hover:opacity-100"
          }`}
          title={confirming ? "Click again to confirm" : "Remove session"}
        >
          {removing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
