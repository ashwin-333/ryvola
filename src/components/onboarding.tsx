"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ImagePlus,
  BookOpen,
  Download,
  Calendar,
  ArrowRight,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ONBOARDING_KEY = "ryvola_onboarded";

const steps = [
  {
    title: "Screenshot any assignment",
    description:
      "Take a screenshot or photo of your assignment prompt. Ryvola reads it and builds your plan instantly.",
    icon: ImagePlus,
    color: "bg-blue-100 text-blue-600",
    action: { label: "Add Assignment", href: "/assignments/new" },
  },
  {
    title: "Upload your syllabus",
    description:
      "Upload your course syllabus and Ryvola extracts every deadline, exam, and project for the whole semester.",
    icon: BookOpen,
    color: "bg-violet-100 text-violet-600",
    action: { label: "Upload Syllabus", href: "/syllabus" },
  },
  {
    title: "Import from your LMS",
    description:
      "Paste one link from Canvas, Blackboard, or Moodle and Ryvola pulls in all your assignments.",
    icon: Download,
    color: "bg-emerald-100 text-emerald-600",
    action: { label: "Import Assignments", href: "/import" },
  },
  {
    title: "Connect Google Calendar",
    description:
      "Link your calendar so Ryvola can find your free time and auto-schedule study sessions.",
    icon: Calendar,
    color: "bg-orange-100 text-orange-600",
    action: { label: "Go to Calendar", href: "/calendar" },
  },
];

export function Onboarding() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  });

  if (dismissed) return null;

  function dismiss() {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setDismissed(true);
  }

  function goTo(href: string) {
    dismiss();
    router.push(href);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-zinc-100">
            <Image
              src="/ryvolalogo.png"
              alt="Ryvola"
              width={48}
              height={48}
              className="h-12 w-12 max-w-none object-contain"
            />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              Welcome to Ryvola
            </h2>
            <p className="text-xs text-zinc-500">
              Pick any way to get started. No setup required.
            </p>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="text-[11px] text-zinc-400 hover:text-zinc-600"
        >
          Dismiss
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {steps.map((step, i) => (
          <button
            key={i}
            onClick={() => goTo(step.action.href)}
            className="group flex flex-col items-start rounded-xl border border-zinc-100 p-4 text-left transition-all hover:border-zinc-200 hover:shadow-sm"
          >
            <div className={`rounded-lg p-2 ${step.color}`}>
              <step.icon className="h-4 w-4" />
            </div>
            <p className="mt-3 text-sm font-medium text-zinc-900">
              {step.title}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
              {step.description}
            </p>
            <span className="mt-3 flex items-center gap-1 text-[11px] font-medium text-zinc-400 transition-colors group-hover:text-zinc-900">
              {step.action.label}
              <ArrowRight className="h-3 w-3" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
