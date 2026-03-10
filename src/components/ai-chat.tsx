"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  CheckCircle2,
  CalendarPlus,
  PlusCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: ActionResult[];
  timestamp: Date;
};

type ActionResult = {
  type: string;
  success: boolean;
  title?: string;
  taskId?: string;
  assignmentId?: string;
  error?: string;
};

const ACTION_ICONS: Record<string, typeof CheckCircle2> = {
  COMPLETE_TASK: CheckCircle2,
  SCHEDULE: CalendarPlus,
  CREATE_ASSIGNMENT: PlusCircle,
  RESCHEDULE: RefreshCw,
};

const ACTION_LABELS: Record<string, string> = {
  COMPLETE_TASK: "Marked task complete",
  SCHEDULE: "Scheduled session",
  CREATE_ASSIGNMENT: "Created assignment",
  CREATE_TASK: "Added task",
  RESCHEDULE: "Rescheduled session",
};

const SUGGESTIONS = [
  "What should I work on right now?",
  "Am I on track this week?",
  "I'm feeling overwhelmed",
  "Plan my day for me",
];

export function AIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), history }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get response");
      }

      const data = await res.json();

      const aiMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: data.response,
        actions: data.actions?.length > 0 ? data.actions : undefined,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);

      if (data.actions?.some((a: ActionResult) => a.success)) {
        router.refresh();
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: "Sorry, something went wrong. Try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-zinc-900 shadow-lg transition-all hover:bg-zinc-800 hover:scale-105",
          open && "hidden"
        )}
        title="Chat with Ryvola (Cmd+K)"
      >
        <Image src="/ryvolalogo.png" alt="Ryvola" width={64} height={64} className="h-16 w-16 max-w-none object-contain" />
      </button>

      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[560px] w-[400px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-zinc-900">
                <Image src="/ryvolalogo.png" alt="Ryvola" width={64} height={64} className="h-16 w-16 max-w-none object-contain" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">Ryvola</p>
                <p className="text-[10px] text-zinc-400">
                  Your productivity brain
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-zinc-100">
                  <Image src="/ryvolalogo.png" alt="Ryvola" width={64} height={64} className="h-16 w-16 max-w-none object-contain" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-700">
                    Hey! I'm your study brain.
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    I know all your assignments and deadlines. Ask me anything.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="rounded-full border border-zinc-200 px-3 py-1.5 text-[11px] text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-2.5",
                        msg.role === "user"
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-800"
                      )}
                    >
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
                        {msg.content}
                      </p>

                      {msg.actions && msg.actions.length > 0 && (
                        <div className="mt-2 space-y-1 border-t border-zinc-200/50 pt-2">
                          {msg.actions.map((action, i) => {
                            const Icon =
                              ACTION_ICONS[action.type] || CheckCircle2;
                            return (
                              <div
                                key={i}
                                className={cn(
                                  "flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px]",
                                  action.success
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-red-50 text-red-600"
                                )}
                              >
                                <Icon className="h-3 w-3" />
                                {action.success
                                  ? ACTION_LABELS[action.type] ||
                                    "Action completed"
                                  : `Failed: ${action.error || "Unknown error"}`}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-3">
                      <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-zinc-100 p-3">
            <div className="flex items-end gap-2 rounded-xl bg-zinc-50 px-3 py-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                rows={1}
                className="max-h-24 flex-1 resize-none bg-transparent text-sm text-zinc-800 placeholder:text-zinc-400 outline-none"
                style={{
                  height: "auto",
                  minHeight: "24px",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(target.scrollHeight, 96)}px`;
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white transition-colors hover:bg-zinc-800 disabled:opacity-30"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-zinc-300">
              Cmd+K to toggle
            </p>
          </div>
        </div>
      )}
    </>
  );
}
