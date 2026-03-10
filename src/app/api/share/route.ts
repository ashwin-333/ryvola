import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function generateShareCode() {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { assignmentId } = await request.json();

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Assignment ID required" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("shared_plans")
      .select("*")
      .eq("assignment_id", assignmentId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (existing) {
      return NextResponse.json({
        shareCode: existing.share_code,
        shareUrl: `/shared/${existing.share_code}`,
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const shareCode = generateShareCode();

    const { error: insertError } = await supabase.from("shared_plans").insert({
      assignment_id: assignmentId,
      user_id: user.id,
      share_code: shareCode,
      sharer_name: profile?.full_name?.split(" ")[0] || "A student",
    });

    if (insertError) throw insertError;

    return NextResponse.json({
      shareCode,
      shareUrl: `/shared/${shareCode}`,
    });
  } catch (error: any) {
    console.error("Share error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to share" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { assignmentId } = await request.json();

    await supabase
      .from("shared_plans")
      .update({ is_active: false })
      .eq("assignment_id", assignmentId)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed" },
      { status: 500 }
    );
  }
}
