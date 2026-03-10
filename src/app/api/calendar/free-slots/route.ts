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

async function fetchGoogleEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
) {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    throw new Error(`Google Calendar API error: ${res.status}`);
  }

  return res.json();
}

type TimeSlot = {
  start: string;
  end: string;
  durationMinutes: number;
};

function findFreeSlots(
  events: any[],
  dayStart: Date,
  dayEnd: Date,
  workStartHour: number,
  workEndHour: number,
  minSlotMinutes: number
): TimeSlot[] {
  const busy: { start: Date; end: Date }[] = events
    .filter((e: any) => {
      if (e.transparency === "transparent") return false;
      return e.start?.dateTime;
    })
    .map((e: any) => ({
      start: new Date(e.start.dateTime),
      end: new Date(e.end.dateTime),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const slots: TimeSlot[] = [];
  const days = Math.ceil(
    (dayEnd.getTime() - dayStart.getTime()) / 86400000
  );

  for (let d = 0; d < days; d++) {
    const date = new Date(dayStart);
    date.setDate(date.getDate() + d);

    const workStart = new Date(date);
    workStart.setHours(workStartHour, 0, 0, 0);
    const workEnd = new Date(date);
    workEnd.setHours(workEndHour, 0, 0, 0);

    if (workStart < new Date()) {
      const now = new Date();
      const roundedMinutes = Math.ceil(now.getMinutes() / 15) * 15;
      workStart.setHours(now.getHours(), roundedMinutes, 0, 0);
      if (workStart < now) workStart.setMinutes(workStart.getMinutes() + 15);
    }

    if (workStart >= workEnd) continue;

    const dayBusy = busy.filter(
      (b) => b.end > workStart && b.start < workEnd
    );

    let cursor = workStart.getTime();

    for (const b of dayBusy) {
      const busyStart = Math.max(b.start.getTime(), workStart.getTime());
      if (cursor < busyStart) {
        const gapMinutes = (busyStart - cursor) / 60000;
        if (gapMinutes >= minSlotMinutes) {
          slots.push({
            start: new Date(cursor).toISOString(),
            end: new Date(busyStart).toISOString(),
            durationMinutes: Math.round(gapMinutes),
          });
        }
      }
      cursor = Math.max(cursor, b.end.getTime());
    }

    if (cursor < workEnd.getTime()) {
      const gapMinutes = (workEnd.getTime() - cursor) / 60000;
      if (gapMinutes >= minSlotMinutes) {
        slots.push({
          start: new Date(cursor).toISOString(),
          end: new Date(workEnd.getTime()).toISOString(),
          durationMinutes: Math.round(gapMinutes),
        });
      }
    }
  }

  return slots;
}

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "7");
    const workStartHour = parseInt(searchParams.get("workStart") || "8");
    const workEndHour = parseInt(searchParams.get("workEnd") || "22");
    const minSlotMinutes = parseInt(searchParams.get("minSlot") || "30");

    const now = new Date();
    const rangeStart = new Date(now);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(now);
    rangeEnd.setDate(rangeEnd.getDate() + days);
    rangeEnd.setHours(23, 59, 59, 999);

    let googleEvents: any[] = [];

    if (profile?.google_calendar_connected && profile?.google_refresh_token) {
      let accessToken = profile.google_access_token;
      const expiresAt = profile.google_token_expires_at
        ? new Date(profile.google_token_expires_at)
        : null;

      if (!expiresAt || expiresAt < new Date()) {
        const refreshed = await refreshAccessToken(
          profile.google_refresh_token
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
        const calData = await fetchGoogleEvents(
          accessToken,
          rangeStart.toISOString(),
          rangeEnd.toISOString()
        );
        googleEvents = calData.items || [];
      }
    }

    const { data: ryvolaBlocks } = await supabase
      .from("calendar_blocks")
      .select("start_time, end_time")
      .eq("user_id", user.id)
      .gte("start_time", rangeStart.toISOString())
      .lte("start_time", rangeEnd.toISOString());

    const ryvolaBusy = (ryvolaBlocks ?? []).map((b: any) => ({
      start: { dateTime: b.start_time },
      end: { dateTime: b.end_time },
    }));

    const allEvents = [...googleEvents, ...ryvolaBusy];

    const freeSlots = findFreeSlots(
      allEvents,
      rangeStart,
      rangeEnd,
      workStartHour,
      workEndHour,
      minSlotMinutes
    );

    return NextResponse.json({
      freeSlots,
      totalFreeMinutes: freeSlots.reduce((s, f) => s + f.durationMinutes, 0),
      googleConnected: !!profile?.google_calendar_connected,
      daysScanned: days,
    });
  } catch (error: any) {
    console.error("Free slots error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to find free slots" },
      { status: 500 }
    );
  }
}
