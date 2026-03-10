"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle2, RotateCcw } from "lucide-react";

export function AssignmentActions({
  assignmentId,
  currentStatus,
}: {
  assignmentId: string;
  currentStatus: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function updateStatus(status: string) {
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from("assignments")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", assignmentId);

    if (status === "completed") {
      await supabase
        .from("tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("assignment_id", assignmentId)
        .neq("status", "completed");
    } else if (status === "in_progress") {
      await supabase
        .from("tasks")
        .update({ status: "pending", completed_at: null })
        .eq("assignment_id", assignmentId)
        .eq("status", "completed");
    }

    setLoading(false);
    router.refresh();
  }

  async function deleteAssignment() {
    if (!confirm("Delete this assignment and all its tasks?")) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("assignments").delete().eq("id", assignmentId);
    router.push("/assignments");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {currentStatus !== "completed" ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => updateStatus("completed")}
          disabled={loading}
          className="gap-1.5"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Mark Complete
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => updateStatus("in_progress")}
          disabled={loading}
          className="gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reopen
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={deleteAssignment}
        disabled={loading}
        className="text-red-500 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
