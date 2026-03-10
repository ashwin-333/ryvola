import { Sidebar } from "@/components/sidebar";
import { AIChat } from "@/components/ai-chat";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#f8f8f8]">
        <div className="mx-auto max-w-4xl px-8 py-8">{children}</div>
      </main>
      <AIChat />
    </div>
  );
}
