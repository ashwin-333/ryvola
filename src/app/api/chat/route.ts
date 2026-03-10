import { createClient } from "@/lib/supabase/server";
import { getGeminiClient } from "@/lib/gemini/client";
import { NextRequest, NextResponse } from "next/server";

function buildContext(data: {
  assignments: any[];
  tasks: any[];
  blocks: any[];
  profile: any;
}) {
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const activeAssignments = data.assignments
    .filter((a: any) => a.status !== "completed")
    .map((a: any) => {
      const aTasks = data.tasks.filter(
        (t: any) => t.assignment_id === a.id
      );
      const completed = aTasks.filter(
        (t: any) => t.status === "completed"
      ).length;
      const remaining = aTasks.filter(
        (t: any) => t.status !== "completed"
      );
      const remainingMins = remaining.reduce(
        (s: number, t: any) => s + (t.estimated_minutes || 30),
        0
      );
      const dueStr = a.due_date
        ? new Date(a.due_date).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : "no due date";
      const daysUntil = a.due_date
        ? Math.ceil(
            (new Date(a.due_date).getTime() - now.getTime()) / 86400000
          )
        : null;

      return `- "${a.title}" (${a.status.replace("_", " ")}) | Due: ${dueStr}${daysUntil !== null ? ` (${daysUntil} days)` : ""} | ${completed}/${aTasks.length} tasks done | ~${remainingMins}min remaining\n  Remaining tasks: ${remaining.map((t: any) => `"${t.title}" (~${t.estimated_minutes}min)`).join(", ") || "none"}`;
    })
    .join("\n");

  const completedAssignments = data.assignments.filter(
    (a: any) => a.status === "completed"
  ).length;

  const todayBlocks = data.blocks
    .filter((b: any) => {
      const s = new Date(b.start_time);
      return s.toDateString() === now.toDateString();
    })
    .map((b: any) => {
      const task = data.tasks.find((t: any) => t.id === b.task_id);
      const assignment = task
        ? data.assignments.find((a: any) => a.id === task.assignment_id)
        : null;
      return `- ${new Date(b.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}-${new Date(b.end_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}: "${task?.title || "Unknown"}" (${assignment?.title || ""}) [${task?.status || "unknown"}]`;
    })
    .join("\n");

  const upcomingBlocks = data.blocks
    .filter((b: any) => new Date(b.start_time) > now)
    .slice(0, 10)
    .map((b: any) => {
      const task = data.tasks.find((t: any) => t.id === b.task_id);
      const assignment = task
        ? data.assignments.find((a: any) => a.id === task.assignment_id)
        : null;
      return `- ${new Date(b.start_time).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} ${new Date(b.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}: "${task?.title || "Unknown"}" (${assignment?.title || ""})`;
    })
    .join("\n");

  return `CURRENT TIME: ${todayStr} at ${timeStr}
USER: ${data.profile?.full_name || "Student"}

ACTIVE ASSIGNMENTS:
${activeAssignments || "None"}

COMPLETED ASSIGNMENTS: ${completedAssignments}

TODAY'S SCHEDULED SESSIONS:
${todayBlocks || "None scheduled"}

UPCOMING SESSIONS:
${upcomingBlocks || "None"}`;
}

