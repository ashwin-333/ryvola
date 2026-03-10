"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Calendar,
  BarChart3,
  BookOpen,
  Download,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/assignments", label: "Assignments", icon: FileText },
  { href: "/assignments/new", label: "Add Assignment", icon: PlusCircle },
  { href: "/syllabus", label: "Upload Syllabus", icon: BookOpen },
  { href: "/import", label: "Import from LMS", icon: Download },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

function getActiveHref(pathname: string): string | null {
  const exact = navItems.find((item) => item.href === pathname);
  if (exact) return exact.href;
  return (
    navItems
      .filter((item) => pathname.startsWith(item.href + "/"))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const activeHref = getActiveHref(pathname);
  const [collapsed, setCollapsed] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside
      className={cn(
        "flex h-screen flex-shrink-0 flex-col border-r border-zinc-200/60 bg-white transition-all duration-200",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
    >
      <div className="flex h-14 items-center justify-between px-3">
        <Link href="/dashboard" className="flex items-center overflow-hidden">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden">
            <Image
              src="/ryvolalogo.png"
              alt="Ryvola"
              width={64}
              height={64}
              className="h-16 w-16 max-w-none translate-y-[1px] object-contain"
              priority
            />
          </div>
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className={cn("h-px bg-zinc-100", collapsed ? "mx-2" : "mx-4")} />

      <nav className="flex-1 px-2 pt-3">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-lg transition-colors duration-75",
                  collapsed
                    ? "justify-center px-0 py-2"
                    : "gap-3 px-3 py-2",
                  isActive
                    ? "bg-zinc-900 font-medium text-white"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && (
                  <span className="text-[13px]">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className={cn("border-t border-zinc-100 px-2 py-2.5")}>
        <button
          onClick={handleSignOut}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "flex w-full items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-600",
            collapsed
              ? "justify-center px-0 py-2"
              : "gap-3 px-3 py-2"
          )}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span className="text-[13px]">Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
