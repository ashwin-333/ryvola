"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuickAddTask() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  async function handleAdd() {
    if (!title.trim()) return;
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("tasks").insert({
      user_id: user.id,
      assignment_id: null,
      title: title.trim(),
      estimated_minutes: minutes,
      order_index: 0,
      status: "pending",
    });

    setTitle("");
    setMinutes(30);
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === "Escape") {
      setOpen(false);
      setTitle("");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-zinc-200 p-3 text-[13px] text-zinc-400 transition-colors hover:border-zinc-300 hover:text-zinc-600"
      >
        <Plus className="h-4 w-4" />
        Quick add task...
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What do you need to do?"
        className="w-full text-sm text-zinc-800 placeholder:text-zinc-400 outline-none"
      />
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <select
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-600 outline-none"
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setOpen(false);
              setTitle("");
            }}
            className="rounded-md px-2.5 py-1 text-[11px] text-zinc-400 hover:text-zinc-600"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!title.trim() || saving}
            className="flex items-center gap-1 rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              "Add"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
