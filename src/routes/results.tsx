import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, Home, Loader2, Sparkles, Trash2 } from "lucide-react";
import {
  blurPxForPower,
  computeRiskScore,
  detectAnomalies,
  estimateEyePower,
  estimatePrescription,
  logMarToSnellen,
  riskBand,
  type TestResults,
} from "@/lib/vision";
import { clearPendingTest, readPendingTest } from "@/lib/pending";
import { useAuth } from "@/hooks/use-auth";
import { writeAdvisory } from "@/lib/eyeq.functions";
import busScene from "@/assets/bus-scene.jpg";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Your Vision Results — EyeQ" },
      {
        name: "description",
        content:
          "Your EyeQ screening results: eye health risk score, per-round breakdown, vision simulator and an estimated prescription.",
      },
      { property: "og:title", content: "Your Vision Results — EyeQ" },
      {
        property: "og:description",
        content: "Risk score, round breakdown, vision simulator and estimated prescription.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [results, setResults] = useState<TestResults | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setResults(readPendingTest());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!results) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display text-2xl font-semibold">No results yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Take the vision test and your results will appear here.
        </p>
        <button
          onClick={() => navigate({ to: "/test" })}
          className="mt-6 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Start the test
        </button>
      </div>
    );
  }

  return <ResultsView results={results} signedIn={!!user} />;
}

