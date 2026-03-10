import { cn } from "@/lib/utils";

type Props = {
  blocks: {
    start_time: string;
    end_time: string;
    task_id: string;
  }[];
  assignments: {
    id: string;
    title: string;
    due_date: string | null;
    status: string;
  }[];
};

export function WorkloadForecast({ blocks, assignments }: Props) {
  const now = new Date();
  const days: {
    label: string;
    dateLabel: string;
    hours: number;
    deadlines: string[];
    isToday: boolean;
  }[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    const dEnd = new Date(d);
    dEnd.setHours(23, 59, 59, 999);

    const dayBlocks = blocks.filter((b) => {
      const s = new Date(b.start_time);
      return s >= d && s <= dEnd;
    });

    const totalMins = dayBlocks.reduce((sum, b) => {
      const start = new Date(b.start_time).getTime();
      const end = new Date(b.end_time).getTime();
      return sum + (end - start) / 60000;
    }, 0);

    const deadlines = assignments
      .filter((a) => {
        if (!a.due_date || a.status === "completed") return false;
        const due = new Date(a.due_date);
        return due >= d && due <= dEnd;
      })
      .map((a) => a.title);

    days.push({
      label: i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" }),
      dateLabel: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      hours: Math.round((totalMins / 60) * 10) / 10,
      deadlines,
      isToday: i === 0,
    });
  }

  const maxHours = Math.max(...days.map((d) => d.hours), 1);

  function getIntensity(hours: number): {
    bg: string;
    bar: string;
    label: string;
  } {
    if (hours === 0) return { bg: "bg-zinc-50", bar: "bg-zinc-200", label: "Free" };
    if (hours <= 1) return { bg: "bg-emerald-50", bar: "bg-emerald-400", label: "Light" };
    if (hours <= 2.5) return { bg: "bg-blue-50", bar: "bg-blue-400", label: "Moderate" };
    if (hours <= 4) return { bg: "bg-amber-50", bar: "bg-amber-400", label: "Busy" };
    return { bg: "bg-red-50", bar: "bg-red-400", label: "Heavy" };
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-zinc-400">
          Next 7 Days
        </h3>
        <div className="flex items-center gap-2 text-[9px] text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Light
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> Moderate
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Busy
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Heavy
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => {
          const intensity = getIntensity(day.hours);
          return (
            <div
              key={i}
              className={cn(
                "rounded-lg p-2 text-center transition-colors",
                intensity.bg,
                day.isToday && "ring-1 ring-zinc-300"
              )}
            >
              <p
                className={cn(
                  "text-[10px] font-semibold",
                  day.isToday ? "text-zinc-900" : "text-zinc-500"
                )}
              >
                {day.label}
              </p>
              <p className="text-[9px] text-zinc-400">{day.dateLabel}</p>

              <div className="mx-auto mt-2 h-12 w-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={cn(
                    "w-full rounded-full transition-all",
                    intensity.bar
                  )}
                  style={{
                    height: `${day.hours > 0 ? Math.max((day.hours / maxHours) * 100, 10) : 0}%`,
                    marginTop: "auto",
                  }}
                />
              </div>

              <p className="mt-1.5 text-[10px] font-medium text-zinc-600">
                {day.hours > 0 ? `${day.hours}h` : "-"}
              </p>

              {day.deadlines.length > 0 && (
                <div className="mt-1">
                  {day.deadlines.map((d, j) => (
                    <p
                      key={j}
                      className="truncate text-[8px] font-semibold text-red-500"
                      title={d}
                    >
                      Due: {d}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
