"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen,
  Loader2,
  X,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ClipboardPaste,
  ImagePlus,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ParsedSyllabus, SyllabusAssignment } from "@/lib/gemini/parse-syllabus";

export default function SyllabusPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsed, setParsed] = useState<ParsedSyllabus | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const processFile = useCallback((f: File) => {
    setFile(f);
    setError(null);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }, []);

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
            const f = new File([blob], `syllabus-${Date.now()}.png`, {
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

      const res = await fetch("/api/parse-syllabus", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to parse syllabus");
      }

      const data: ParsedSyllabus = await res.json();
      setParsed(data);
      setSelected(new Set(data.assignments.map((_, i) => i)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setParsing(false);
    }
  }

  function toggleSelected(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function selectAll() {
    if (!parsed) return;
    setSelected(new Set(parsed.assignments.map((_, i) => i)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  async function handleSave() {
    if (!parsed) return;
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let courseId: string | null = null;
      if (parsed.courseName) {
        const { data: existingCourse } = await supabase
          .from("courses")
          .select("id")
          .eq("user_id", user.id)
          .eq("name", parsed.courseName)
          .single();

        if (existingCourse) {
          courseId = existingCourse.id;
        } else {
          const { data: newCourse } = await supabase
            .from("courses")
            .insert({ user_id: user.id, name: parsed.courseName })
            .select()
            .single();
          courseId = newCourse?.id ?? null;
        }
      }

      let count = 0;
      const selectedAssignments = parsed.assignments.filter((_, i) =>
        selected.has(i)
      );

      for (const sa of selectedAssignments) {
        const { data: assignment, error: insertError } = await supabase
          .from("assignments")
          .insert({
            user_id: user.id,
            course_id: courseId,
            title: sa.title,
            due_date: sa.dueDate ? new Date(sa.dueDate).toISOString() : null,
            requirements: [],
            deliverables: [],
            estimated_minutes: sa.totalEstimatedMinutes,
            status: "not_started",
          })
          .select()
          .single();

        if (insertError) continue;

        if (sa.tasks.length > 0 && assignment) {
          await supabase.from("tasks").insert(
            sa.tasks.map((t, i) => ({
              assignment_id: assignment.id,
              user_id: user.id,
              title: t.title,
              estimated_minutes: t.estimatedMinutes || 30,
              order_index: i,
              status: "pending",
            }))
          );
        }
        count++;
      }

      setSavedCount(count);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setParsed(null);
    setFile(null);
    setPreview(null);
    setError(null);
    setSelected(new Set());
    setSavedCount(0);
  }

  const typeIcon = (type: string) => {
    switch (type) {
      case "exam":
      case "quiz":
        return "📝";
      case "project":
        return "🔨";
      case "paper":
        return "📄";
      default:
        return "📋";
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "exam":
        return "bg-red-50 text-red-700 border-red-200";
      case "quiz":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "project":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "paper":
        return "bg-violet-50 text-violet-700 border-violet-200";
      default:
        return "bg-zinc-50 text-zinc-700 border-zinc-200";
    }
  };

  if (savedCount > 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="rounded-2xl bg-emerald-100 p-5">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">
              Semester planned!
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              {savedCount} assignment{savedCount !== 1 ? "s" : ""} created from your syllabus.
              Your entire semester is now in Ryvola.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => router.push("/assignments")}>
              View Assignments
            </Button>
            <Button variant="outline" onClick={reset}>
              Upload Another Syllabus
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          Upload Syllabus
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload your course syllabus and Ryvola will plan your entire semester
          in seconds.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {!parsed && (
        <div className="space-y-4">
          <div
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
                <div className="rounded-2xl bg-violet-100 p-4">
                  <BookOpen className="h-8 w-8 text-violet-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-zinc-900">
                    Drop your syllabus here, paste from clipboard, or click to
                    upload
                  </p>
                  <p className="mt-1.5 text-xs text-zinc-400">
                    PDF or screenshot (PNG, JPG, WEBP)
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
                      alt="Syllabus preview"
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
                      Analyzing syllabus (this may take a moment)...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4" />
                      Analyze Syllabus
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
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processFile(f);
              }}
            />
          </div>
        </div>
      )}

      {parsed && (
        <div className="space-y-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900">
                    {parsed.courseName}
                  </h2>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                    {parsed.instructor && <span>Prof. {parsed.instructor}</span>}
                    {parsed.semester && <span>{parsed.semester}</span>}
                  </div>
                </div>
                <button
                  onClick={reset}
                  className="text-xs text-zinc-400 hover:text-zinc-600"
                >
                  Start over
                </button>
              </div>
              {parsed.gradingBreakdown && (
                <p className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
                  {parsed.gradingBreakdown}
                </p>
              )}
              {parsed.weeklySchedule && (
                <p className="mt-2 text-xs text-zinc-500">
                  <Calendar className="mr-1 inline h-3 w-3" />
                  {parsed.weeklySchedule}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">
                Found {parsed.assignments.length} items
              </CardTitle>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900"
                >
                  Select all
                </button>
                <span className="text-zinc-300">|</span>
                <button
                  onClick={selectNone}
                  className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900"
                >
                  Select none
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {parsed.assignments.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => toggleSelected(i)}
                    className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                      selected.has(i)
                        ? "border-zinc-300 bg-white shadow-sm"
                        : "border-zinc-100 bg-zinc-50/50 opacity-60"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors ${
                        selected.has(i)
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-300 bg-white"
                      }`}
                    >
                      {selected.has(i) && (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{typeIcon(a.type)}</span>
                        <p className="text-sm font-medium text-zinc-900 truncate">
                          {a.title}
                        </p>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                        <span
                          className={`rounded-full border px-1.5 py-0.5 font-medium capitalize ${typeColor(a.type)}`}
                        >
                          {a.type}
                        </span>
                        {a.dueDate && (
                          <span className="text-zinc-400">
                            Due{" "}
                            {new Date(a.dueDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                        {a.weight && (
                          <span className="text-zinc-400">{a.weight}</span>
                        )}
                        <span className="text-zinc-400">
                          ~{Math.round(a.totalEstimatedMinutes / 60)}h work
                        </span>
                        <span className="text-zinc-400">
                          {a.tasks.length} task{a.tasks.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {selected.size} of {parsed.assignments.length} selected
                </p>
                <p className="text-xs text-zinc-500">
                  ~
                  {Math.round(
                    parsed.assignments
                      .filter((_, i) => selected.has(i))
                      .reduce((s, a) => s + a.totalEstimatedMinutes, 0) / 60
                  )}
                  h total estimated work
                </p>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving || selected.size === 0}
                className="gap-2"
                size="lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating assignments...
                  </>
                ) : (
                  `Add ${selected.size} to Ryvola`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
