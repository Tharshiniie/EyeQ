import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Camera, CheckCircle2, Eye, Gauge, ScanEye, SlidersHorizontal, FileText, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EyeQ — Free Online Vision Screening" },
      {
        name: "description",
        content:
          "Take a 4-minute adaptive vision test, screen an eye photo with AI, get your eye health risk score and a downloadable report. Free and anonymous — log in only if you want to save results.",
      },
      { property: "og:title", content: "EyeQ — Free Online Vision Screening" },
      {
        property: "og:description",
        content:
          "Adaptive vision test + AI eye-photo screening. Anonymous until you choose to save.",
      },
    ],
  }),
  component: HomePage,
});

const features = [
  {
    icon: Gauge,
    title: "Adaptive test difficulty",
    text: "Each round adjusts to your answers — get it right and it gets harder, miss and it eases off. That's how EyeQ finds your real threshold in minutes.",
  },
  {
    icon: ScanEye,
    title: "Eye disease detection",
    text: "Upload a close-up photo of your eye and our AI screens it for visible signs of common conditions, with confidence and next steps.",
  },
  {
    icon: ShieldAlert,
    title: "Anomaly detection",
    text: "EyeQ watches for unreliable patterns — rushed answers, big left/right gaps — and tells you how much to trust your result.",
  },
  {
    icon: Eye,
    title: "Eye health risk score",
    text: "A single 0–100 score blending acuity, color, astigmatism and contrast results into one clear green/amber/red reading.",
  },
  {
    icon: SlidersHorizontal,
    title: "Interactive lens simulator",
    text: "Drag a slider to see the world the way your eyes do right now — and how it could look with correction.",
  },
  {
    icon: FileText,
    title: "Prescription estimate + report",
    text: "Get a rough lens-power estimate and a downloadable report to bring to a real eye exam.",
  },
];

function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(600px 300px at 70% 10%, oklch(0.78 0.14 195 / 18%), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-20 text-center">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            Free · Anonymous · ~4 minutes
          </p>
          <h1 className="mx-auto mt-6 max-w-2xl text-4xl font-bold leading-tight sm:text-6xl">
            Know your eyes in <span className="text-primary text-glow">four minutes</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            EyeQ runs an adaptive vision screening right in your browser — no account, no
            download. Log in afterwards only if you want to keep your results.
          </p>

          <div className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-2">
            <Link
              to="/test"
              className="group rounded-2xl border border-primary/40 bg-card p-6 text-left card-ring transition-transform hover:-translate-y-1"
            >
              <Eye className="h-8 w-8 text-primary" />
              <h2 className="mt-3 text-xl font-semibold">Start the vision test</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                5 short adaptive rounds: acuity, color, astigmatism and contrast.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Begin screening
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <Link
              to="/detect"
              className="group rounded-2xl border border-border bg-card p-6 text-left card-ring transition-transform hover:-translate-y-1"
            >
              <Camera className="h-8 w-8 text-primary" />
              <h2 className="mt-3 text-xl font-semibold">Check an eye photo</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                AI screens a close-up eye photo for visible signs of common conditions.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Upload a photo
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="text-center text-2xl font-bold">How the test works</h2>
          <ol className="mx-auto mt-8 grid max-w-3xl gap-3">
            {[
              "Calibration — match an on-screen card to a real credit card so sizes are accurate, then sit about an arm's length away.",
              "Visual acuity — read shrinking letters, one eye at a time (cover the other).",
              "Color vision — identify numbers hidden in colored dot plates.",
              "Astigmatism — check whether a fan of lines looks equally sharp.",
              "Contrast sensitivity — read letters as they fade into the background.",
              "Get your results: risk score, lens simulator, prescription estimate and report. Log in only if you want them saved.",
            ].map((step, i) => (
              <li key={i} className="flex gap-4 rounded-xl border border-border bg-card p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-sm text-primary">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-muted-foreground">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="text-center text-2xl font-bold">What's inside EyeQ</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-5">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-4 py-10 text-center">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Important:</strong> EyeQ is a screening aid, not
            a medical device. Results are estimates and can be affected by your screen, lighting
            and distance. Nothing here is a diagnosis or a prescription. If you have eye pain,
            sudden vision changes, or any concern, see an eye care professional.
          </p>
        </div>
      </section>
    </div>
  );
}
