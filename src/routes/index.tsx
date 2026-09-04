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

const steps = [
  ["Calibrate", "Match an on-screen card to a real credit card, then sit an arm's length away."],
  ["Acuity", "Read shrinking letters, one eye at a time."],
  ["Color", "Spot the numbers hidden in colored dot plates."],
  ["Astigmatism", "Check whether a fan of lines looks equally sharp."],
  ["Contrast", "Read letters as they fade into the background."],
  ["Results", "Risk score, lens simulator, prescription estimate, report."],
];

function HomePage() {
  return (
    <div>
      {/* Hero — asymmetric split */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(700px 340px at 85% 0%, color-mix(in oklab, var(--primary) 16%, transparent), transparent 70%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              Free · Anonymous · ~4 min
            </p>
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] sm:text-6xl">
              Know your eyes in
              <br />
              <span className="text-primary text-glow">four minutes</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              An adaptive vision screening that runs entirely in your browser — no account, no
              download. Log in afterwards only if you want to keep your results.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/test"
                className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Eye className="h-4 w-4" />
                Start the vision test
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/detect"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3.5 text-sm font-semibold transition-colors hover:bg-accent"
              >
                <Camera className="h-4 w-4" />
                Check an eye photo
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-border pt-6">
              {[
                ["5", "adaptive rounds"],
                ["0–100", "risk score"],
                ["1", "downloadable report"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="font-display text-2xl font-semibold text-primary">{v}</dt>
                  <dd className="mt-1 text-xs text-muted-foreground">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Steps rail */}
          <div className="card-ring rounded-3xl bg-card p-6 sm:p-8">
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              How the screening runs
            </h2>
            <ol className="mt-5 space-y-4">
              {steps.map(([title, text], i) => (
                <li key={title} className="flex gap-4">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Features — bento */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold sm:text-3xl">What&apos;s inside EyeQ</h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Six screening tools working together on one page of results.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50 ${
                i === 0 ? "sm:col-span-2" : ""
              }`}
            >
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border-t border-border bg-card/40">
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
