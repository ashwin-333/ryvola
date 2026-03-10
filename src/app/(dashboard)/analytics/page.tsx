import { createClient } from "@/lib/supabase/server";
import {
  Flame,
  Clock,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeIntelligence } from "@/components/time-intelligence";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: allTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id);

  const { data: allAssignments } = await supabase
    .from("assignments")
    .select("*")
    .eq("user_id", user.id);

  const { data: allBlocks } = await supabase
    .from("calendar_blocks")
    .select("*")
    .eq("user_id", user.id);

  const { data: signals } = await supabase
    .from("progress_signals")
    .select("*")
    .eq("user_id", user.id)
    .eq("signal_type", "check_in")
    .order("created_at", { ascending: false });

  const tasks = allTasks ?? [];
  const assignments = allAssignments ?? [];
  const blocks = allBlocks ?? [];
  const checkIns = signals ?? [];

  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const totalTasks = tasks.length;
  const taskCompletionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const completedAssignments = assignments.filter(
    (a) => a.status === "completed"
  ).length;
  const totalAssignments = assignments.length;
  const assignmentCompletionRate =
    totalAssignments > 0
      ? Math.round((completedAssignments / totalAssignments) * 100)
      : 0;

  const totalScheduledMins = blocks.reduce((sum, b) => {
    const start = new Date(b.start_time).getTime();
    const end = new Date(b.end_time).getTime();
    return sum + (end - start) / 60000;
  }, 0);
  const totalScheduledHours = Math.round(totalScheduledMins / 60 * 10) / 10;

  const totalEstimatedMins = tasks.reduce(
    (sum, t) => sum + (t.estimated_minutes || 0),
    0
  );
  const totalEstimatedHours = Math.round(totalEstimatedMins / 60 * 10) / 10;

  let streak = 0;
  if (checkIns.length > 0) {
    const days = new Set<string>();
    checkIns.forEach((s: any) => {
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
        if (diffDays === 1) streak++;
        else break;
      }
    }
  }

  const weekDays: { label: string; tasks: number; hours: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const dEnd = new Date(d);
    dEnd.setHours(23, 59, 59, 999);

    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
    const dayTasks = tasks.filter((t) => {
      if (!t.completed_at) return false;
      const c = new Date(t.completed_at);
      return c >= d && c <= dEnd;
    }).length;

    const dayMins = blocks
      .filter((b) => {
        const s = new Date(b.start_time);
        return s >= d && s <= dEnd;
      })
      .reduce((sum, b) => {
        const start = new Date(b.start_time).getTime();
        const end = new Date(b.end_time).getTime();
        return sum + (end - start) / 60000;
      }, 0);

    weekDays.push({ label: dayLabel, tasks: dayTasks, hours: Math.round(dayMins / 60 * 10) / 10 });
  }

  const maxWeekTasks = Math.max(...weekDays.map((d) => d.tasks), 1);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">
          Analytics
        </h1>
        <p className="mt-0.5 text-[13px] text-zinc-400">
          Track your productivity and build momentum.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-0 bg-orange-50/80 shadow-none">
          <CardContent className="p-4">
            <Flame className="mb-2 h-5 w-5 text-orange-500" />
            <p className="text-2xl font-bold text-orange-900">{streak}</p>
            <p className="text-[11px] font-medium text-orange-600/70">
              Day streak
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-blue-50/80 shadow-none">
          <CardContent className="p-4">
            <Clock className="mb-2 h-5 w-5 text-blue-500" />
            <p className="text-2xl font-bold text-blue-900">
              {totalScheduledHours}h
            </p>
            <p className="text-[11px] font-medium text-blue-600/70">
              Time scheduled
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-emerald-50/80 shadow-none">
          <CardContent className="p-4">
            <CheckCircle2 className="mb-2 h-5 w-5 text-emerald-500" />
            <p className="text-2xl font-bold text-emerald-900">
              {completedTasks}
            </p>
            <p className="text-[11px] font-medium text-emerald-600/70">
              Tasks done
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-violet-50/80 shadow-none">
          <CardContent className="p-4">
            <Target className="mb-2 h-5 w-5 text-violet-500" />
            <p className="text-2xl font-bold text-violet-900">
              {taskCompletionRate}%
            </p>
            <p className="text-[11px] font-medium text-violet-600/70">
              Completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] font-semibold uppercase tracking-wider text-zinc-400">
            This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2">
            {weekDays.map((day, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-col items-center">
                  <span className="mb-1 text-[10px] font-medium text-zinc-500">
                    {day.tasks > 0 ? day.tasks : ""}
                  </span>
                  <div
                    className="w-full max-w-[32px] rounded-md bg-emerald-200 transition-all"
                    style={{
                      height: `${Math.max((day.tasks / maxWeekTasks) * 80, day.tasks > 0 ? 8 : 3)}px`,
                      backgroundColor:
                        day.tasks > 0
                          ? "rgb(110 231 183)"
                          : "rgb(228 228 231)",
                    }}
                  />
                </div>
                <span className="text-[10px] text-zinc-400">{day.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-zinc-400">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-emerald-300" />
              Tasks completed
            </span>
          </div>
        </CardContent>
      </Card>

      <TimeIntelligence />

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[13px] font-semibold uppercase tracking-wider text-zinc-400">
              Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Completed</span>
              <span className="text-sm font-semibold text-zinc-900">
                {completedAssignments} / {totalAssignments}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${assignmentCompletionRate}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Estimated work</span>
              <span className="text-sm font-semibold text-zinc-900">
                {totalEstimatedHours}h
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[13px] font-semibold uppercase tracking-wider text-zinc-400">
              Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Total scheduled</span>
              <span className="text-sm font-semibold text-zinc-900">
                {blocks.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Time scheduled</span>
              <span className="text-sm font-semibold text-zinc-900">
                {totalScheduledHours}h
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Check-ins</span>
              <span className="text-sm font-semibold text-zinc-900">
                {checkIns.length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
