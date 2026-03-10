"use client";

import { useState, useEffect } from "react";
import { Brain, Loader2, TrendingUp, Clock, Zap, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TimeData = {
  hasData: boolean;
  dataPoints: number;
  correctionFactor: number;
  avgAccuracy: number;
  totalEstimated: number;
  totalActual: number;
  accuracyPoints: { estimated: number; actual: number; title: string }[];
  bestProductiveWindow: string | null;
  productivityByDay: { day: string; count: number }[];
  avgDailyMinutes: number;
  pendingMinutes: number;
  adjustedPendingMinutes: number;
  insights: string[];
};

export function TimeIntelligence() {
  const [data, setData] = useState<TimeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/time-intelligence")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          <span className="text-sm text-zinc-400">Analyzing your patterns...</span>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const maxDayCount = Math.max(...data.productivityByDay.map((d) => d.count), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-violet-500" />
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-zinc-400">
          Time Intelligence
        </h2>
        {data.hasData && (
          <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-600">
            Based on {data.dataPoints} sessions
          </span>
        )}
      </div>

      {data.insights.length > 0 && (
        <Card className="border-violet-100 bg-gradient-to-r from-violet-50/60 to-blue-50/60">
          <CardContent className="p-4">
            <div className="space-y-2.5">
              {data.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-zinc-700">
                  <Zap className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-violet-500" />
                  <span className="leading-relaxed">{insight}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.hasData && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-zinc-400">
                <TrendingUp className="h-3.5 w-3.5" />
                Estimation Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-zinc-900">
                  {data.avgAccuracy}%
                </span>
                <span className="text-xs text-zinc-400">
                  {data.avgAccuracy > 100 ? "over" : "under"}
                </span>
              </div>
              <div className="space-y-1.5">
                {data.accuracyPoints.map((p, i) => {
                  const ratio = p.actual / (p.estimated || 1);
                  const color =
                    ratio > 1.3
                      ? "bg-red-400"
                      : ratio < 0.7
                        ? "bg-blue-400"
                        : "bg-emerald-400";
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-24 truncate text-[10px] text-zinc-500">
                        {p.title}
                      </span>
                      <div className="flex-1">
                        <div className="flex h-1.5 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className={`${color} rounded-full transition-all`}
                            style={{
                              width: `${Math.min(ratio * 50, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="w-14 text-right text-[10px] text-zinc-500">
                        {p.actual}m / {p.estimated}m
                      </span>
                    </div>
                  );
                })}
              </div>
              {data.correctionFactor !== 1 && (
                <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-700">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                  Ryvola adjusts your estimates by {data.correctionFactor}x
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-zinc-400">
                <Clock className="h-3.5 w-3.5" />
                Productivity Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.bestProductiveWindow && (
                <div className="mb-4">
                  <p className="text-xs text-zinc-500">Peak window</p>
                  <p className="text-lg font-bold text-zinc-900">
                    {data.bestProductiveWindow}
                  </p>
                </div>
              )}
              {data.avgDailyMinutes > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-zinc-500">Avg daily focus time</p>
                  <p className="text-lg font-bold text-zinc-900">
                    {Math.round((data.avgDailyMinutes / 60) * 10) / 10}h
                  </p>
                </div>
              )}
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                Activity by day
              </p>
              <div className="flex items-end justify-between gap-1">
                {data.productivityByDay.map((d, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full max-w-[24px] rounded-sm transition-all"
                      style={{
                        height: `${Math.max((d.count / maxDayCount) * 48, d.count > 0 ? 6 : 2)}px`,
                        backgroundColor:
                          d.count > 0 ? "rgb(139 92 246)" : "rgb(228 228 231)",
                      }}
                    />
                    <span className="text-[9px] text-zinc-400">{d.day}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
