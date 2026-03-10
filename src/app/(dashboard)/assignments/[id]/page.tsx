import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Calendar, CalendarPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskCheckIn } from "@/components/task-check-in";
import { ScheduleTaskButton } from "@/components/schedule-task-button";
import { AssignmentActions } from "@/components/assignment-actions";
import { ScheduleAllButton } from "@/components/schedule-all-button";
import { AutoScheduleButton } from "@/components/auto-schedule-button";
import { SharePlanButton } from "@/components/share-plan-button";
import { EnhanceAssignment } from "@/components/enhance-assignment";
import type { Assignment, Task, CalendarBlock } from "@/lib/types";

export default async function AssignmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: assignment } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!assignment) notFound();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, assignment:assignments(*)")
    .eq("assignment_id", params.id)
    .order("order_index", { ascending: true });

  const taskIds = (tasks ?? []).map((t: any) => t.id);
  const { data: calendarBlocks } = taskIds.length > 0
    ? await supabase
        .from("calendar_blocks")
        .select("*")
        .eq("user_id", user.id)
        .in("task_id", taskIds)
    : { data: [] };

  const blocksByTaskId = new Map<string, CalendarBlock>();
  (calendarBlocks ?? []).forEach((b: any) => {
    blocksByTaskId.set(b.task_id, b as CalendarBlock);
  });

  const a = assignment as Assignment;
  const taskList = (tasks as (Task & { assignment: Assignment })[]) ?? [];
  const completedTasks = taskList.filter(
    (t) => t.status === "completed"
  ).length;
  const progress =
    taskList.length > 0
      ? Math.round((completedTasks / taskList.length) * 100)
      : 0;

  const statusConfig = {
    not_started: { label: "Not started", variant: "secondary" as const },
    in_progress: { label: "In progress", variant: "warning" as const },
    completed: { label: "Completed", variant: "success" as const },
  };
  const sc = statusConfig[a.status];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/assignments"
        className="inline-flex items-center gap-1 text-[13px] text-zinc-400 transition-colors hover:text-zinc-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Assignments
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            {a.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <Badge variant={sc.variant}>{sc.label}</Badge>
            {a.due_date && (
              <span className="flex items-center gap-1 text-[12px] text-zinc-400">
                <Calendar className="h-3 w-3" />
                Due{" "}
                {new Date(a.due_date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
            {a.estimated_minutes > 0 && (
              <span className="flex items-center gap-1 text-[12px] text-zinc-400">
                <Clock className="h-3 w-3" />~
                {Math.round(a.estimated_minutes / 60)}h estimated
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SharePlanButton assignmentId={a.id} />
          {taskList.filter((t) => t.status !== "completed").length > 0 && (
            <AutoScheduleButton
              tasks={taskList.filter((t) => t.status !== "completed")}
              dueDate={a.due_date}
            />
          )}
          <AssignmentActions assignmentId={a.id} currentStatus={a.status} />
        </div>
      </div>

      {taskList.length > 0 && (
        <div className="rounded-xl border border-zinc-200/80 bg-white p-4">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-zinc-500">
              {completedTasks} of {taskList.length} tasks
            </span>
            <span className="font-semibold text-zinc-900">{progress}%</span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {a.deliverables && a.deliverables.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[13px] font-semibold uppercase tracking-wider text-zinc-400">
              Deliverables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {a.deliverables.map((d, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-[13px] leading-relaxed text-zinc-700"
                >
                  <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-300" />
                  {d}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {a.requirements && a.requirements.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[13px] font-semibold uppercase tracking-wider text-zinc-400">
              Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {a.requirements.map((r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-[13px] leading-relaxed text-zinc-700"
                >
                  <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-300" />
                  {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-[13px] font-semibold uppercase tracking-wider text-zinc-400">
            Tasks
          </CardTitle>
          {taskList.filter((t) => t.status !== "completed").length > 0 && (
            <ScheduleAllButton
              tasks={taskList.filter((t) => t.status !== "completed")}
            />
          )}
        </CardHeader>
        <CardContent>
          {taskList.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-zinc-400">
              No tasks for this assignment.
            </p>
          ) : (
            <div className="space-y-1">
              {taskList.map((task) => (
                <div key={task.id} className="flex items-center gap-1">
                  <div className="min-w-0 flex-1">
                    <TaskCheckIn task={task} />
                  </div>
                  {task.status !== "completed" && (
                    <ScheduleTaskButton
                      task={task}
                      block={blocksByTaskId.get(task.id) ?? null}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {a.status !== "completed" && (
        <EnhanceAssignment assignmentId={a.id} />
      )}
    </div>
  );
}