function ResultsView({ results, signedIn }: { results: TestResults; signedIn: boolean }) {
  const navigate = useNavigate();
  const score = useMemo(() => computeRiskScore(results), [results]);
  const band = riskBand(score);
  const flags = useMemo(() => detectAnomalies(results), [results]);
  const rx = useMemo(() => estimatePrescription(results), [results]);
  const power = useMemo(() => estimateEyePower(results), [results]);
  const advise = useServerFn(writeAdvisory);
  const [advisory, setAdvisory] = useState<string | null>(null);
  const [advising, setAdvising] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAdvising(true);
    advise({
      data: {
        riskScore: score,
        acuityLeft: logMarToSnellen(results.acuity.left.logMar),
        acuityRight: logMarToSnellen(results.acuity.right.logMar),
        colorScore: `${results.color.correct}/${results.color.total}`,
        astigmatism: results.astigmatism.linesUnequal,
        contrastScore: Math.round(results.contrast.score),
      },
    })
      .then((r) => {
        if (!cancelled) setAdvisory(r.advisory);
      })
      .catch(() => {
        if (!cancelled)
          setAdvisory(
            "Keep up regular eye checks, take a 20-second screen break every 20 minutes and see an eye care professional if anything changes.",
          );
      })
      .finally(() => {
        if (!cancelled) setAdvising(false);
      });
    return () => {
      cancelled = true;
    };
  }, [advise, score, results]);

  const toneClass =
    band.tone === "ok"
      ? "text-primary"
      : band.tone === "warn"
        ? "text-[oklch(0.78_0.15_75)]"
        : "text-destructive";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 print:py-0">
      <header className="text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          EyeQ screening report
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Your results</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {new Date(results.finishedAt).toLocaleString()}
        </p>
      </header>

      {/* Estimated eye power — headline result */}
      <section className="card-ring mt-8 rounded-2xl bg-card p-8">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Estimated eye power
        </p>
        <p className="mt-3 font-display text-2xl font-semibold sm:text-3xl">{power.headline}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {(["left", "right"] as const).map((eye) => (
            <div key={eye} className="rounded-2xl border border-border bg-background p-5">
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {eye} eye
              </p>
              <p className="mt-2 font-display text-4xl font-semibold text-primary">
                {power[eye].sph === 0 ? "0.00" : power[eye].sph.toFixed(2)}
                <span className="ml-1 text-lg text-muted-foreground">D</span>
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {power[eye].snellen}
                {power[eye].cyl ? ` · cyl ${power[eye].cyl.toFixed(2)}D` : ""}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{power[eye].note}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{power.disclaimer}</p>
      </section>

      {/* Risk dial */}
      <section className="card-ring mt-10 rounded-2xl bg-card p-8 text-center">
        <Dial score={score} tone={band.tone} />
        <h2 className={`mt-4 font-display text-2xl font-semibold ${toneClass}`}>{band.label}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Eye health risk score {score}/100</p>
        <p className="mt-4 text-sm text-muted-foreground">
          {flags.length === 0
            ? "Confidence in this result: high — your answers were consistent."
            : `Confidence in this result: low — ${flags[0]}`}
        </p>
        {flags.length > 0 && (
          <Link
            to="/test"
            className="mt-4 inline-block rounded-xl border border-border px-6 py-2.5 text-sm font-medium hover:bg-secondary"
          >
            Retake the test
          </Link>
        )}
      </section>

      {/* Round breakdown */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Round by round</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Stat
            label="Acuity — left eye"
            value={logMarToSnellen(results.acuity.left.logMar)}
            hint={`logMAR ${results.acuity.left.logMar.toFixed(2)}`}
          />
          <Stat
            label="Acuity — right eye"
            value={logMarToSnellen(results.acuity.right.logMar)}
            hint={`logMAR ${results.acuity.right.logMar.toFixed(2)}`}
          />
          <Stat
            label="Color vision"
            value={`${results.color.correct}/${results.color.total}`}
            hint={
              results.color.correct === results.color.total
                ? "No color deficiency detected"
                : "Some plates misread"
            }
          />
          <Stat
            label="Astigmatism"
            value={results.astigmatism.linesUnequal ? "Signs detected" : "No signs"}
            hint="Radial fan dial"
          />
          <Stat
            label="Contrast sensitivity"
            value={`${Math.round(results.contrast.score)}%`}
            hint="Low-contrast letters read correctly"
          />
          <Stat
            label="Test duration"
            value={`${Math.max(1, Math.round((results.finishedAt - results.startedAt) / 1000))}s`}
            hint="Total time taken"
          />
        </div>
      </section>

      {/* Lens simulator */}
      <LensSimulator sph={Math.min(power.left.sph, power.right.sph)} />

      {/* Prescription */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Estimated prescription</h2>
        <div className="card-ring mt-4 overflow-hidden rounded-2xl bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-xs uppercase tracking-wider text-muted-foreground">
                <th className="p-4">Eye</th>
                <th className="p-4">SPH</th>
                <th className="p-4">CYL</th>
              </tr>
            </thead>
            <tbody>
              {(["left", "right"] as const).map((eye) => (
                <tr key={eye} className="border-b border-border last:border-0">
                  <td className="p-4 capitalize">{eye}</td>
                  <td className="p-4 font-mono">{rx[eye].sph.toFixed(2)}</td>
                  <td className="p-4 font-mono">{rx[eye].cyl.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{rx.disclaimer}</p>
      </section>

      {/* Advisory */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Sparkles className="h-4 w-4 text-primary" /> What this means
        </h2>
        <div className="card-ring mt-4 rounded-2xl bg-card p-6 text-sm leading-relaxed text-muted-foreground">
          {advising && !advisory ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Writing your summary…
            </span>
          ) : (
            advisory
          )}
        </div>
      </section>

      {/* Actions */}
      <section className="mt-10 flex flex-col gap-3 sm:flex-row print:hidden">
        {!signedIn ? (
          <Link
            to="/auth"
            className="flex-1 rounded-xl bg-primary px-8 py-3.5 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Log in to save these results
          </Link>
        ) : (
          <Link
            to="/dashboard"
            className="flex-1 rounded-xl bg-primary px-8 py-3.5 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Saved — view your history
          </Link>
        )}
        <Link
          to="/"
          className="flex items-center justify-center gap-2 rounded-xl border border-border px-8 py-3.5 text-sm font-semibold hover:bg-secondary"
        >
          <Home className="h-4 w-4" /> Home
        </Link>
        <button
          onClick={() => window.print()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-8 py-3.5 text-sm font-semibold hover:bg-secondary"
        >
          <Download className="h-4 w-4" /> Download report
        </button>
        <button
          onClick={() => {
            clearPendingTest();
            navigate({ to: "/test" });
          }}
          className="flex items-center justify-center gap-2 rounded-xl border border-destructive/40 px-8 py-3.5 text-sm font-semibold text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" /> Clear results
        </button>
      </section>

      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
        EyeQ is a screening aid, not a medical device. It does not diagnose disease and cannot
        replace an eye examination by a qualified professional.
      </p>
    </div>
  );
}

function Dial({ score, tone }: { score: number; tone: "ok" | "warn" | "bad" }) {
  const r = 68;
  const c = 2 * Math.PI * r;
  const stroke =
    tone === "ok"
      ? "oklch(0.72 0.13 180)"
      : tone === "warn"
        ? "oklch(0.78 0.15 75)"
        : "oklch(0.62 0.2 25)";
  return (
    <svg viewBox="0 0 160 160" className="mx-auto h-40 w-40">
      <circle cx="80" cy="80" r={r} fill="none" strokeWidth="12" className="stroke-secondary" />
      <circle
        cx="80"
        cy="80"
        r={r}
        fill="none"
        strokeWidth="12"
        stroke={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (c * score) / 100}
        transform="rotate(-90 80 80)"
      />
      <text
        x="80"
        y="90"
        textAnchor="middle"
        className="fill-foreground font-display"
        fontSize="36"
        fontWeight="600"
      >
        {score}
      </text>
    </svg>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card-ring rounded-2xl bg-card p-5">
      <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function LensSimulator({ sph }: { sph: number }) {
  const baseline = Math.max(1.5, blurPxForPower(sph));
  const [corrected, setCorrected] = useState(0);
  const blur = baseline * (1 - corrected / 100);

  const Scene = ({ px, label }: { px: number; label: string }) => (
    <div className="flex-1">
      <p className="border-b border-border bg-secondary/60 px-4 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="relative flex h-52 items-center justify-center overflow-hidden bg-card">
        <img
          src={busScene}
          alt="A bus arriving at the Central stop, destination sign reading 42 Central"
          width={1024}
          height={640}
          loading="lazy"
          className="h-full w-full object-cover transition-[filter] duration-150"
          style={{ filter: `blur(${px}px)` }}
        />
      </div>
    </div>
  );

  return (
    <section className="mt-8 print:hidden">
      <h2 className="font-display text-xl font-semibold">How blurry the world looks to you</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {sph === 0
          ? "Your distance vision tested sharp, so we show a very mild reference blur. Drag the slider to see the correction effect."
          : `Based on your estimated ${sph.toFixed(2)}D, this is roughly how a distant sign looks — drag to add correction.`}
      </p>
      <div className="card-ring mt-4 overflow-hidden rounded-2xl bg-card">
        <div className="flex flex-col divide-y divide-border sm:flex-row sm:divide-x sm:divide-y-0">
          <Scene px={baseline} label="Your eyes now" />
          <Scene px={blur} label={`With ${corrected}% correction`} />
        </div>
        <div className="border-t border-border p-5">
          <input
            type="range"
            min={0}
            max={100}
            value={corrected}
            onChange={(e) => setCorrected(Number(e.target.value))}
            className="w-full accent-[var(--primary)]"
            aria-label="Correction strength"
          />
          <div className="mt-2 flex justify-between font-mono text-xs text-muted-foreground">
            <span>No glasses</span>
            <span>{blur.toFixed(1)}px blur</span>
            <span>Full correction</span>
          </div>
        </div>
      </div>
    </section>
  );
}
