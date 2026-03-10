import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const [{ data: tasks }, { data: blocks }, { data: signals }] =
      await Promise.all([
        supabase
          .from("tasks")
          .select("*, assignment:assignments(title)")
          .eq("user_id", user.id),
        supabase
          .from("calendar_blocks")
          .select("*")
          .eq("user_id", user.id)
          .not("actual_minutes", "is", null),
        supabase
          .from("progress_signals")
          .select("created_at")
          .eq("user_id", user.id)
          .eq("signal_type", "check_in")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

    const allTasks = tasks ?? [];
    const allBlocks = blocks ?? [];
    const allSignals = signals ?? [];

    const completedWithActual = allTasks.filter(
      (t) => t.status === "completed" && t.actual_minutes != null
    );

    let avgAccuracy = 1;
    let totalEstimated = 0;
    let totalActual = 0;
    const accuracyPoints: { estimated: number; actual: number; title: string }[] = [];

    for (const t of completedWithActual) {
      const est = t.estimated_minutes || 30;
      const act = t.actual_minutes!;
      totalEstimated += est;
      totalActual += act;
      accuracyPoints.push({ estimated: est, actual: act, title: t.title });
    }

    if (totalEstimated > 0) {
      avgAccuracy = totalActual / totalEstimated;
    }

    const hourBuckets: Record<number, { count: number; totalMinutes: number }> = {};
    for (const b of allBlocks) {
      const hour = new Date(b.start_time).getHours();
      if (!hourBuckets[hour]) hourBuckets[hour] = { count: 0, totalMinutes: 0 };
      hourBuckets[hour].count++;
      hourBuckets[hour].totalMinutes += b.actual_minutes || 0;
    }

    let bestHourStart = 9;
    let bestHourScore = 0;
    for (let h = 6; h <= 20; h++) {
      const score =
        (hourBuckets[h]?.count || 0) +
        (hourBuckets[h + 1]?.count || 0) +
        (hourBuckets[h + 2]?.count || 0);
      if (score > bestHourScore) {
        bestHourScore = score;
        bestHourStart = h;
      }
    }

    const dayBuckets: Record<number, number> = {};
    for (const s of allSignals) {
      const day = new Date(s.created_at).getDay();
      dayBuckets[day] = (dayBuckets[day] || 0) + 1;
    }
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const productivityByDay = dayNames.map((name, i) => ({
      day: name,
      count: dayBuckets[i] || 0,
    }));

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const recentBlocks = allBlocks.filter(
      (b) => new Date(b.start_time) >= thirtyDaysAgo
    );
    const dayMinutes: Record<string, number> = {};
    for (const b of recentBlocks) {
      const day = new Date(b.start_time).toDateString();
      dayMinutes[day] = (dayMinutes[day] || 0) + (b.actual_minutes || 0);
    }
    const activeDays = Object.keys(dayMinutes).length;
    const avgDailyMinutes =
      activeDays > 0
        ? Math.round(
            Object.values(dayMinutes).reduce((s, m) => s + m, 0) / activeDays
          )
        : 0;

    const correctionFactor =
      completedWithActual.length >= 3 ? Math.round(avgAccuracy * 100) / 100 : 1;

    const pendingTasks = allTasks.filter((t) => t.status !== "completed");
    const pendingMinutes = pendingTasks.reduce(
      (s, t) => s + (t.estimated_minutes || 30),
      0
    );
    const adjustedPendingMinutes = Math.round(pendingMinutes * correctionFactor);

    return NextResponse.json({
      hasData: completedWithActual.length >= 3,
      dataPoints: completedWithActual.length,
      correctionFactor,
      avgAccuracy: Math.round(avgAccuracy * 100),
      totalEstimated,
      totalActual,
      accuracyPoints: accuracyPoints.slice(-10),
      bestProductiveWindow: bestHourScore > 0
        ? `${formatHour(bestHourStart)} to ${formatHour(bestHourStart + 3)}`
        : null,
      productivityByDay,
      avgDailyMinutes,
      pendingMinutes,
      adjustedPendingMinutes,
      insights: buildInsights({
        avgAccuracy,
        correctionFactor,
        bestHourStart,
        bestHourScore,
        avgDailyMinutes,
        pendingMinutes,
        adjustedPendingMinutes,
        dataPoints: completedWithActual.length,
      }),
    });
  } catch (error: any) {
    console.error("Time intelligence error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze" },
      { status: 500 }
    );
  }
}

function formatHour(h: number) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function buildInsights(data: {
  avgAccuracy: number;
  correctionFactor: number;
  bestHourStart: number;
  bestHourScore: number;
  avgDailyMinutes: number;
  pendingMinutes: number;
  adjustedPendingMinutes: number;
  dataPoints: number;
}) {
  const insights: string[] = [];

  if (data.dataPoints < 3) {
    insights.push(
      "Complete a few more timed sessions so Ryvola can learn your pace and give you personalized insights."
    );
    return insights;
  }

  if (data.avgAccuracy > 1.3) {
    const pct = Math.round((data.avgAccuracy - 1) * 100);
    insights.push(
      `You tend to take ${pct}% longer than estimated. Ryvola will adjust future estimates by ${data.correctionFactor}x to be more realistic.`
    );
  } else if (data.avgAccuracy < 0.7) {
    const pct = Math.round((1 - data.avgAccuracy) * 100);
    insights.push(
      `You finish ${pct}% faster than estimated. Nice. Ryvola will tighten future estimates.`
    );
  } else {
    insights.push(
      "Your time estimates are pretty accurate. Keep it up."
    );
  }

  if (data.bestHourScore > 2) {
    insights.push(
      `You're most productive between ${formatHour(data.bestHourStart)} and ${formatHour(data.bestHourStart + 3)}. Try to schedule important work in that window.`
    );
  }

  if (data.avgDailyMinutes > 0) {
    const hrs = Math.round((data.avgDailyMinutes / 60) * 10) / 10;
    insights.push(
      `On days you work, you average about ${hrs} hours of focused time.`
    );
  }

  if (
    data.adjustedPendingMinutes > 0 &&
    data.avgDailyMinutes > 0 &&
    data.adjustedPendingMinutes > data.avgDailyMinutes * 5
  ) {
    const daysNeeded = Math.ceil(
      data.adjustedPendingMinutes / data.avgDailyMinutes
    );
    insights.push(
      `At your current pace, you need about ${daysNeeded} working days to finish everything. Plan accordingly.`
    );
  }

  return insights;
}
