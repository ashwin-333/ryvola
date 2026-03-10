"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PreviewEvent = {
  title: string;
  dueDate: string | null;
  courseName: string | null;
  description: string | null;
};

export default function ImportPage() {
  const router = useRouter();
  const [feedUrl, setFeedUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<PreviewEvent[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    totalImported: number;
    importedAssignments: { title: string; courseName: string | null }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchPreview() {
    if (!feedUrl.trim()) {
      setError("Please paste your calendar feed URL");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/canvas/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedUrl: feedUrl.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load feed");

      if (data.events && data.events.length > 0) {
        setEvents(data.events);
        setSelected(new Set(data.events.map((_: any, i: number) => i)));
      } else {
        setError(
          "No upcoming assignments found in that feed. Make sure it contains future events."
        );
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!events) return;
    setImporting(true);
    setError(null);

    try {
      const selectedEvents = events.filter((_, i) => selected.has(i));
      const res = await fetch("/api/canvas/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: selectedEvents }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
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

  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="rounded-2xl bg-emerald-100 p-5">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">
              Import complete!
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              {result.totalImported} assignment
              {result.totalImported !== 1 ? "s" : ""} imported and ready to plan.
            </p>
          </div>
          {result.importedAssignments.length > 0 && (
            <Card className="w-full max-w-md text-left">
              <CardContent className="p-4">
                <div className="space-y-2">
                  {result.importedAssignments.slice(0, 10).map((a, i) => (
                    <div key={i} className="text-sm">
                      <p className="font-medium text-zinc-900">{a.title}</p>
                      {a.courseName && (
                        <p className="text-[11px] text-zinc-400">
                          {a.courseName}
                        </p>
                      )}
                    </div>
                  ))}
                  {result.importedAssignments.length > 10 && (
                    <p className="text-xs text-zinc-400">
                      + {result.importedAssignments.length - 10} more
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          <div className="flex gap-3 pt-2">
            <Button onClick={() => router.push("/assignments")}>
              View Assignments
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setEvents(null);
                setFeedUrl("");
              }}
            >
              Import More
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
          Import Assignments
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Pull in all your assignments from Canvas, Blackboard, Moodle, or any
          LMS with one link.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {!events && (
        <div className="space-y-5">
          <Card className="border-blue-100 bg-blue-50/50">
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-zinc-900">
                How to get your calendar feed link (30 seconds)
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-blue-700">
                    Canvas
                  </p>
                  <ol className="space-y-1 text-[13px] text-zinc-600">
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">
                        1
                      </span>
                      Go to <strong>Calendar</strong> in Canvas
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">
                        2
                      </span>
                      Click <strong>Calendar Feed</strong> at the bottom
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">
                        3
                      </span>
                      Copy the URL and paste it below
                    </li>
                  </ol>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-blue-700">
                    Blackboard / Moodle / Other
                  </p>
                  <p className="text-[13px] text-zinc-600">
                    Look for "Calendar export", "iCal feed", or "Subscribe to
                    calendar" in your LMS settings. Copy the URL that ends in{" "}
                    <code className="rounded bg-blue-100 px-1 py-0.5 text-[11px]">
                      .ics
                    </code>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">
                Paste your calendar feed URL
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500">Feed URL</Label>
                <Input
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder="https://canvas.university.edu/feeds/calendars/..."
                  onKeyDown={(e) => e.key === "Enter" && fetchPreview()}
                />
              </div>
              <Button
                onClick={fetchPreview}
                disabled={loading}
                className="w-full gap-2"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading assignments...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Load Assignments
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {events && (
        <div className="space-y-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">
                Found {events.length} upcoming items
              </CardTitle>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setSelected(new Set(events.map((_, i) => i)))
                  }
                  className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900"
                >
                  Select all
                </button>
                <span className="text-zinc-300">|</span>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900"
                >
                  None
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {events.map((event, i) => (
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
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        {event.title}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                        {event.courseName && (
                          <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-600">
                            {event.courseName}
                          </span>
                        )}
                        {event.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due{" "}
                            {new Date(event.dueDate).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              onClick={handleImport}
              disabled={importing || selected.size === 0}
              className="flex-1 gap-2"
              size="lg"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${selected.size} assignment${selected.size !== 1 ? "s" : ""}`
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEvents(null);
                setFeedUrl("");
              }}
              size="lg"
            >
              Back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
