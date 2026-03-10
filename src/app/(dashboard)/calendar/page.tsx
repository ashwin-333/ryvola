import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Calendar,
  ArrowRight,
  Upload,
  CalendarPlus,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarConnect } from "@/components/calendar-connect";
import { SessionRow } from "@/components/session-row";
import { WeekCalendar } from "@/components/week-calendar";

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("google_calendar_connected")
    .eq("id", user.id)
    .single();

  const connected = profile?.google_calendar_connected ?? false;

  const rangeStart = new Date();
  rangeStart.setDate(rangeStart.getDate() - 14);
  const rangeEnd = new Date();
  rangeEnd.setDate(rangeEnd.getDate() + 28);

  const { data: allBlocks } = await supabase
    .from("calendar_blocks")
    .select("*, task:tasks(title, status, assignment:assignments(title))")
    .eq("user_id", user.id)
    .gte("start_time", rangeStart.toISOString())
    .lte("start_time", rangeEnd.toISOString())
    .order("start_time", { ascending: true });

  const { data: upcomingBlocks } = await supabase
    .from("calendar_blocks")
    .select("*, task:tasks(*, assignment:assignments(title))")
    .eq("user_id", user.id)
    .gte("end_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(20);

  const hasBlocks = allBlocks && allBlocks.length > 0;
  const hasUpcoming = upcomingBlocks && upcomingBlocks.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Calendar
          </h1>
          <p className="mt-0.5 text-[13px] text-zinc-400">
            Your schedule at a glance.
          </p>
        </div>
        <CalendarConnect connected={connected} />
      </div>

      {!hasBlocks && (
        <Card className="border-blue-100 bg-blue-50/30">
          <CardContent className="p-4">
            <p className="mb-3 text-xs font-semibold text-blue-800">
              How to schedule work sessions
            </p>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">
                  1
                </div>
                <div className="flex items-center gap-1.5 text-xs text-blue-700">
                  <Upload className="h-3 w-3 flex-shrink-0" />
                  <span>
                    <Link
                      href="/assignments/new"
                      className="font-medium underline underline-offset-2"
                    >
                      Add an assignment
                    </Link>{" "}
                    or quick-add a task from the dashboard
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">
                  2
                </div>
                <div className="flex items-center gap-1.5 text-xs text-blue-700">
                  <CalendarPlus className="h-3 w-3 flex-shrink-0" />
                  <span>
                    Click <strong>Schedule</strong> on a task, use{" "}
                    <strong>Schedule for me</strong>, or ask the AI chat
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">
                  3
                </div>
                <div className="flex items-center gap-1.5 text-xs text-blue-700">
                  <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                  <span>
                    Your sessions appear here and on Google Calendar if connected
                  </span>
                </div>
              </div>
            </div>
            <Link
              href="/assignments"
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
            >
              Go to Assignments
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      )}

      <WeekCalendar blocks={(allBlocks ?? []) as any} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] font-semibold uppercase tracking-wider text-zinc-400">
            Upcoming Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasUpcoming ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="rounded-2xl bg-zinc-100 p-4">
                <Calendar className="h-6 w-6 text-zinc-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-700">
                  No upcoming sessions
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Schedule tasks from an assignment or quick-add from the
                  dashboard.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {upcomingBlocks.map((block: any) => (
                <SessionRow key={block.id} block={block} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
