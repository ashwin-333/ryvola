import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Flame,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskCheckIn } from "@/components/task-check-in";
import { SessionTimer } from "@/components/session-timer";
import { MissedSessions } from "@/components/missed-sessions";
import { DailyBriefing } from "@/components/daily-briefing";
import { WorkloadForecast } from "@/components/workload-forecast";
import { QuickAddTask } from "@/components/quick-add-task";
import { DeadlineWarnings } from "@/components/deadline-warnings";
import { Onboarding } from "@/components/onboarding";
import type { Task, Assignment } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: todayTasks } = await supabase
    .from("tasks")
    .select("*, assignment:assignments(*)")
    .eq("user_id", user.id)
    .in("status", ["pending", "in_progress"])
    .order("order_index", { ascending: true })
    .limit(10);

  const { data: upcomingAssignments } = await supabase
    .from("assignments")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["not_started", "in_progress"])
    .order("due_date", { ascending: true })
    .limit(5);

  const { data: completedCount } = await supabase
    .from("assignments")
    .select("id", { count: "exact" })
    .eq("user_id", user.id)
    .eq("status", "completed");

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const { data: todaySessions } = await supabase
    .from("calendar_blocks")
    .select("*, task:tasks(*, assignment:assignments(title))")
    .eq("user_id", user.id)
    .gte("start_time", todayStart.toISOString())
    .lte("start_time", todayEnd.toISOString())
    .order("start_time", { ascending: true });

  const { data: missedBlocks } = await supabase
    .from("calendar_blocks")
    .select("*, task:tasks(id, title, status, estimated_minutes, assignment_id, user_id, assignment:assignments(title))")
    .eq("user_id", user.id)
    .lt("end_time", now.toISOString())
    .lt("start_time", todayStart.toISOString())
    .order("start_time", { ascending: false })
    .limit(10);

  const missedIncomplete = (missedBlocks ?? []).filter(
    (b: any) => b.task?.status !== "completed"
  );

  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const { data: weekBlocks } = await supabase
    .from("calendar_blocks")
    .select("start_time, end_time, task_id")
    .eq("user_id", user.id)
    .gte("start_time", todayStart.toISOString())
    .lte("start_time", weekEnd.toISOString());

  const { data: recentSignals } = await supabase
    .from("progress_signals")
    .select("created_at")
    .eq("user_id", user.id)
    .eq("signal_type", "check_in")
    .order("created_at", { ascending: false })
    .limit(60);

  let streak = 0;
  if (recentSignals && recentSignals.length > 0) {
    const days = new Set<string>();
    recentSignals.forEach((s: any) => {
      days.add(new Date(s.created_at).toLocaleDateString());
    });
    const sortedDays = Array.from(days).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    const today = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();

    if (sortedDays[0] === today || sortedDays[0] === yesterday) {
      streak = 1;
      for (let i = 1; i < sortedDays.length; i++) {
        const curr = new Date(sortedDays[i - 1]);
        const prev = new Date(sortedDays[i]);
        const diffDays = Math.round(
          (curr.getTime() - prev.getTime()) / 86400000
        );
        if (diffDays === 1) {
          streak++;
        } else {
          break;
        }
      }
    }
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const tasks = (todayTasks as (Task & { assignment: Assignment })[]) ?? [];
  const assignments = (upcomingAssignments as Assignment[]) ?? [];
  const completed = completedCount?.length ?? 0;
  const sessions = todaySessions ?? [];

  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          {greeting}, {firstName}
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          {sessions.length > 0
            ? `You have ${sessions.length} session${sessions.length > 1 ? "s" : ""} today.`
            : "Here's what's on your plate."}
        </p>
      </div>

      {tasks.length === 0 && assignments.length === 0 && <Onboarding />}

      <DailyBriefing />

      <div className="grid grid-cols-4 gap-3">
        <Card className="border-0 bg-blue-50/80 shadow-none">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-blue-100 p-2.5">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-blue-900">{tasks.length}</p>
              <p className="text-[11px] font-medium text-blue-600/70">
                Tasks to do
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-amber-50/80 shadow-none">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-amber-100 p-2.5">
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-amber-900">
                {assignments.length}
              </p>
              <p className="text-[11px] font-medium text-amber-600/70">
                Active
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-emerald-50/80 shadow-none">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-emerald-100 p-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-900">{completed}</p>
              <p className="text-[11px] font-medium text-emerald-600/70">
                Completed
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-orange-50/80 shadow-none">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-orange-100 p-2.5">
              <Flame className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-orange-900">{streak}</p>
              <p className="text-[11px] font-medium text-orange-600/70">
                Day streak
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {missedIncomplete.length > 0 && (
        <MissedSessions blocks={missedIncomplete as any} />
      )}

      <DeadlineWarnings
        assignments={assignments as any}
        tasks={tasks as any}
      />

      {sessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">
              Today&apos;s Sessions
            </h2>
            <Link
              href="/calendar"
              className="text-[11px] font-medium text-zinc-400 hover:text-zinc-600"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {sessions.map((session: any) => (
              <SessionTimer key={session.id} block={session} />
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base">Up Next</CardTitle>
          <Link href="/assignments/new">
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
              <PlusCircle className="h-3 w-3" />
              Add Assignment
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="rounded-2xl bg-zinc-100 p-4">
                <CheckCircle2 className="h-6 w-6 text-zinc-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-700">
                  All clear!
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  No tasks yet.{" "}
                  <Link
                    href="/assignments/new"
                    className="font-medium text-zinc-700 underline underline-offset-4"
                  >
                    Add an assignment
                  </Link>{" "}
                  to get started.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {tasks.map((task) => (
                <TaskCheckIn key={task.id} task={task} />
              ))}
            </div>
          )}
          <div className="mt-2">
            <QuickAddTask />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <WorkloadForecast
            blocks={(weekBlocks ?? []) as any}
            assignments={assignments as any}
          />
        </CardContent>
      </Card>

      {assignments.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {assignments.map((a) => (
                <Link
                  key={a.id}
                  href={`/assignments/${a.id}`}
                  className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-zinc-50"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {a.title}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {a.estimated_minutes
                        ? `~${Math.round(a.estimated_minutes / 60)}h estimated`
                        : "No estimate"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Badge
                      variant={
                        a.status === "in_progress" ? "warning" : "secondary"
                      }
                    >
                      {a.status === "not_started"
                        ? "Not started"
                        : "In progress"}
                    </Badge>
                    {a.due_date && (
                      <span className="text-[11px] text-zinc-400">
                        Due{" "}
                        {new Date(a.due_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
