"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  Loader2,
  Check,
  X,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

type Props = {
  tasks: Task[];
  dueDate: string | null;
};

type FreeSlot = {
  start: string;
  end: string;
  durationMinutes: number;
};

type ScheduledItem = {
  taskId: string;
  taskTitle: string;
  startTime: string;
  endTime: string;
  estimatedMinutes: number;
};

export function AutoScheduleButton({ tasks, dueDate }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [workStart, setWorkStart] = useState(8);
  const [workEnd, setWorkEnd] = useState(22);
  const [freeSlots, setFreeSlots] = useState<FreeSlot[] | null>(null);
  const [preview, setPreview] = useState<ScheduledItem[] | null>(null);
  const [unscheduled, setUnscheduled] = useState<string[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [gcalConnected, setGcalConnected] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  async function handlePreview() {
    setPreviewing(true);
    setWarning(null);

    try {
      const due = dueDate ? new Date(dueDate) : null;
      const days = due
        ? Math.max(
            1,
            Math.ceil(
              (due.getTime() - Date.now()) / 86400000
            )
          )
        : 7;

      const slotsRes = await fetch(
        `/api/calendar/free-slots?days=${days}&workStart=${workStart}&workEnd=${workEnd}&minSlot=15`
      );
      const slotsData = await slotsRes.json();
      setFreeSlots(slotsData.freeSlots);
      setGcalConnected(slotsData.googleConnected);

      const slots = slotsData.freeSlots as FreeSlot[];
      const scheduled: ScheduledItem[] = [];
      const missed: string[] = [];
      let slotIdx = 0;
      let slotUsed = 0;

      for (const task of tasks) {
        const needed = task.estimated_minutes || 30;
        let placed = false;

        while (slotIdx < slots.length) {
          const available = slots[slotIdx].durationMinutes - slotUsed;
          if (available >= needed) {
            const slotStart = new Date(slots[slotIdx].start);
            const taskStart = new Date(
              slotStart.getTime() + slotUsed * 60000
            );
            const taskEnd = new Date(taskStart.getTime() + needed * 60000);

            scheduled.push({
              taskId: task.id,
              taskTitle: task.title,
              startTime: taskStart.toISOString(),
              endTime: taskEnd.toISOString(),
              estimatedMinutes: needed,
            });
            slotUsed += needed + 10;
            placed = true;
            break;
          } else {
            slotIdx++;
            slotUsed = 0;
          }
        }

        if (!placed) missed.push(task.title);
      }

      setPreview(scheduled);
      setUnscheduled(missed);

      if (missed.length > 0) {
        setWarning(
          `Not enough free time for ${missed.length} task(s). Try extending work hours or moving the deadline.`
        );
      }
    } catch {
      setWarning("Could not load your calendar. Try again.");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await fetch("/api/calendar/auto-fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskIds: tasks.map((t) => t.id),
          dueDate,
          workStartHour: workStart,
          workEndHour: workEnd,
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
        setPreview(null);
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
        onClick={() => {
          setOpen(!open);
          if (!open) {
            setPreview(null);
            setFreeSlots(null);
          }
        }}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
          open
            ? "bg-violet-100 text-violet-700"
            : "bg-zinc-900 text-white hover:bg-zinc-800"
        )}
      >
        <Brain className="h-3.5 w-3.5" />
        Schedule for me
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-80 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg">
          {success ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="rounded-full bg-emerald-100 p-2">
                <Check className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-xs font-medium text-emerald-700">
                {preview?.length || tasks.length} sessions scheduled around your
                calendar!
              </p>
            </div>
          ) : !preview ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5 text-violet-500" />
                  <p className="text-xs font-semibold text-zinc-800">
                    Smart Schedule
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded p-0.5 text-zinc-300 hover:text-zinc-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <p className="mb-3 text-[11px] text-zinc-400">
                Ryvola reads your calendar, finds when you're free, and fits{" "}
                {tasks.length} tasks into your actual available time.
              </p>

              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                      Work from
                    </label>
                    <select
                      value={workStart}
                      onChange={(e) => setWorkStart(Number(e.target.value))}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-800 outline-none"
                    >
                      {Array.from({ length: 14 }, (_, i) => i + 6).map((h) => (
                        <option key={h} value={h}>
                          {h > 12 ? `${h - 12} PM` : h === 12 ? "12 PM" : `${h} AM`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                      Until
                    </label>
                    <select
                      value={workEnd}
                      onChange={(e) => setWorkEnd(Number(e.target.value))}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-800 outline-none"
                    >
                      {Array.from({ length: 14 }, (_, i) => i + 10).map(
                        (h) => (
                          <option key={h} value={h}>
                            {h > 12 ? `${h - 12} PM` : h === 12 ? "12 PM" : `${h} AM`}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                <div className="rounded-lg bg-violet-50 px-2.5 py-2 text-[10px] text-violet-600">
                  <Calendar className="mr-1 inline h-3 w-3" />
                  {Math.floor(totalMins / 60)}h{" "}
                  {totalMins % 60 > 0 && `${totalMins % 60}m`} of work to fit
                  {dueDate && (
                    <span>
                      {" "}
                      before{" "}
                      {new Date(dueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handlePreview}
                disabled={previewing}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
              >
                {previewing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Finding free time...
                  </>
                ) : (
                  <>
                    <Brain className="h-3 w-3" />
                    Find slots and preview
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-800">
                  Schedule Preview
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded p-0.5 text-zinc-300 hover:text-zinc-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {gcalConnected && (
                <p className="mb-2 text-[10px] text-emerald-600">
                  <Check className="mr-0.5 inline h-2.5 w-2.5" />
                  Scheduled around your Google Calendar events
                </p>
              )}

              {warning && (
                <div className="mb-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[10px] text-amber-700">
                  <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                  {warning}
                </div>
              )}

              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg bg-zinc-50 p-2">
                {preview.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <span className="truncate text-zinc-600 max-w-[140px]">
                      {item.taskTitle}
                    </span>
                    <span className="flex-shrink-0 text-zinc-400">
                      {new Date(item.startTime).toLocaleDateString("en-US", {
                        weekday: "short",
                      })}{" "}
                      {new Date(item.startTime).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setPreview(null)}
                  className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50"
                >
                  Adjust
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading || preview.length === 0}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-3 w-3" />
                      Confirm ({preview.length})
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
