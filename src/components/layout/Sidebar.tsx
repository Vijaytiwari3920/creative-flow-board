import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CheckSquare, LayoutGrid, Calendar, BarChart3, Users, Settings, LogOut, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SidebarProps {
  onOpenChat: () => void;
}

const NAV = [
  { id: "board", label: "Board", icon: LayoutGrid, active: true },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "performance", label: "Performance", icon: BarChart3 },
  { id: "team", label: "Team", icon: Users },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({ onOpenChat }: SidebarProps) {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState("board");

  const initials = (profile?.display_name ?? user?.email ?? "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/auth");
  };

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-card border-r border-border h-screen sticky top-0">
      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-card">
          <CheckSquare className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <div>
          <div className="font-bold text-lg leading-none tracking-tight">Tazkee</div>
          <div className="text-[11px] text-muted-foreground mt-1">Kanban + AI</div>
        </div>
      </div>

      {/* Workspace card */}
      <div className="px-3 mt-2">
        <div className="rounded-lg bg-secondary px-3 py-2.5 flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
            KP
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Workspace</div>
            <div className="text-sm font-semibold truncate">My Project</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 mt-6 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-3 mb-2">Menu</div>
        <ul className="space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActive(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary-soft text-accent-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 px-3">
          <Button
            onClick={onOpenChat}
            className="w-full bg-gradient-to-br from-primary to-[hsl(var(--col-review))] hover:opacity-95 text-primary-foreground shadow-card font-medium"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Ask AI
          </Button>
        </div>
      </nav>

      {/* User */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-9 w-9 ring-2 ring-border">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary-soft text-accent-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">
              {profile?.display_name ?? user?.email?.split("@")[0]}
            </div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleSignOut}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