const SYSTEM_PROMPT = `You are Ryvola, a student's personal AI productivity brain. You have complete access to their assignments, tasks, schedule, and deadlines.

Your personality:
- Direct and concise. No fluff. Students are busy.
- Warm but not cheesy. Like a smart friend who has their life together.
- You think in priorities, trade-offs, and realistic time estimates.
- Never use em dashes or en dashes. Use commas, periods, or "or" instead.

Your capabilities:
1. ADVISE: Tell them what to work on and why, based on deadlines and progress.
2. PLAN: Suggest realistic schedules considering their workload.
3. MOTIVATE: When they're stressed, give them a concrete, calming plan.
4. ACT: You can take actions by including ACTION blocks in your response.

ACTIONS - Include these ONLY when the user asks you to do something or when it naturally follows from the conversation. Format exactly like this at the END of your message:

To schedule a task:
[ACTION:SCHEDULE]{"taskId":"<id>","date":"YYYY-MM-DD","startTime":"HH:MM"}[/ACTION]

To mark a task complete:
[ACTION:COMPLETE_TASK]{"taskId":"<id>"}[/ACTION]

To create a quick assignment (no image needed):
[ACTION:CREATE_ASSIGNMENT]{"title":"<title>","dueDate":"YYYY-MM-DDTHH:MM","tasks":[{"title":"<task>","estimatedMinutes":30}]}[/ACTION]

To create a standalone task (not tied to any assignment, for general life/errands):
[ACTION:CREATE_TASK]{"title":"<title>","estimatedMinutes":30}[/ACTION]

To reschedule (deletes old block + creates new one):
[ACTION:RESCHEDULE]{"blockId":"<id>","taskId":"<id>","date":"YYYY-MM-DD","startTime":"HH:MM"}[/ACTION]

IMPORTANT RULES:
- When suggesting what to work on, ALWAYS explain WHY (deadline proximity, difficulty, dependencies).
- When the user seems overwhelmed, break things down into "just do this one thing next" instead of showing everything.
- Reference specific assignment names and task names from their data.
- If they ask to schedule or create something, DO IT with an action block. Don't just suggest.
- Keep responses SHORT. 2-4 sentences for quick questions. Only go longer for planning.
- If they paste a screenshot or mention a new assignment, help them add it.
- Never make up assignments or tasks that don't exist in their data.`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { message, history } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const [
      { data: profile },
      { data: assignments },
      { data: tasks },
      { data: blocks },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("assignments")
        .select("*")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true }),
      supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("order_index", { ascending: true }),
      supabase
        .from("calendar_blocks")
        .select("*")
        .eq("user_id", user.id)
        .gte("end_time", new Date(Date.now() - 86400000).toISOString())
        .order("start_time", { ascending: true }),
    ]);

    const context = buildContext({
      assignments: assignments ?? [],
      tasks: tasks ?? [],
      blocks: blocks ?? [],
      profile,
    });

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const chatHistory = (history || []).map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [
            {
              text: `${SYSTEM_PROMPT}\n\nHere is the student's current data:\n${context}`,
            },
          ],
        },
        {
          role: "model",
          parts: [
            {
              text: "Got it. I have full context on your assignments, tasks, and schedule. What do you need?",
            },
          ],
        },
        ...chatHistory,
      ],
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    const actions: any[] = [];
    const actionRegex =
      /\[ACTION:(\w+)\]([\s\S]*?)\[\/ACTION\]/g;
    let match;

    while ((match = actionRegex.exec(responseText)) !== null) {
      const actionType = match[1];
      let actionData;
      try {
        actionData = JSON.parse(match[2]);
      } catch {
        continue;
      }

      try {
        if (actionType === "COMPLETE_TASK" && actionData.taskId) {
          await supabase
            .from("tasks")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", actionData.taskId)
            .eq("user_id", user.id);

          const task = (tasks ?? []).find(
            (t: any) => t.id === actionData.taskId
          );
          if (task) {
            await supabase.from("progress_signals").insert({
              assignment_id: task.assignment_id,
              user_id: user.id,
              signal_type: "check_in",
              note: `Completed via chat: ${task.title}`,
            });
          }

          actions.push({
            type: "COMPLETE_TASK",
            success: true,
            taskId: actionData.taskId,
          });
        }

        if (actionType === "SCHEDULE" && actionData.taskId) {
          const task = (tasks ?? []).find(
            (t: any) => t.id === actionData.taskId
          );
          const duration = (task?.estimated_minutes || 30) * 60000;
          const startTime = new Date(
            `${actionData.date}T${actionData.startTime}:00`
          );
          const endTime = new Date(startTime.getTime() + duration);

          const res = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL ? "http://localhost:3000" : "http://localhost:3000"}/api/calendar/create-blocks`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                taskId: actionData.taskId,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
              }),
            }
          );

          await supabase.from("calendar_blocks").insert({
            task_id: actionData.taskId,
            user_id: user.id,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
          });

          actions.push({
            type: "SCHEDULE",
            success: true,
            taskId: actionData.taskId,
          });
        }

        if (actionType === "CREATE_ASSIGNMENT" && actionData.title) {
          const dueDateStr = actionData.dueDate
            ? new Date(actionData.dueDate).toISOString()
            : null;
          const taskList = actionData.tasks || [];
          const totalMins = taskList.reduce(
            (s: number, t: any) => s + (t.estimatedMinutes || 30),
            0
          );

          const { data: newAssignment } = await supabase
            .from("assignments")
            .insert({
              user_id: user.id,
              title: actionData.title,
              due_date: dueDateStr,
              requirements: [],
              deliverables: [],
              estimated_minutes: totalMins,
              status: "not_started",
            })
            .select()
            .single();

          if (newAssignment && taskList.length > 0) {
            await supabase.from("tasks").insert(
              taskList.map((t: any, i: number) => ({
                assignment_id: newAssignment.id,
                user_id: user.id,
                title: t.title,
                estimated_minutes: t.estimatedMinutes || 30,
                order_index: i,
                status: "pending",
              }))
            );
          }

          actions.push({
            type: "CREATE_ASSIGNMENT",
            success: true,
            assignmentId: newAssignment?.id,
            title: actionData.title,
          });
        }

        if (actionType === "CREATE_TASK" && actionData.title) {
          await supabase.from("tasks").insert({
            user_id: user.id,
            assignment_id: null,
            title: actionData.title,
            estimated_minutes: actionData.estimatedMinutes || 30,
            order_index: 0,
            status: "pending",
          });

          actions.push({
            type: "CREATE_TASK",
            success: true,
            title: actionData.title,
          });
        }

        if (actionType === "RESCHEDULE" && actionData.blockId) {
          await supabase
            .from("calendar_blocks")
            .delete()
            .eq("id", actionData.blockId)
            .eq("user_id", user.id);

          if (actionData.taskId && actionData.date && actionData.startTime) {
            const task = (tasks ?? []).find(
              (t: any) => t.id === actionData.taskId
            );
            const duration = (task?.estimated_minutes || 30) * 60000;
            const startTime = new Date(
              `${actionData.date}T${actionData.startTime}:00`
            );
            const endTime = new Date(startTime.getTime() + duration);

            await supabase.from("calendar_blocks").insert({
              task_id: actionData.taskId,
              user_id: user.id,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
            });
          }

          actions.push({
            type: "RESCHEDULE",
            success: true,
            blockId: actionData.blockId,
          });
        }
      } catch (actionErr: any) {
        actions.push({
          type: actionType,
          success: false,
          error: actionErr.message,
        });
      }
    }

    const cleanResponse = responseText
      .replace(/\[ACTION:\w+\][\s\S]*?\[\/ACTION\]/g, "")
      .trim();

    return NextResponse.json({
      response: cleanResponse,
      actions,
    });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
