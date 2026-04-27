import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Sparkles, LayoutGrid, MessageSquare, Zap } from "lucide-react";
import kanbanAiLogo from "@/assets/kanban-ai-logo.png";

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created! Welcome.");
        navigate("/", { replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/", { replace: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Google sign-in failed");
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-gradient-to-br from-primary-soft via-background to-accent">
      {/* Shared animated background blobs */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-blob pointer-events-none" />
      <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-[hsl(var(--col-review))]/20 blur-3xl animate-blob pointer-events-none" style={{ animationDelay: "2s" }} />
      <div className="absolute top-1/3 left-1/2 h-72 w-72 rounded-full bg-[hsl(var(--col-progress))]/15 blur-3xl animate-blob pointer-events-none" style={{ animationDelay: "4s" }} />
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Left: Intro / branding */}
      <aside className="hidden md:flex flex-col justify-between w-1/2 p-8 lg:p-12 relative z-10">

        <div className="relative z-10 flex items-center gap-3 animate-slide-up-fade" style={{ animationDelay: "0ms" }}>
          <span className="text-xl font-bold tracking-tight">Tazkee</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">by JVS</span>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="relative animate-slide-up-fade" style={{ animationDelay: "100ms" }}>
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-[hsl(var(--col-review))]/30 blur-2xl rounded-full" />
            <img
              src={kanbanAiLogo}
              alt="Kanban + AI by JVS Company logo"
              className="relative w-64 lg:w-72 h-auto drop-shadow-2xl animate-float"
            />
          </div>

          <h2
            className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight leading-tight max-w-md mt-6 animate-slide-up-fade"
            style={{ animationDelay: "250ms" }}
          >
            Your board, supercharged with{" "}
            <span
              className="bg-gradient-to-r from-primary via-[hsl(var(--col-review))] to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-x"
            >
              AI
            </span>
          </h2>
          <p
            className="text-muted-foreground mt-3 max-w-sm animate-slide-up-fade"
            style={{ animationDelay: "400ms" }}
          >
            Plan, track and ship work beautifully — and let your built-in assistant do the heavy lifting.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-1 gap-3">
          <div className="animate-slide-up-fade" style={{ animationDelay: "550ms" }}>
            <Feature icon={<LayoutGrid className="h-4 w-4" />} title="Drag-and-drop Kanban" desc="To Do · In Progress · Review · Done" />
          </div>
          <div className="animate-slide-up-fade" style={{ animationDelay: "700ms" }}>
            <Feature icon={<MessageSquare className="h-4 w-4" />} title="AI assistant built in" desc="Create, move and summarize tasks via chat" />
          </div>
          <div className="animate-slide-up-fade" style={{ animationDelay: "850ms" }}>
            <Feature icon={<Zap className="h-4 w-4" />} title="Synced to the cloud" desc="Your boards, anywhere you sign in" />
          </div>
        </div>
      </aside>

      {/* Right: Auth form */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex items-center gap-3 justify-center mb-8 md:hidden">
            <img src={kanbanAiLogo} alt="Kanban + AI logo" className="h-14 w-auto" />
          </div>

        <Card className="p-8 shadow-card border-border/60">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "signin" ? "Welcome back" : "Create your board"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signin" ? "Sign in to your Kanban workspace" : "Start organizing tasks beautifully"}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-11 font-medium"
            onClick={handleGoogle}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <GoogleIcon className="h-4 w-4 mr-2" />
                Continue with Google
              </>
            )}
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground tracking-wider">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11"
              />
            </div>

            <Button type="submit" className="w-full h-11 font-medium" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-6">
            {mode === "signin" ? "Don't have an account?" : "Already have one?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary font-medium hover:underline"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </Card>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-card/60 backdrop-blur border border-border/60 shadow-sm hover:shadow-card-hover transition-shadow">
      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
