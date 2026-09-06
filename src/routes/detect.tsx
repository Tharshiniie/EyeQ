import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Loader2, ScanEye, Upload } from "lucide-react";
import { analyzeEyePhoto } from "@/lib/eyeq.functions";
import { savePendingDetection } from "@/lib/pending";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/detect")({
  head: () => ({
    meta: [
      { title: "AI Eye Screening — EyeQ" },
      {
        name: "description",
        content:
          "Upload a close-up eye photo and let EyeQ's AI screen it for visible signs of common eye conditions.",
      },
      { property: "og:title", content: "AI Eye Screening — EyeQ" },
      {
        property: "og:description",
        content: "AI screening of an eye photo for common conditions — free and anonymous.",
      },
    ],
  }),
  component: DetectPage,
});

type Analysis = {
  verdict: string;
  conditions: { name: string; confidence: number; note: string }[];
  confidence: number;
  disposition: string;
};

function DetectPage() {
  const { user } = useAuth();
  const analyze = useServerFn(analyzeEyePhoto);
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mime, setMime] = useState("image/jpeg");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);
  const [savedNote, setSavedNote] = useState(false);

  const onFile = (file: File) => {
    setError(null);
    setResult(null);
    setMime(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const run = async () => {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const base64 = preview.split(",")[1] ?? preview;
      const analysis = await analyze({ data: { imageBase64: base64, mime } });
      setResult(analysis);
      savePendingDetection({
        imageBase64: preview,
        mime,
        verdict: analysis.verdict,
        conditions: analysis.conditions,
        confidence: analysis.confidence,
        disposition: analysis.disposition,
        createdAt: Date.now(),
      });
      setSavedNote(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed. Try a clearer photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="text-center">
        <ScanEye className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 text-3xl font-bold">AI eye screening</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Take a well-lit close-up of one open eye (or use an existing photo). The AI screens for
          visible signs of common conditions. Anonymous — nothing is uploaded to your account
          unless you log in and choose to save it.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 card-ring">
        {!preview ? (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-input px-6 py-12 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            <Upload className="h-8 w-8" />
            <span className="text-sm font-medium">Choose or drop an eye photo</span>
            <span className="text-xs">JPG or PNG, up to 10 MB</span>
          </button>
        ) : (
          <div className="space-y-4">
            <img
              src={preview}
              alt="Uploaded eye for AI screening"
              className="mx-auto max-h-72 rounded-xl border border-border object-contain"
            />
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={run}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                {busy ? "Analyzing…" : "Run AI screening"}
              </button>
              <button
                onClick={() => {
                  setPreview(null);
                  setResult(null);
                  setError(null);
                }}
                className="rounded-xl border border-border px-5 py-2.5 text-sm hover:bg-accent"
              >
                Choose another
              </button>
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">{result.verdict}</h2>
            <span className="rounded-full bg-secondary px-3 py-1 font-mono text-xs text-primary">
              {(result.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
          {result.conditions.length > 0 && (
            <ul className="space-y-2">
              {result.conditions.map((c) => (
                <li key={c.name} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{c.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {(c.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{c.note}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-muted-foreground">{result.disposition}</p>
          <p className="text-xs text-muted-foreground">
            This is an AI screening, not a diagnosis. See an eye care professional for any
            concern.
          </p>
          {savedNote &&
            (user ? (
              <p className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
                Saved to your account.
              </p>
            ) : (
              <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
                Result kept on this device.{" "}
                <Link to="/auth" className="font-semibold text-primary underline-offset-4 hover:underline">
                  Log in to save it to your account
                </Link>
                .
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
