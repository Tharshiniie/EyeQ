import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { chatWithEyeQ } from "@/lib/eyeq.functions";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hi — I'm the EyeQ assistant. Ask me about your eye power, what a 20/40 score means, or how to run the vision test.",
};

export function EyeQChat() {
  const chat = useServerFn(chatWithEyeQ);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const { reply } = await chat({ data: { messages: next.slice(-20) } });
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The assistant is unavailable right now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="no-print fixed bottom-5 right-5 z-50 print:hidden">
      {open && (
        <div className="mb-3 flex h-[26rem] w-[min(92vw,22rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-display text-sm font-semibold">EyeQ assistant</p>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground"
                    : "mr-auto max-w-[90%] rounded-2xl rounded-bl-sm bg-secondary px-3 py-2 text-foreground"
                }
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
              </p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div ref={endRef} />
          </div>
          <div className="flex items-center gap-2 border-t border-border p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void send();
              }}
              placeholder="Ask about your eyes…"
              className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={() => void send()}
              disabled={busy || !input.trim()}
              aria-label="Send message"
              className="rounded-xl bg-primary p-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open EyeQ assistant"
        className="ml-auto flex h-13 items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        <MessageCircle className="h-4 w-4" />
        {open ? "Hide" : "Ask EyeQ"}
      </button>
    </div>
  );
}
