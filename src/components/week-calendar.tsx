"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type CalendarBlock = {
  id: string;
  start_time: string;
  end_time: string;
  task?: {
    title: string;
    status: string;
    assignment?: { title: string };
  } | null;
};

const HOUR_HEIGHT = 48;
const START_HOUR = 6;
const END_HOUR = 24;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

const BLOCK_COLORS = [
  "bg-blue-100 border-blue-300 text-blue-800",
  "bg-violet-100 border-violet-300 text-violet-800",
  "bg-emerald-100 border-emerald-300 text-emerald-800",
  "bg-amber-100 border-amber-300 text-amber-800",
  "bg-rose-100 border-rose-300 text-rose-800",
  "bg-cyan-100 border-cyan-300 text-cyan-800",
  "bg-orange-100 border-orange-300 text-orange-800",
];

function getWeekDates(referenceDate: Date): Date[] {
  const d = new Date(referenceDate);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(d);
    date.setDate(diff + i);
    date.setHours(0, 0, 0, 0);
    dates.push(date);
  }
  return dates;
}

function formatHour(h: number): string {
  if (h === 0 || h === 24) return "12 AM";
  if (h === 12) return "12 PM";
  if (h > 12) return `${h - 12} PM`;
  return `${h} AM`;
}

export function WeekCalendar({ blocks }: { blocks: CalendarBlock[] }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const now = new Date();
  const reference = new Date(now);
  reference.setDate(reference.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(reference);

  const assignmentColorMap = new Map<string, string>();
  let colorIdx = 0;

  function getBlockColor(block: CalendarBlock): string {
    const key = block.task?.assignment?.title || block.task?.title || block.id;
    if (!assignmentColorMap.has(key)) {
      assignmentColorMap.set(key, BLOCK_COLORS[colorIdx % BLOCK_COLORS.length]);
      colorIdx++;
    }
    return assignmentColorMap.get(key)!;
  }

  const isThisWeek = weekOffset === 0;
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="text-xs font-semibold text-zinc-800">
            {weekDates[0].toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
          {!isThisWeek && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-[10px] text-blue-500 hover:text-blue-600"
            >
              Back to this week
            </button>
          )}
        </div>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-zinc-100">
        <div />
        {weekDates.map((date, i) => {
          const isToday = date.toDateString() === now.toDateString();
          return (
            <div
              key={i}
              className={cn(
                "border-l border-zinc-100 px-1 py-2 text-center",
                isToday && "bg-blue-50/50"
              )}
            >
              <p className="text-[10px] font-medium text-zinc-400">
                {date.toLocaleDateString("en-US", { weekday: "short" })}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-sm font-semibold",
                  isToday ? "text-blue-600" : "text-zinc-800"
                )}
              >
                {date.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        <div
          className="relative grid grid-cols-[48px_repeat(7,1fr)]"
          style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}
        >
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute left-0 w-[48px] pr-2 text-right"
              style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px` }}
            >
              <span className="relative -top-2 text-[10px] text-zinc-400">
                {formatHour(hour)}
              </span>
            </div>
          ))}

          {HOURS.map((hour) => (
            <div
              key={`line-${hour}`}
              className="absolute left-[48px] right-0 border-t border-zinc-100"
              style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px` }}
            />
          ))}

          {weekDates.map((date, dayIdx) => {
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);

            const dayBlocks = blocks.filter((b) => {
              const s = new Date(b.start_time);
              return s >= dayStart && s <= dayEnd;
            });

            const isToday = date.toDateString() === now.toDateString();

            return (
              <div
                key={dayIdx}
                className={cn(
                  "relative border-l border-zinc-100",
                  isToday && "bg-blue-50/20"
                )}
                style={{
                  gridColumn: `${dayIdx + 2}`,
                  gridRow: "1",
                }}
              >
                {isToday && isThisWeek && currentHour >= START_HOUR && currentHour < END_HOUR && (
                  <div
                    className="absolute left-0 right-0 z-20 border-t-2 border-red-400"
                    style={{
                      top: `${(currentHour - START_HOUR) * HOUR_HEIGHT + (currentMinute / 60) * HOUR_HEIGHT}px`,
                    }}
                  >
                    <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-400" />
                  </div>
                )}

                {dayBlocks.map((block) => {
                  const startDate = new Date(block.start_time);
                  const endDate = new Date(block.end_time);
                  const startHourFloat =
                    startDate.getHours() + startDate.getMinutes() / 60;
                  const endHourFloat =
                    endDate.getHours() + endDate.getMinutes() / 60;

                  if (startHourFloat < START_HOUR) return null;

                  const top =
                    (startHourFloat - START_HOUR) * HOUR_HEIGHT;
                  const height = Math.max(
                    (endHourFloat - startHourFloat) * HOUR_HEIGHT,
                    20
                  );

                  const colorClass = getBlockColor(block);
                  const isCompleted = block.task?.status === "completed";

                  return (
                    <div
                      key={block.id}
                      className={cn(
                        "absolute left-0.5 right-0.5 z-10 overflow-hidden rounded-md border-l-2 px-1.5 py-1",
                        colorClass,
                        isCompleted && "opacity-50"
                      )}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      title={`${block.task?.title || "Session"} (${startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} - ${endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })})`}
                    >
                      <p className="truncate text-[10px] font-semibold leading-tight">
                        {block.task?.title || "Session"}
                      </p>
                      {height > 30 && block.task?.assignment && (
                        <p className="truncate text-[9px] opacity-70">
                          {block.task.assignment.title}
                        </p>
                      )}
                      {height > 45 && (
                        <p className="text-[9px] opacity-60">
                          {startDate.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
