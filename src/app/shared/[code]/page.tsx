import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function SharedPlanPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: share } = await supabase
    .from("shared_plans")
    .select("*, assignment:assignments(*, tasks:tasks(*))")
    .eq("share_code", code)
    .eq("is_active", true)
    .single();

  if (!share || !share.assignment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f8f8]">
        <div className="text-center">
          <h1 className="text-xl font-bold text-zinc-900">Plan not found</h1>
          <p className="mt-2 text-sm text-zinc-500">
            This link may have expired or been removed.
          </p>
          <Link href="/login">
            <Button className="mt-4">Try Ryvola</Button>
          </Link>
        </div>
      </div>
    );
  }

  await supabase
    .from("shared_plans")
    .update({ views: (share.views || 0) + 1 })
    .eq("id", share.id);

  const assignment = share.assignment as any;
  const tasks = (assignment.tasks || []).sort(
    (a: any, b: any) => a.order_index - b.order_index
  );
  const completedTasks = tasks.filter(
    (t: any) => t.status === "completed"
  ).length;
  const totalMinutes = tasks.reduce(
    (s: number, t: any) => s + (t.estimated_minutes || 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link href="/login" className="flex items-center gap-2">
            <Image
              src="/ryvolalogo.png"
              alt="Ryvola"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
            <span className="text-sm font-semibold text-zinc-900">Ryvola</span>
          </Link>
          <Link href="/login">
            <Button size="sm" className="gap-1.5 text-xs">
              Get your own plan
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-6 rounded-xl bg-gradient-to-r from-violet-50 to-blue-50 p-4">
          <p className="text-sm text-zinc-700">
            <span className="font-semibold">{share.sharer_name}</span> shared
            their study plan with you
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Created with Ryvola, the AI study planner
          </p>
        </div>

        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{assignment.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              {assignment.due_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Due{" "}
                  {new Date(assignment.due_date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />~
                {Math.round(totalMinutes / 60)}h estimated
              </span>
              <span>
                {completedTasks}/{tasks.length} tasks done
              </span>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Task Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tasks.map((task: any, i: number) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-100 text-[10px] font-bold text-zinc-500">
                    {i + 1}
                  </span>
                  {task.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 flex-shrink-0 text-zinc-300" />
                  )}
                  <span
                    className={`flex-1 text-sm ${
                      task.status === "completed"
                        ? "text-zinc-400 line-through"
                        : "text-zinc-700"
                    }`}
                  >
                    {task.title}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    {task.estimated_minutes}m
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 text-center">
          <h3 className="text-base font-semibold text-zinc-900">
            Want Ryvola to plan your assignments too?
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            Screenshot any assignment and get an instant study plan with
            calendar scheduling.
          </p>
          <Link href="/login">
            <Button className="mt-4 gap-2">
              Get started for free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
