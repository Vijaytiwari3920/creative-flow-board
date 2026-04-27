import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Board } from "@/components/board/Board";
import { AIChatPanel } from "@/components/chat/AIChatPanel";
import { Button } from "@/components/ui/button";
import { Search, Plus, Sparkles } from "lucide-react";
import type { TaskStatus } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";

const Index = () => {
  const { profile, user } = useAuth();
  const { data: tasks = [] } = useTasks();
  const [search, setSearch] = useState("");
  const [openDialogStatus, setOpenDialogStatus] = useState<TaskStatus | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const firstName = (profile?.display_name ?? user?.email?.split("@")[0] ?? "there").split(" ")[0];

  const stats = {
    total: tasks.length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
    overdue: tasks.filter((t) => {
      if (!t.due_date || t.status === "done") return false;
      return new Date(t.due_date) < new Date(new Date().toDateString());
    }).length,
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar onOpenChat={() => setChatOpen(true)} />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-4">
          <div className="flex-1 relative max-w-2xl">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="w-full h-11 pl-10 pr-4 bg-secondary rounded-full border-0 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button
            variant="outline"
            className="hidden sm:flex"
            onClick={() => setChatOpen(true)}
          >
            <Sparkles className="h-4 w-4 mr-2 text-primary" />
            Ask AI
          </Button>
          <Button onClick={() => setOpenDialogStatus("todo")} className="font-medium">
            <Plus className="h-4 w-4 mr-1.5" />
            New task
          </Button>
        </header>

        {/* Welcome + stats */}
        <section className="px-6 pt-6 pb-4">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {firstName}!
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor your project and tasks in here.
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            <StatCard label="Total Tasks" value={stats.total} accent="bg-primary-soft" textAccent="text-accent-foreground" />
            <StatCard label="In Progress" value={stats.inProgress} accent="bg-amber-50" textAccent="text-priority-medium" />
            <StatCard label="Completed" value={stats.done} accent="bg-emerald-50" textAccent="text-success" />
            <StatCard label="Overdue" value={stats.overdue} accent="bg-red-50" textAccent="text-priority-high" />
          </div>
        </section>

        {/* Board */}
        <div className="flex-1 min-h-0 mt-2">
          <Board
            search={search}
            openDialogStatus={openDialogStatus}
            setOpenDialogStatus={setOpenDialogStatus}
          />
        </div>
      </main>

      {/* Floating chat button (mobile + extra discoverability) */}
      <button
        onClick={() => setChatOpen(true)}
        className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--col-review))] text-primary-foreground shadow-elevated flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open AI assistant"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      <AIChatPanel open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
};

function StatCard({
  label,
  value,
  accent,
  textAccent,
}: { label: string; value: number; accent: string; textAccent: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl px-4 py-3.5 shadow-card hover:shadow-card-hover transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className={`h-7 w-7 rounded-lg ${accent} flex items-center justify-center`}>
          <span className={`h-2 w-2 rounded-full ${textAccent.replace("text-", "bg-")}`} />
        </span>
      </div>
      <div className="text-3xl font-bold mt-2 tracking-tight">{value}</div>
    </div>
  );
}

export default Index;
