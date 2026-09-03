import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Log in — EyeQ" },
      { name: "description", content: "Log in to EyeQ to save your vision test results." },
      { property: "og:title", content: "Log in — EyeQ" },
      { property: "og:description", content: "Log in to EyeQ to save your vision test results." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!loading && user) {
      // Pending anonymous results are flushed automatically; land on dashboard.
      navigate({ to: "/dashboard" });
    }
  }, [loading, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({
          tone: "ok",
          text: "Account created. If email confirmation is on, check your inbox — otherwise you're signed in.",
        });
      }
    } catch (err) {
      setMessage({ tone: "err", text: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setMessage({ tone: "err", text: result.error.message ?? "Google sign-in failed" });
      setBusy(false);
      return;
    }
    if (result.redirected) return; // browser is navigating to Google
    setBusy(false);
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <Eye className="h-10 w-10 text-primary" />
      <h1 className="mt-4 text-2xl font-bold">
        {mode === "login" ? "Log in to save your results" : "Create your EyeQ account"}
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Any test results or photo checks you've already taken on this device will be saved to
        your account automatically.
      </p>

      <button
        onClick={google}
        disabled={busy}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M12 5.04c1.7 0 3.22.59 4.42 1.73l3.29-3.29C17.72 1.7 15.06.5 12 .5 7.4.5 3.44 3.13 1.53 6.9l3.84 2.98C6.3 7.14 8.91 5.04 12 5.04z" />
          <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.46H12v4.65h6.45c-.28 1.5-1.12 2.77-2.39 3.62l3.72 2.89c2.18-2.01 3.72-4.97 3.72-8.7z" />
          <path fill="#FBBC05" d="M5.37 14.12a7.06 7.06 0 0 1 0-4.24L1.53 6.9a11.5 11.5 0 0 0 0 10.2l3.84-2.98z" />
          <path fill="#34A853" d="M12 23.5c3.06 0 5.63-1.01 7.5-2.74l-3.72-2.89c-1.03.69-2.35 1.1-3.78 1.1-3.09 0-5.7-2.1-6.63-4.85l-3.84 2.98C3.44 20.87 7.4 23.5 12 23.5z" />
        </svg>
        Continue with Google
      </button>

      <div className="my-6 flex w-full items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        or with email
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} className="w-full space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 6 characters)"
          className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "login" ? "Log in" : "Sign up"}
        </button>
      </form>

      {message && (
        <p
          className={`mt-4 text-center text-sm ${
            message.tone === "err" ? "text-destructive" : "text-primary"
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="mt-6 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        {mode === "login" ? "No account? Sign up" : "Already have an account? Log in"}
      </button>
    </div>
  );
}
