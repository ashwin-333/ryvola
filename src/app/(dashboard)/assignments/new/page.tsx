"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ImagePlus,
  Loader2,
  X,
  Plus,
  Trash2,
  Brain,
  ClipboardPaste,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ParsedAssignment,
  ParsedTask,
} from "@/lib/gemini/parse-assignment";

type EditableTask = ParsedTask & { id: string };

export default function NewAssignmentPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsed, setParsed] = useState<ParsedAssignment | null>(null);
  const [tasks, setTasks] = useState<EditableTask[]>([]);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const processFile = useCallback(
    (f: File) => {
      setFile(f);
      setError(null);
      if (f.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(f);
      } else {
        setPreview(null);
      }
    },
    []
  );

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (parsed) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            const f = new File([blob], `screenshot-${Date.now()}.png`, {
              type: blob.type,
            });
            processFile(f);
          }
          return;
        }
      }
    }

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [parsed, processFile]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  }

  async function handleParse() {
    if (!file) return;
    setParsing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-assignment", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to parse assignment");
      }

      const data: ParsedAssignment = await res.json();
      setParsed(data);
      setTitle(data.title);
      setTasks(
        data.tasks.map((t, i) => ({
          ...t,
          id: `task-${i}`,
        }))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setParsing(false);
    }
  }

  function addTask() {
    setTasks((prev) => [
      ...prev,
      { id: `task-${Date.now()}`, title: "", estimatedMinutes: 30 },
    ]);
  }

  function removeTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function updateTask(
    id: string,
    field: keyof ParsedTask,
    value: string | number
  ) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Assignment title is required");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let imageUrl: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("assignments")
          .upload(path, file);
        if (!uploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("assignments").getPublicUrl(path);
          imageUrl = publicUrl;
        }
      }

      const totalMinutes = tasks.reduce(
        (sum, t) => sum + (t.estimatedMinutes || 0),
        0
      );

      const { data: assignment, error: insertError } = await supabase
        .from("assignments")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: parsed?.deliverables?.join("\n") ?? null,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          requirements: parsed?.requirements ?? [],
          deliverables: parsed?.deliverables ?? [],
          estimated_minutes: totalMinutes,
          status: "not_started",
          original_image_url: imageUrl,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (tasks.length > 0) {
        const { error: tasksError } = await supabase.from("tasks").insert(
          tasks.map((t, i) => ({
            assignment_id: assignment.id,
            user_id: user.id,
            title: t.title,
            estimated_minutes: t.estimatedMinutes || 30,
            order_index: i,
            status: "pending",
          }))
        );
        if (tasksError) throw tasksError;
      }

      router.push(`/assignments/${assignment.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  function reset() {
    setParsed(null);
    setTasks([]);
    setTitle("");
    setDueDate("");
    setFile(null);
    setPreview(null);
    setError(null);
  }

  const totalMinutes = tasks.reduce(
    (s, t) => s + (t.estimatedMinutes || 0),
    0
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Add Assignment</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Paste a screenshot, drag a file, or upload. Ryvola builds your plan.
        </p>
      </div>

      {error && (
        <div className="animate-fade-in rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!parsed && (
        <div className="animate-fade-in space-y-4">
          <div
            ref={dropZoneRef}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200 ${
              dragOver
                ? "border-zinc-900 bg-zinc-50 scale-[1.01]"
                : file
                  ? "border-zinc-300 bg-white"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            {!file ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-4 p-16"
              >
                <div className="rounded-2xl bg-zinc-100 p-4">
                  <ImagePlus className="h-8 w-8 text-zinc-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-zinc-900">
                    Drop screenshot here, paste from clipboard, or click to
                    upload
                  </p>
                  <p className="mt-1.5 text-xs text-zinc-400">
                    PNG, JPG, WEBP, or PDF
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5">
                  <ClipboardPaste className="h-3 w-3 text-zinc-500" />
                  <span className="text-[11px] font-medium text-zinc-500">
                    Tip: Press Cmd+V to paste a screenshot
                  </span>
                </div>
              </button>
            ) : (
              <div className="p-4">
                {preview && (
                  <div className="relative mb-4 overflow-hidden rounded-lg bg-zinc-50">
                    <img
                      src={preview}
                      alt="Assignment preview"
                      className="mx-auto max-h-56 object-contain"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setPreview(null);
                      }}
                      className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow-sm backdrop-blur transition hover:bg-white"
                    >
                      <X className="h-3.5 w-3.5 text-zinc-600" />
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-zinc-600">
                    <ImagePlus className="h-4 w-4 text-zinc-400" />
                    {file.name}
                  </span>
                  {!preview && (
                    <button
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                      }}
                      className="text-xs text-zinc-400 hover:text-zinc-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <Button
                  onClick={handleParse}
                  disabled={parsing}
                  className="mt-4 w-full gap-2"
                  size="lg"
                >
                  {parsing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing assignment…
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4" />
                      Analyze & Create Plan
                    </>
                  )}
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {!file && (
            <div className="text-center">
              <span className="text-xs text-zinc-400">or</span>
              <button
                onClick={() => {
                  setParsed({
                    title: "",
                    deliverables: [],
                    requirements: [],
                    tasks: [],
                    totalEstimatedMinutes: 0,
                  });
                }}
                className="ml-2 text-xs font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-900"
              >
                add manually
              </button>
            </div>
          )}
        </div>
      )}

      {parsed && (
        <div className="animate-slide-up space-y-5">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Assignment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500">Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Assignment title"
                  className="font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500">Due Date</Label>
                <Input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              {parsed.deliverables.length > 0 && (
                <div className="space-y-2 rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Deliverables
                  </p>
                  <ul className="space-y-1.5">
                    {parsed.deliverables.map((d, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-zinc-700"
                      >
                        <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-400" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {parsed.requirements.length > 0 && (
                <div className="space-y-2 rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Requirements
                  </p>
                  <ul className="space-y-1.5">
                    {parsed.requirements.map((r, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-zinc-700"
                      >
                        <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-400" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base">
                Task Breakdown
                {tasks.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-zinc-400">
                    {tasks.length} tasks
                  </span>
                )}
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={addTask}
                className="h-8 gap-1 text-xs"
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-400">
                  No tasks yet. Click &quot;Add&quot; to create one.
                </p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task, i) => (
                    <div
                      key={task.id}
                      className="group flex items-center gap-2.5 rounded-lg border border-zinc-100 bg-white p-2.5 transition-colors hover:border-zinc-200"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-100 text-[10px] font-bold text-zinc-500">
                        {i + 1}
                      </span>
                      <Input
                        value={task.title}
                        onChange={(e) =>
                          updateTask(task.id, "title", e.target.value)
                        }
                        placeholder="Task description"
                        className="flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                      />
                      <div className="flex items-center gap-0.5 rounded-md bg-zinc-50 px-1.5">
                        <Input
                          type="number"
                          value={task.estimatedMinutes}
                          onChange={(e) =>
                            updateTask(
                              task.id,
                              "estimatedMinutes",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="h-7 w-12 border-0 bg-transparent p-0 text-center text-xs shadow-none focus-visible:ring-0"
                          min={0}
                        />
                        <span className="text-[10px] text-zinc-400">min</span>
                      </div>
                      <button
                        onClick={() => removeTask(task.id)}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-zinc-300 hover:text-red-400" />
                      </button>
                    </div>
                  ))}

                  {totalMinutes > 0 && (
                    <div className="mt-1 flex items-center justify-end gap-1 pt-1 text-xs text-zinc-400">
                      <span>Total:</span>
                      <span className="font-semibold text-zinc-700">
                        {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3 pb-8">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 gap-2"
              size="lg"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Assignment"
              )}
            </Button>
            <Button variant="outline" onClick={reset} size="lg">
              Start Over
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
