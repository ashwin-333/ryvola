import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { PlusCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Assignment } from "@/lib/types";

const statusConfig = {
  not_started: { label: "Not started", variant: "secondary" as const },
  in_progress: { label: "In progress", variant: "warning" as const },
  completed: { label: "Completed", variant: "success" as const },
};

export default async function AssignmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("assignments")
    .select("*, course:courses(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const assignments = (data as Assignment[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Assignments
          </h1>
          <p className="mt-0.5 text-[13px] text-zinc-400">
            All your assignments in one place.
          </p>
        </div>
        <Link href="/assignments/new">
          <Button size="sm" className="gap-1.5 text-xs">
            <PlusCircle className="h-3.5 w-3.5" />
            Add Assignment
          </Button>
        </Link>
      </div>

      {assignments.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-zinc-200 py-16 text-center">
          <div className="rounded-2xl bg-zinc-100 p-4">
            <PlusCircle className="h-7 w-7 text-zinc-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-700">
              No assignments yet
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Upload a screenshot to get started.
            </p>
          </div>
          <Link href="/assignments/new">
            <Button size="sm">Add your first assignment</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => {
            const sc = statusConfig[a.status];
            return (
              <Link key={a.id} href={`/assignments/${a.id}`}>
                <div className="flex items-center justify-between rounded-xl border border-zinc-200/80 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-zinc-900">
                      {a.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      {a.course && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                          style={{
                            backgroundColor: a.course.color ?? "#6366f1",
                          }}
                        >
                          {a.course.name}
                        </span>
                      )}
                      {a.estimated_minutes > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                          <Clock className="h-3 w-3" />~
                          {Math.round(a.estimated_minutes / 60)}h
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={sc.variant}>{sc.label}</Badge>
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
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
