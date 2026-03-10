"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Clock, Loader2 } from "lucide-react";
import Link from "next/link";

type Assignment = {
  id: string;
  title: string;
  due_date: string | null;
  estimated_minutes: number;
  status: string;
};

type Task = {
  assignment_id: string | null;
  status: string;
  estimated_minutes: number;
};

type Warning = {
  assignmentId: string;
  title: string;
  dueDate: string;
  remainingMinutes: number;
  freeMinutes: number;
  severity: "critical" | "warning";
};

export function DeadlineWarnings({
  assignments,
  tasks,
}: {
  assignments: Assignment[];
  tasks: Task[];
}) {
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkConflicts() {
      try {
        const activeWithDue = assignments.filter(
          (a) => a.due_date && a.status !== "completed"
        );

        if (activeWithDue.length === 0) {
          setLoading(false);
          return;
        }

        const maxDays = Math.max(
          ...activeWithDue.map((a) =>
            Math.ceil(
              (new Date(a.due_date!).getTime() - Date.now()) / 86400000
            )
          )
        );

        const res = await fetch(
          `/api/calendar/free-slots?days=${Math.min(Math.max(maxDays, 1), 14)}&workStart=8&workEnd=22&minSlot=15`
        );

        if (!res.ok) {
          setLoading(false);
          return;
        }

        const { freeSlots } = await res.json();
        const newWarnings: Warning[] = [];

        for (const assignment of activeWithDue) {
          const due = new Date(assignment.due_date!);
          if (due < new Date()) continue;

          const remainingTasks = tasks.filter(
            (t) =>
              t.assignment_id === assignment.id && t.status !== "completed"
          );
          const remainingMinutes = remainingTasks.reduce(
            (sum, t) => sum + (t.estimated_minutes || 30),
            0
          );

          if (remainingMinutes === 0) continue;

          const freeBeforeDue = (freeSlots as any[])
            .filter((s: any) => new Date(s.start) < due)
            .reduce((sum: number, s: any) => sum + s.durationMinutes, 0);

          if (freeBeforeDue < remainingMinutes) {
            newWarnings.push({
              assignmentId: assignment.id,
              title: assignment.title,
              dueDate: assignment.due_date!,
              remainingMinutes,
              freeMinutes: freeBeforeDue,
              severity:
                freeBeforeDue < remainingMinutes * 0.5
                  ? "critical"
                  : "warning",
            });
          }
        }

        setWarnings(
          newWarnings.sort((a, b) => {
            if (a.severity === "critical" && b.severity !== "critical")
              return -1;
            if (b.severity === "critical" && a.severity !== "critical")
              return 1;
            return (
              new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
            );
          })
        );
      } catch {
      } finally {
        setLoading(false);
      }
    }

    checkConflicts();
  }, [assignments, tasks]);

  if (loading || warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnings.map((w) => (
        <Link
          key={w.assignmentId}
          href={`/assignments/${w.assignmentId}`}
          className={`flex items-start gap-3 rounded-xl border p-3.5 transition-colors hover:bg-opacity-80 ${
            w.severity === "critical"
              ? "border-red-200 bg-red-50/60"
              : "border-amber-200 bg-amber-50/60"
          }`}
        >
          <AlertTriangle
            className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
              w.severity === "critical" ? "text-red-500" : "text-amber-500"
            }`}
          />
          <div className="min-w-0 flex-1">
            <p
              className={`text-xs font-semibold ${
                w.severity === "critical" ? "text-red-800" : "text-amber-800"
              }`}
            >
              {w.severity === "critical" ? "Not enough time" : "Tight schedule"}: {w.title}
            </p>
            <p
              className={`mt-0.5 text-[11px] ${
                w.severity === "critical" ? "text-red-600" : "text-amber-600"
              }`}
            >
              <Clock className="mr-0.5 inline h-3 w-3" />
              {Math.round(w.remainingMinutes / 60 * 10) / 10}h of work left, but
              only {Math.round(w.freeMinutes / 60 * 10) / 10}h free before{" "}
              {new Date(w.dueDate).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
