"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarPlus, X, Loader2 } from "lucide-react";

type MissedBlock = {
  id: string;
  task_id: string;
  start_time: string;
  end_time: string;
  task?: {
    id: string;
    title: string;
    status: string;
    estimated_minutes: number;
    assignment?: { title: string };
  };
};

export function MissedSessions({ blocks }: { blocks: MissedBlock[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [rescheduling, setRescheduling] = useState<string | null>(null);
  const router = useRouter();

  const visible = blocks.filter(
    (b) => !dismissed.has(b.id) && b.task?.status !== "completed"
  );

  if (visible.length === 0) return null;

  async function handleReschedule(block: MissedBlock) {
    setRescheduling(block.id);

    try {
      await fetch("/api/calendar/delete-block", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId: block.id }),
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      const duration = (block.task?.estimated_minutes || 30) * 60 * 1000;
      const endTime = new Date(tomorrow.getTime() + duration);

      const res = await fetch("/api/calendar/create-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: block.task_id,
          startTime: tomorrow.toISOString(),
          endTime: endTime.toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Failed to reschedule");
      router.refresh();
    } catch {
      alert("Failed to reschedule. Try again.");
    } finally {
      setRescheduling(null);
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <p className="text-xs font-semibold text-amber-800">
          {visible.length} missed session{visible.length > 1 ? "s" : ""}
        </p>
      </div>
      <div className="space-y-2">
        {visible.map((block) => (
          <div
            key={block.id}
            className="flex items-center justify-between rounded-lg bg-white p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-zinc-800">
                {block.task?.title}
              </p>
              <p className="text-[11px] text-zinc-400">
                {block.task?.assignment?.title} -{" "}
                was scheduled for{" "}
                {new Date(block.start_time).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}{" "}
                at{" "}
                {new Date(block.start_time).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleReschedule(block)}
                disabled={rescheduling === block.id}
                className="flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1.5 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-200"
              >
                {rescheduling === block.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CalendarPlus className="h-3 w-3" />
                )}
                Reschedule
              </button>
              <button
                onClick={() =>
                  setDismissed((prev) => new Set(Array.from(prev).concat(block.id)))
                }
                className="rounded p-1 text-zinc-300 hover:text-zinc-500"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
