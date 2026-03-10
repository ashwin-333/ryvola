"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, Check, Loader2, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type SessionBlock = {
  id: string;
  task_id: string;
  start_time: string;
  end_time: string;
  started_at?: string | null;
  finished_at?: string | null;
  actual_minutes?: number | null;
  task?: {
    id: string;
    title: string;
    status: string;
    estimated_minutes: number;
    assignment_id: string | null;
    user_id: string;
    assignment?: { title: string } | null;
  } | null;
};

export function SessionTimer({ block }: { block: SessionBlock }) {
  const [active, setActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [completing, setCompleting] = useState(false);
  const startTimeRef = useRef<Date | null>(null);
  const router = useRouter();

  const scheduledStart = new Date(block.start_time);
  const scheduledEnd = new Date(block.end_time);
  const totalMs = scheduledEnd.getTime() - scheduledStart.getTime();
  const totalMins = Math.round(totalMs / 60000);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [active]);

  async function handleStart() {
    const supabase = createClient();
    startTimeRef.current = new Date();

    await supabase
      .from("calendar_blocks")
      .update({ started_at: startTimeRef.current.toISOString() })
      .eq("id", block.id);

    setActive(true);
  }

  async function handlePause() {
    setActive(false);
  }

  async function handleComplete() {
    if (!block.task) return;
    setCompleting(true);
    const supabase = createClient();

    const actualMinutes = Math.round(elapsed / 60);

    await supabase
      .from("calendar_blocks")
      .update({
        finished_at: new Date().toISOString(),
        actual_minutes: actualMinutes,
      })
      .eq("id", block.id);

    await supabase
      .from("tasks")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        actual_minutes: actualMinutes,
      })
      .eq("id", block.task.id);

    const estimatedMins = block.task.estimated_minutes || 30;
    const accuracy = Math.round((actualMinutes / estimatedMins) * 100);
    const note =
      actualMinutes > 0
        ? `Completed "${block.task.title}" in ${actualMinutes}m (estimated ${estimatedMins}m, ${accuracy}% accuracy)`
        : `Completed: ${block.task.title}`;

    await supabase.from("progress_signals").insert({
      assignment_id: block.task.assignment_id || null,
      user_id: block.task.user_id,
      signal_type: "check_in",
      note,
    });

    setCompleting(false);
    setActive(false);
    router.refresh();
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const progress = Math.min((elapsed / (totalMs / 1000)) * 100, 100);
  const now = new Date();
  const isNow = now >= scheduledStart && now <= scheduledEnd;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all",
        active
          ? "border-blue-200 bg-blue-50/50"
          : isNow
            ? "border-blue-100 bg-white"
            : "border-zinc-200/80 bg-white"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900">
            {block.task?.title}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            {block.task?.assignment?.title || "Standalone task"}
          </p>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-zinc-400">
            <span>
              {scheduledStart.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}{" "}
              -{" "}
              {scheduledEnd.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            <span className="text-zinc-200">|</span>
            <span>{totalMins} min</span>
            {isNow && !active && (
              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-blue-600">
                Now
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {block.task?.status !== "completed" && (
            <>
              {!active ? (
                <button
                  onClick={handleStart}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 transition-colors hover:bg-blue-200"
                  title="Start session"
                >
                  <Play className="h-3.5 w-3.5 ml-0.5" />
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 transition-colors hover:bg-amber-200"
                  title="Pause"
                >
                  <Pause className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={handleComplete}
                disabled={completing}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 transition-colors hover:bg-emerald-200"
                title="Complete and log time"
              >
                {completing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </button>
            </>
          )}
          {block.task?.status === "completed" && (
            <div className="text-right">
              <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-600">
                Done
              </span>
              {block.actual_minutes != null && (
                <p className="mt-1 text-[9px] text-zinc-400">
                  {block.actual_minutes}m actual
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {active && (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium tabular-nums text-blue-600">
              {formatTime(elapsed)}
            </span>
            <span className="text-zinc-400">{totalMins}:00 goal</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
          {elapsed > 0 && (
            <p className="text-[10px] text-zinc-400">
              Time is being tracked. Complete the task to log your actual time.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
