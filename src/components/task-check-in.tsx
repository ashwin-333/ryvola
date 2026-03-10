"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Clock, Brain, Loader2 } from "lucide-react";
import type { Task, Assignment } from "@/lib/types";

export function TaskCheckIn({
  task,
}: {
  task: Task & { assignment?: Assignment | null };
}) {
  const [status, setStatus] = useState(task.status);
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setStatus(task.status);
  }, [task.status]);

  async function fetchSuggestion() {
    setLoadingSuggestion(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `I just finished "${task.title}"${task.assignment ? ` for "${task.assignment.title}"` : ""}. What should I do next? Give me one specific suggestion in 1-2 sentences. Be direct.`,
          history: [],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestion(data.response);
      }
    } catch {
    } finally {
      setLoadingSuggestion(false);
    }
  }

  async function toggleComplete() {
    setLoading(true);
    const supabase = createClient();
    const newStatus = status === "completed" ? "pending" : "completed";

    await supabase
      .from("tasks")
      .update({
        status: newStatus,
        completed_at:
          newStatus === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", task.id);

    if (newStatus === "completed") {
      await supabase.from("progress_signals").insert({
        assignment_id: task.assignment_id || null,
        user_id: task.user_id,
        signal_type: "check_in",
        note: `Completed: ${task.title}`,
      });
    }

    setStatus(newStatus);
    setLoading(false);

    if (newStatus === "completed") {
      fetchSuggestion();
    } else {
      setSuggestion(null);
    }

    router.refresh();
  }

  return (
    <div>
      <button
        onClick={toggleComplete}
        disabled={loading}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all duration-150",
          status === "completed" ? "bg-emerald-50/50" : "hover:bg-zinc-50"
        )}
      >
        {status === "completed" ? (
          <CheckCircle2 className="h-[18px] w-[18px] flex-shrink-0 text-emerald-500" />
        ) : (
          <Circle className="h-[18px] w-[18px] flex-shrink-0 text-zinc-200" />
        )}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm",
              status === "completed"
                ? "text-zinc-400 line-through"
                : "font-medium text-zinc-800"
            )}
          >
            {task.title}
          </p>
          {task.assignment && (
            <p className="truncate text-[11px] text-zinc-400">
              {task.assignment.title}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
          <Clock className="h-2.5 w-2.5" />
          {task.estimated_minutes}m
        </div>
      </button>

      {(loadingSuggestion || suggestion) && (
        <div className="ml-9 mt-1 mb-1 rounded-lg bg-violet-50/60 px-3 py-2">
          {loadingSuggestion ? (
            <div className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin text-violet-400" />
              <span className="text-[11px] text-violet-400">
                Thinking...
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-1.5">
              <Brain className="mt-0.5 h-3 w-3 flex-shrink-0 text-violet-500" />
              <p className="text-[11px] leading-relaxed text-violet-700">
                {suggestion}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
