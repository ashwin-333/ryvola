"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CheckCircle2, Loader2 } from "lucide-react";

export function CalendarConnect({ connected }: { connected: boolean }) {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    window.location.href = "/api/calendar/connect";
  }

  if (connected) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-zinc-900">
              Google Calendar connected
            </p>
            <p className="text-xs text-zinc-500">
              Work sessions will be added to your calendar automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2">
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900">
              Connect Google Calendar
            </p>
            <p className="text-xs text-zinc-500">
              Let Ryvola schedule work blocks on your calendar.
            </p>
          </div>
        </div>
        <Button onClick={handleConnect} disabled={loading} size="sm">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Connect"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
