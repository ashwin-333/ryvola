import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  return res.json();
}

async function createCalendarEvent(
  accessToken: string,
  summary: string,
  startTime: string,
  endTime: string
) {
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: `📚 ${summary}`,
        start: { dateTime: startTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        end: { dateTime: endTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        colorId: "9",
        reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 5 }] },
      }),
    }
  );
  return res.json();
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const body = await request.json();
    const { taskId, startTime, endTime } = body;

    if (!taskId || !startTime || !endTime) {
      return NextResponse.json(
        { error: "taskId, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    const { data: task } = await supabase
      .from("tasks")
      .select("*, assignment:assignments(title)")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    let googleEventId: string | null = null;

    const calendarConnected =
      profile?.google_calendar_connected && profile?.google_refresh_token;

    if (calendarConnected) {
      let accessToken = profile.google_access_token;
      const expiresAt = profile.google_token_expires_at
        ? new Date(profile.google_token_expires_at)
        : null;

      if (!expiresAt || expiresAt < new Date()) {
        const refreshed = await refreshAccessToken(
          profile.google_refresh_token!
        );
        if (refreshed.access_token) {
          accessToken = refreshed.access_token;
          await supabase
            .from("profiles")
            .update({
              google_access_token: accessToken,
              google_token_expires_at: new Date(
                Date.now() + refreshed.expires_in * 1000
              ).toISOString(),
            })
            .eq("id", user.id);
        }
      }

      if (accessToken) {
        const summary = `${task.title} - ${(task as any).assignment?.title || "Ryvola"}`;
        const event = await createCalendarEvent(
          accessToken,
          summary,
          startTime,
          endTime
        );
        googleEventId = event.id || null;
      }
    }

    const { data: block, error: blockError } = await supabase
      .from("calendar_blocks")
      .insert({
        task_id: taskId,
        user_id: user.id,
        google_event_id: googleEventId,
        start_time: startTime,
        end_time: endTime,
      })
      .select()
      .single();

    if (blockError) throw blockError;

    return NextResponse.json({ block, googleEventId });
  } catch (error: any) {
    console.error("Create blocks error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create calendar block" },
      { status: 500 }
    );
  }
}
