import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseAssignmentFromImage } from "@/lib/gemini/parse-assignment";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const assignmentId = formData.get("assignmentId") as string | null;

    if (!file || !assignmentId) {
      return NextResponse.json(
        { error: "File and assignment ID are required" },
        { status: 400 }
      );
    }

    const { data: assignment } = await supabase
      .from("assignments")
      .select("*")
      .eq("id", assignmentId)
      .eq("user_id", user.id)
      .single();

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const parsed = await parseAssignmentFromImage(buffer, file.type);

    await supabase
      .from("tasks")
      .delete()
      .eq("assignment_id", assignmentId)
      .eq("user_id", user.id)
      .neq("status", "completed");

    const { data: remaining } = await supabase
      .from("tasks")
      .select("id")
      .eq("assignment_id", assignmentId)
      .eq("status", "completed");

    const startIndex = (remaining ?? []).length;

    if (parsed.tasks.length > 0) {
      await supabase.from("tasks").insert(
        parsed.tasks.map((t, i) => ({
          assignment_id: assignmentId,
          user_id: user.id,
          title: t.title,
          estimated_minutes: t.estimatedMinutes || 30,
          order_index: startIndex + i,
          status: "pending",
        }))
      );
    }

    const totalMinutes =
      parsed.totalEstimatedMinutes +
      (remaining ?? []).length * 30;

    await supabase
      .from("assignments")
      .update({
        description: parsed.deliverables.join("\n") || assignment.description,
        requirements:
          parsed.requirements.length > 0
            ? parsed.requirements
            : assignment.requirements,
        deliverables:
          parsed.deliverables.length > 0
            ? parsed.deliverables
            : assignment.deliverables,
        estimated_minutes: totalMinutes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignmentId);

    return NextResponse.json({
      success: true,
      tasksAdded: parsed.tasks.length,
      title: parsed.title,
    });
  } catch (error: any) {
    console.error("Enhance assignment error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to enhance assignment" },
      { status: 500 }
    );
  }
}
