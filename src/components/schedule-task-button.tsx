"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, CalendarCheck, Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, CalendarBlock } from "@/lib/types";

type Props = {
  task: Task;
  block?: CalendarBlock | null;
};

export function ScheduleTaskButton({ task, block }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const formRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const today = new Date();
    setDate(today.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleSchedule() {
    if (!date || !time) return;
    setLoading(true);

    const startTime = new Date(`${date}T${time}:00`);
    const endTime = new Date(
      startTime.getTime() + (task.estimated_minutes || 30) * 60 * 1000
    );

    try {
      const res = await fetch("/api/calendar/create-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to schedule");
      }

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        router.refresh();
      }, 1200);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    if (!block) return;
    setRemoving(true);

    try {
      const res = await fetch("/api/calendar/delete-block", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId: block.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to remove");
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRemoving(false);
    }
  }

  const durationHrs = Math.floor((task.estimated_minutes || 30) / 60);
  const durationMins = (task.estimated_minutes || 30) % 60;
  const durationLabel =
    durationHrs > 0
      ? `${durationHrs}h${durationMins > 0 ? ` ${durationMins}m` : ""}`
      : `${durationMins}m`;

  if (block) {
    const blockTime = new Date(block.start_time).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    const blockDate = new Date(block.start_time).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    return (
      <div className="flex items-center gap-1">
        <span className="flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
          <CalendarCheck className="h-2.5 w-2.5" />
          {blockDate}, {blockTime}
        </span>
        <button
          onClick={handleRemove}
          disabled={removing}
          className="rounded p-0.5 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-400"
          title="Remove from schedule"
        >
          {removing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <X className="h-3 w-3" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={formRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className={cn(
          "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors",
          open
            ? "bg-blue-100 text-blue-600"
            : "bg-zinc-100 text-zinc-400 hover:bg-blue-50 hover:text-blue-500"
        )}
        title="Schedule work session"
      >
        <CalendarPlus className="h-2.5 w-2.5" />
        Schedule
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg">
          {success ? (
            <div className="flex flex-col items-center gap-2 py-3">
              <div className="rounded-full bg-emerald-100 p-2">
                <Check className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-xs font-medium text-emerald-700">Scheduled!</p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-800">
                  Schedule session
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded p-0.5 text-zinc-300 hover:text-zinc-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <p className="mb-3 truncate text-[11px] text-zinc-400">
                {task.title}
              </p>

              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                    Start time
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100"
                  />
                </div>

                <div className="rounded-lg bg-zinc-50 px-2.5 py-2">
                  <p className="text-[10px] text-zinc-400">
                    Duration:{" "}
                    <span className="font-medium text-zinc-600">
                      {durationLabel}
                    </span>
                    <span className="ml-1 text-zinc-300">(from task estimate)</span>
                  </p>
                </div>
              </div>

              <button
                onClick={handleSchedule}
                disabled={loading || !date || !time}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <CalendarPlus className="h-3 w-3" />
                    Add to schedule
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
