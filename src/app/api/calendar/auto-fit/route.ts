import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { taskIds, dueDate, workStartHour, workEndHour } =
      await request.json();

    if (!taskIds || taskIds.length === 0) {
      return NextResponse.json(
        { error: "taskIds required" },
        { status: 400 }
      );
    }

    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .in("id", taskIds)
      .order("order_index", { ascending: true });

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ error: "No tasks found" }, { status: 404 });
    }

    const due = dueDate ? new Date(dueDate) : null;
    const now = new Date();
    const daysUntilDue = due
      ? Math.max(1, Math.ceil((due.getTime() - now.getTime()) / 86400000))
      : 7;

    const origin = request.nextUrl.origin;
    const slotsRes = await fetch(
      `${origin}/api/calendar/free-slots?days=${daysUntilDue}&workStart=${workStartHour || 8}&workEnd=${workEndHour || 22}&minSlot=15`,
      {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      }
    );

    if (!slotsRes.ok) {
      throw new Error("Failed to fetch free slots");
    }

    const { freeSlots } = await slotsRes.json();

    type ScheduledItem = {
      taskId: string;
      taskTitle: string;
      startTime: string;
      endTime: string;
      estimatedMinutes: number;
    };

    const scheduled: ScheduledItem[] = [];
    const unscheduled: string[] = [];
    let slotIdx = 0;
    let slotUsedMinutes = 0;

    for (const task of tasks) {
      const needed = task.estimated_minutes || 30;
      let placed = false;

      while (slotIdx < freeSlots.length) {
        const slot = freeSlots[slotIdx];
        const available = slot.durationMinutes - slotUsedMinutes;

        if (available >= needed) {
          const slotStart = new Date(slot.start);
          const taskStart = new Date(
            slotStart.getTime() + slotUsedMinutes * 60000
          );
          const taskEnd = new Date(taskStart.getTime() + needed * 60000);

          scheduled.push({
            taskId: task.id,
            taskTitle: task.title,
            startTime: taskStart.toISOString(),
            endTime: taskEnd.toISOString(),
            estimatedMinutes: needed,
          });

          slotUsedMinutes += needed + 10;
          placed = true;
          break;
        } else {
          slotIdx++;
          slotUsedMinutes = 0;
        }
      }

      if (!placed) {
        unscheduled.push(task.title);
      }
    }

    for (const item of scheduled) {
      await supabase.from("calendar_blocks").insert({
        task_id: item.taskId,
        user_id: user.id,
        start_time: item.startTime,
        end_time: item.endTime,
      });

      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "google_calendar_connected, google_access_token, google_refresh_token, google_token_expires_at"
        )
        .eq("id", user.id)
        .single();

      if (
        profile?.google_calendar_connected &&
        profile?.google_access_token
      ) {
        try {
          const task = tasks.find((t: any) => t.id === item.taskId);
          await fetch(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${profile.google_access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                summary: `📚 ${task?.title || item.taskTitle}`,
                start: { dateTime: item.startTime },
                end: { dateTime: item.endTime },
                colorId: "9",
              }),
            }
          );
        } catch {
        }
      }
    }

    return NextResponse.json({
      scheduled,
      unscheduled,
      totalScheduled: scheduled.length,
      totalUnscheduled: unscheduled.length,
      warning:
        unscheduled.length > 0
          ? `Not enough free time to fit ${unscheduled.length} task(s): ${unscheduled.join(", ")}. Try extending your work hours or moving a deadline.`
          : null,
    });
  } catch (error: any) {
    console.error("Auto-fit error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to auto-fit schedule" },
      { status: 500 }
    );
  }
}
