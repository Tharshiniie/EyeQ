import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  AcuityRound,
  AstigmatismRound,
  CalibrationRound,
  ColorRound,
  ContrastRound,
  RoundShell,
} from "@/components/test-rounds";
import { finishLogMar, type AcuityAnswer, type TestResults } from "@/lib/vision";
import { savePendingTest } from "@/lib/pending";

export const Route = createFileRoute("/test")({
  head: () => ({
    meta: [
      { title: "Vision Test — EyeQ" },
      {
        name: "description",
        content: "Take EyeQ's adaptive 5-round vision screening: acuity, color, astigmatism and contrast.",
      },
      { property: "og:title", content: "Vision Test — EyeQ" },
      { property: "og:description", content: "Adaptive 5-round vision screening, ~4 minutes." },
    ],
  }),
  component: TestPage,
});

type Phase = "intro" | "calibration" | "acuity-left" | "acuity-right" | "color" | "astigmatism" | "contrast";

const PHASE_ORDER: Phase[] = ["calibration", "acuity-left", "acuity-right", "color", "astigmatism", "contrast"];

function TestPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("intro");
  const startedAt = useRef(Date.now());
  const pxPerMm = useRef(3.78);
  const acuityLeft = useRef<AcuityAnswer[]>([]);
  const acuityRight = useRef<AcuityAnswer[]>([]);
  const color = useRef({ correct: 0, total: 0, misses: [] as string[] });
  const astigmatism = useRef(false);
  const contrast = useRef<AcuityAnswer[]>([]);

  const finish = () => {
    const results: TestResults = {
      id: crypto.randomUUID(),
      startedAt: startedAt.current,
      finishedAt: Date.now(),
      pxPerMm: pxPerMm.current,
      acuity: {
        left: { answers: acuityLeft.current, logMar: finishLogMar(acuityLeft.current) },
        right: { answers: acuityRight.current, logMar: finishLogMar(acuityRight.current) },
      },
      color: color.current,
      astigmatism: { linesUnequal: astigmatism.current },
      contrast: {
        answers: contrast.current,
        score: (contrast.current.filter((a) => a.correct).length / Math.max(1, contrast.current.length)) * 100,
      },
    };
    savePendingTest(results);
    navigate({ to: "/results" });
  };

  const progressIndex = PHASE_ORDER.indexOf(phase);

  return (
    <div>
      {phase !== "intro" && (
        <div className="mx-auto max-w-2xl px-4 pt-6">
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${((progressIndex + 1) / PHASE_ORDER.length) * 100}%` }}
              />
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {progressIndex + 1}/{PHASE_ORDER.length}
            </span>
          </div>
        </div>
      )}

      {phase === "intro" && (
        <RoundShell
          title="Before we start"
          subtitle="A quick setup so your results mean something."
        >
          <ul className="mt-2 w-full max-w-md space-y-3 text-sm text-muted-foreground">
            <li className="rounded-xl border border-border bg-card p-4">
              Sit about an arm's length (60 cm) from your screen, in good light.
            </li>
            <li className="rounded-xl border border-border bg-card p-4">
              If you wear glasses or contacts for distance, keep them on.
            </li>
            <li className="rounded-xl border border-border bg-card p-4">
              Have a credit/debit card handy for one quick calibration step.
            </li>
            <li className="rounded-xl border border-border bg-card p-4">
              Answer with taps or keys 1–4. The test adapts as you go — it takes about 4 minutes.
            </li>
          </ul>
          <button
            onClick={() => {
              startedAt.current = Date.now();
              setPhase("calibration");
            }}
            className="mt-10 rounded-xl bg-primary px-10 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            I'm ready
          </button>
        </RoundShell>
      )}

      {phase === "calibration" && (
        <CalibrationRound
          onDone={(px) => {
            pxPerMm.current = px;
            setPhase("acuity-left");
          }}
        />
      )}
      {phase === "acuity-left" && (
        <AcuityRound
          eye="left"
          pxPerMm={pxPerMm.current}
          onDone={(a) => {
            acuityLeft.current = a;
            setPhase("acuity-right");
          }}
        />
      )}
      {phase === "acuity-right" && (
        <AcuityRound
          eye="right"
          pxPerMm={pxPerMm.current}
          onDone={(a) => {
            acuityRight.current = a;
            setPhase("color");
          }}
        />
      )}
      {phase === "color" && (
        <ColorRound
          onDone={(r) => {
            color.current = r;
            setPhase("astigmatism");
          }}
        />
      )}
      {phase === "astigmatism" && (
        <AstigmatismRound
          onDone={(unequal) => {
            astigmatism.current = unequal;
            setPhase("contrast");
          }}
        />
      )}
      {phase === "contrast" && (
        <ContrastRound
          onDone={(a) => {
            contrast.current = a;
            finish();
          }}
        />
      )}
    </div>
  );
}
