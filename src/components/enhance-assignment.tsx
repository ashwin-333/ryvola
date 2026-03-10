"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlus,
  Loader2,
  X,
  Brain,
  ClipboardPaste,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function EnhanceAssignment({
  assignmentId,
}: {
  assignmentId: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const processFile = useCallback((f: File) => {
    setFile(f);
    setError(null);
    setSuccess(null);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            const f = new File([blob], `details-${Date.now()}.png`, {
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
  }, [open, processFile]);

  async function handleEnhance() {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("assignmentId", assignmentId);

      const res = await fetch("/api/enhance-assignment", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to analyze");
      }

      const data = await res.json();
      setSuccess(
        `Added ${data.tasksAdded} task${data.tasksAdded !== 1 ? "s" : ""} from the assignment details.`
      );
      setFile(null);
      setPreview(null);

      setTimeout(() => {
        router.refresh();
        setOpen(false);
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-200 p-4 text-sm text-zinc-400 transition-colors hover:border-zinc-300 hover:text-zinc-600"
      >
        <Camera className="h-4 w-4" />
        Add assignment details (screenshot or PDF) for a better task breakdown
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-900">
          Add assignment details
        </p>
        <button
          onClick={() => {
            setOpen(false);
            setFile(null);
            setPreview(null);
            setError(null);
          }}
          className="rounded p-1 text-zinc-400 hover:text-zinc-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {!success && (
        <>
          {!file ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-3 rounded-lg border border-dashed border-zinc-200 p-8 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
            >
              <ImagePlus className="h-6 w-6 text-zinc-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-700">
                  Screenshot the actual assignment prompt
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Drop, click, or press Cmd+V to paste
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1">
                <ClipboardPaste className="h-3 w-3 text-zinc-400" />
                <span className="text-[10px] text-zinc-400">Cmd+V to paste</span>
              </div>
            </button>
          ) : (
            <div className="space-y-3">
              {preview && (
                <div className="relative overflow-hidden rounded-lg bg-zinc-50">
                  <img
                    src={preview}
                    alt="Assignment details"
                    className="mx-auto max-h-40 object-contain"
                  />
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                    }}
                    className="absolute right-2 top-2 rounded-full bg-white/90 p-1 shadow-sm"
                  >
                    <X className="h-3 w-3 text-zinc-500" />
                  </button>
                </div>
              )}
              {!preview && (
                <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3">
                  <span className="text-sm text-zinc-600">{file.name}</span>
                  <button
                    onClick={() => setFile(null)}
                    className="text-xs text-zinc-400 hover:text-zinc-600"
                  >
                    Remove
                  </button>
                </div>
              )}
              <Button
                onClick={handleEnhance}
                disabled={loading}
                className="w-full gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing details...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    Update tasks from this
                  </>
                )}
              </Button>
              <p className="text-center text-[11px] text-zinc-400">
                This will replace generic tasks with a real breakdown based on
                the assignment details. Completed tasks are kept.
              </p>
            </div>
          )}
        </>
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
  );
}
