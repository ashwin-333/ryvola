"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

export function ScheduleAllButton({ tasks }: { tasks: Task[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [breakMins, setBreakMins] = useState(10);
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

  const totalMins = tasks.reduce(
    (sum, t) => sum + (t.estimated_minutes || 30),
    0
  );
  const totalBreakMins = (tasks.length - 1) * breakMins;

  function getEndTimeLabel() {
    if (!date || !startTime) return "";
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(
      start.getTime() + (totalMins + totalBreakMins) * 60 * 1000
    );
    return end.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  async function handleScheduleAll() {
    if (!date || !startTime) return;
    setLoading(true);

    try {
      let cursor = new Date(`${date}T${startTime}:00`);

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const duration = (task.estimated_minutes || 30) * 60 * 1000;
        const taskStart = new Date(cursor);
        const taskEnd = new Date(cursor.getTime() + duration);

        const res = await fetch("/api/calendar/create-blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: task.id,
            startTime: taskStart.toISOString(),
            endTime: taskEnd.toISOString(),
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `Failed to schedule task: ${task.title}`);
        }

        cursor = new Date(taskEnd.getTime() + breakMins * 60 * 1000);
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

  return (
    <div className="relative" ref={formRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors",
          open
            ? "bg-blue-100 text-blue-600"
            : "bg-zinc-100 text-zinc-500 hover:bg-blue-50 hover:text-blue-500"
        )}
      >
        <CalendarPlus className="h-3 w-3" />
        Schedule all
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg">
          {success ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="rounded-full bg-emerald-100 p-2">
                <Check className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-xs font-medium text-emerald-700">
                {tasks.length} sessions scheduled!
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-800">
                  Schedule all tasks
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded p-0.5 text-zinc-300 hover:text-zinc-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <p className="mb-3 text-[11px] text-zinc-400">
                Schedule {tasks.length} tasks back-to-back with breaks.
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
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                    Break between tasks
                  </label>
                  <select
                    value={breakMins}
                    onChange={(e) => setBreakMins(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100"
                  >
                    <option value={0}>No break</option>
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>

                <div className="rounded-lg bg-zinc-50 px-2.5 py-2 text-[10px] text-zinc-400 space-y-0.5">
                  <p>
                    Total work:{" "}
                    <span className="font-medium text-zinc-600">
                      {Math.floor(totalMins / 60)}h{" "}
                      {totalMins % 60 > 0 && `${totalMins % 60}m`}
                    </span>
                  </p>
                  {date && startTime && (
                    <p>
                      Finishes around{" "}
                      <span className="font-medium text-zinc-600">
                        {getEndTimeLabel()}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={handleScheduleAll}
                disabled={loading || !date || !startTime}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <CalendarPlus className="h-3 w-3" />
                    Schedule {tasks.length} sessions
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
