import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Sparkles, Send, Loader2, Trash2, Bot, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}

interface AIChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUGGESTIONS = [
  "What's overdue?",
  "Summarize my In Progress tasks",
  "Add 'Design login screen' to To Do, high priority",
  "Move 'Design login screen' to In Progress",
];

export function AIChatPanel({ open, onOpenChange }: AIChatPanelProps) {
  const { user, session } = useAuth();
  const qc = useQueryClient();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history on first open
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, role, content, created_at")
        .order("created_at", { ascending: true })
        .limit(100);
      if (!cancelled && data) {
        setMessages(data.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text: string) => {
    if (!text.trim() || sending || !session) return;
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      // Save user msg
      await supabase.from("chat_messages").insert({
        user_id: user!.id,
        role: "user",
        content: userMsg.content,
      });

      // Build payload from messages (excluding any pending placeholders)
      const payload = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ messages: payload }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          toast.error("Slow down — too many requests. Try again in a moment.");
        } else if (resp.status === 402) {
          toast.error("AI credits exhausted. Add funds in workspace settings.");
        } else {
          toast.error(err.error ?? "AI request failed");
        }
        setSending(false);
        return;
      }

      const data = await resp.json();
      const assistantMsg: ChatMsg = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.content || "(no response)",
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Save assistant msg
      await supabase.from("chat_messages").insert({
        user_id: user!.id,
        role: "assistant",
        content: assistantMsg.content,
      });

      // Refresh tasks if any board action happened
      if (Array.isArray(data.actions) && data.actions.length > 0) {
        qc.invalidateQueries({ queryKey: ["tasks"] });
        for (const a of data.actions) {
          if (a.type === "created") toast.success(`Created: ${a.detail}`);
          if (a.type === "moved") toast.success(`Moved: ${a.detail}`);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    await supabase.from("chat_messages").delete().eq("user_id", user.id);
    setMessages([]);
    toast.success("Conversation cleared");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col gap-0 border-l border-border"
      >
        <SheetHeader className="px-5 py-4 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-[hsl(var(--col-review))] flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <div className="text-base font-semibold">AI Assistant</div>
                <div className="text-xs text-muted-foreground font-normal">Knows your board</div>
              </div>
            </SheetTitle>
            {messages.length > 0 && (
              <Button variant="ghost" size="icon" onClick={clearHistory} title="Clear conversation">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin bg-surface">
          {messages.length === 0 && !sending && (
            <div className="py-8 text-center animate-fade-in">
              <div className="h-14 w-14 rounded-2xl bg-primary-soft flex items-center justify-center mx-auto mb-4">
                <Bot className="h-7 w-7 text-accent-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-1">How can I help?</h3>
              <p className="text-sm text-muted-foreground mb-5 px-4">
                I can summarize your board, create tasks, or move them between columns.
              </p>
              <div className="space-y-2 max-w-xs mx-auto">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="w-full text-left text-sm px-3 py-2.5 rounded-lg bg-card border border-border hover:border-primary/40 hover:bg-primary-soft/40 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={cn("flex gap-2.5 animate-fade-in", m.role === "user" && "flex-row-reverse")}>
              <div
                className={cn(
                  "h-7 w-7 rounded-lg shrink-0 flex items-center justify-center",
                  m.role === "user" ? "bg-secondary" : "bg-gradient-to-br from-primary to-[hsl(var(--col-review))]"
                )}
              >
                {m.role === "user" ? (
                  <UserIcon className="h-3.5 w-3.5 text-foreground" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                )}
              </div>
              <div
                className={cn(
                  "rounded-2xl px-3.5 py-2.5 max-w-[85%] text-sm leading-relaxed shadow-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-card text-foreground border border-border rounded-tl-sm"
                )}
              >
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex gap-2.5 animate-fade-in">
              <div className="h-7 w-7 rounded-lg shrink-0 bg-gradient-to-br from-primary to-[hsl(var(--col-review))] flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <div className="rounded-2xl px-3.5 py-3 bg-card border border-border rounded-tl-sm">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-card p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 items-end"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask about your board…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring max-h-32"
              disabled={sending}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl"
              disabled={sending || !input.trim()}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
