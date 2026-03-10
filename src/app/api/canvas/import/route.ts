import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type ParsedEvent = {
  title: string;
  dueDate: string | null;
  courseName: string | null;
  description: string | null;
};

function parseICS(icsText: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const blocks = icsText.split("BEGIN:VEVENT");

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];

    const getField = (name: string): string | null => {
      const regex = new RegExp(`${name}[^:]*:(.+)`, "m");
      const match = block.match(regex);
      return match ? match[1].trim().replace(/\\n/g, " ").replace(/\\/g, "") : null;
    };

    const summary = getField("SUMMARY");
    const dtend = getField("DTEND") || getField("DTSTART");
    const description = getField("DESCRIPTION");

    if (!summary) continue;

    let dueDate: string | null = null;
    if (dtend) {
      const cleaned = dtend.replace(/[^0-9TZ]/g, "");
      if (cleaned.length >= 8) {
        const year = cleaned.substring(0, 4);
        const month = cleaned.substring(4, 6);
        const day = cleaned.substring(6, 8);
        let hour = "23";
        let minute = "59";
        if (cleaned.length >= 13) {
          hour = cleaned.substring(9, 11);
          minute = cleaned.substring(11, 13);
        }
        dueDate = `${year}-${month}-${day}T${hour}:${minute}:00Z`;
      }
    }

    let courseName: string | null = null;
    let title = summary;

    const bracketMatch = summary.match(/^\[([^\]]+)\]\s*(.+)/);
    const colonMatch = summary.match(/^(.+?):\s+(.+)/);

    if (bracketMatch) {
      courseName = bracketMatch[1];
      title = bracketMatch[2];
    } else if (colonMatch && colonMatch[1].length < 40) {
      courseName = colonMatch[1];
      title = colonMatch[2];
    }

    if (dueDate && new Date(dueDate) < new Date()) continue;

    events.push({ title, dueDate, courseName, description });
  }

  return events.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

function generateTasks(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("exam") || lower.includes("midterm") || lower.includes("final")) {
    return [
      { title: "Review lecture notes", estimatedMinutes: 45 },
      { title: "Practice problems", estimatedMinutes: 60 },
      { title: "Make study guide", estimatedMinutes: 30 },
      { title: "Final review session", estimatedMinutes: 30 },
    ];
  }
  if (lower.includes("quiz")) {
    return [
      { title: "Review relevant material", estimatedMinutes: 20 },
      { title: "Practice/self-test", estimatedMinutes: 15 },
    ];
  }
  if (lower.includes("paper") || lower.includes("essay")) {
    return [
      { title: "Research and gather sources", estimatedMinutes: 45 },
      { title: "Create outline", estimatedMinutes: 20 },
      { title: "Write first draft", estimatedMinutes: 60 },
      { title: "Revise and edit", estimatedMinutes: 30 },
      { title: "Final proofread and submit", estimatedMinutes: 15 },
    ];
  }
  if (lower.includes("project") || lower.includes("presentation")) {
    return [
      { title: "Plan and outline", estimatedMinutes: 20 },
      { title: "Research/build", estimatedMinutes: 90 },
      { title: "Review and polish", estimatedMinutes: 30 },
      { title: "Prepare for submission", estimatedMinutes: 15 },
    ];
  }
  if (lower.includes("discussion") || lower.includes("post")) {
    return [
      { title: "Read prompt and research", estimatedMinutes: 15 },
      { title: "Write response", estimatedMinutes: 20 },
      { title: "Reply to classmates", estimatedMinutes: 10 },
    ];
  }
  if (lower.includes("lab")) {
    return [
      { title: "Pre-lab preparation", estimatedMinutes: 15 },
      { title: "Complete lab work", estimatedMinutes: 45 },
      { title: "Write up results", estimatedMinutes: 30 },
    ];
  }
  return [
    { title: "Review requirements", estimatedMinutes: 10 },
    { title: "Complete assignment", estimatedMinutes: 45 },
    { title: "Review and submit", estimatedMinutes: 10 },
  ];
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

    const body = await request.json();

    if (body.feedUrl) {
      const feedUrl = body.feedUrl.trim();

      const res = await fetch(feedUrl);
      if (!res.ok) {
        throw new Error(
          "Could not fetch that calendar feed. Make sure the URL is correct and publicly accessible."
        );
      }

      const icsText = await res.text();
      if (!icsText.includes("BEGIN:VCALENDAR")) {
        throw new Error(
          "That URL does not appear to be a valid calendar feed (iCal/ICS format)."
        );
      }

      const events = parseICS(icsText);

      return NextResponse.json({
        step: "preview",
        events,
        totalFound: events.length,
      });
    }

    if (body.events) {
      const events: ParsedEvent[] = body.events;
      let totalImported = 0;
      const imported: { title: string; courseName: string | null }[] = [];

      for (const event of events) {
        let courseId: string | null = null;
        if (event.courseName) {
          const { data: existing } = await supabase
            .from("courses")
            .select("id")
            .eq("user_id", user.id)
            .eq("name", event.courseName)
            .single();

          if (existing) {
            courseId = existing.id;
          } else {
            const { data: newCourse } = await supabase
              .from("courses")
              .insert({ user_id: user.id, name: event.courseName })
              .select()
              .single();
            courseId = newCourse?.id ?? null;
          }
        }

        const { data: dup } = await supabase
          .from("assignments")
          .select("id")
          .eq("user_id", user.id)
          .eq("title", event.title)
          .single();

        if (dup) continue;

        const tasks = generateTasks(event.title);
        const totalMins = tasks.reduce((s, t) => s + t.estimatedMinutes, 0);

        const { data: assignment } = await supabase
          .from("assignments")
          .insert({
            user_id: user.id,
            course_id: courseId,
            title: event.title,
            due_date: event.dueDate,
            requirements: [],
            deliverables: [],
            estimated_minutes: totalMins,
            status: "not_started",
          })
          .select()
          .single();

        if (assignment && tasks.length > 0) {
          await supabase.from("tasks").insert(
            tasks.map((t, i) => ({
              assignment_id: assignment.id,
              user_id: user.id,
              title: t.title,
              estimated_minutes: t.estimatedMinutes,
              order_index: i,
              status: "pending",
            }))
          );
        }

        totalImported++;
        imported.push({ title: event.title, courseName: event.courseName });
      }

      return NextResponse.json({
        step: "done",
        totalImported,
        importedAssignments: imported,
      });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to import" },
      { status: 500 }
    );
  }
}
