import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
) {
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
}

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

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { blockId } = await request.json();

    if (!blockId) {
      return NextResponse.json(
        { error: "blockId is required" },
        { status: 400 }
      );
    }

    const { data: block } = await supabase
      .from("calendar_blocks")
      .select("*")
      .eq("id", blockId)
      .eq("user_id", user.id)
      .single();

    if (!block) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    if (block.google_event_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

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
          await deleteCalendarEvent(accessToken, block.google_event_id);
        }
      }
    }

    const { error } = await supabase
      .from("calendar_blocks")
      .delete()
      .eq("id", blockId)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete block error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete block" },
      { status: 500 }
    );
  }
}
