// EyeQ vision test engine: adaptive staircase, scoring, risk, anomaly, prescription.

export const OPTOTYPES = ["C", "D", "H", "K", "N", "O", "R", "S", "V", "Z"] as const;

export type AcuityAnswer = {
  logMar: number;
  correct: boolean;
  responseMs: number;
};

export type ColorPlate = {
  number: string; // correct answer
  options: string[];
  fg: string; // dot colors for the number
  bg: string; // dot colors for the field
};

export type RoundKey = "calibration" | "acuity" | "color" | "astigmatism" | "contrast";

export type TestResults = {
  id: string;
  startedAt: number;
  finishedAt: number;
  pxPerMm: number;
  acuity: {
    left: { answers: AcuityAnswer[]; logMar: number };
    right: { answers: AcuityAnswer[]; logMar: number };
  };
  color: { correct: number; total: number; misses: string[] };
  astigmatism: { linesUnequal: boolean; axis?: number };
  contrast: { answers: AcuityAnswer[]; score: number };
};

// --- Adaptive staircase (acuity & contrast) -------------------------------

export type Staircase = {
  level: number; // index into LEVELS
  direction: 1 | -1;
  reversals: number;
  prevLevel: number;
  done: boolean;
};

// logMAR levels from large/easy to small/hard. 0.0 = 20/20, negative = better.
export const ACUITY_LEVELS = [1.0, 0.8, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.0, -0.1];

export function createStaircase(startIndex: number): Staircase {
  return { level: startIndex, direction: 1, reversals: 0, prevLevel: startIndex, done: false };
}

export function stepStaircase(s: Staircase, correct: boolean): Staircase {
  if (s.done) return s;
  let { level, direction, reversals } = s;
  // correct => harder (higher index); wrong => easier
  const next = correct ? level + 1 : level - 1;
  const newDirection: 1 | -1 = correct ? 1 : -1;
  if (s.reversals + 1 >= 0 && newDirection !== direction && s.prevLevel !== s.level) {
    reversals += 1;
    direction = newDirection;
  } else if (newDirection !== direction) {
    reversals += 1;
    direction = newDirection;
  }
  const clamped = Math.max(0, Math.min(ACUITY_LEVELS.length - 1, next));
  const done =
    reversals >= 2 ||
    (correct && level === ACUITY_LEVELS.length - 1) ||
    (!correct && level === 0 && s.prevLevel === 0);
  return { level: clamped, direction, reversals, prevLevel: level, done };
}

export function finishLogMar(answers: AcuityAnswer[]): number {
  if (answers.length === 0) return 1.0;
  // Threshold = the smallest level answered correctly; fallback to last tested.
  const correct = answers.filter((a) => a.correct);
  if (correct.length === 0) return ACUITY_LEVELS[0];
  return Math.min(...correct.map((a) => a.logMar));
}

export function logMarToSnellen(logMar: number): string {
  const denominator = Math.round(20 * Math.pow(10, logMar));
  return `20/${denominator}`;
}

// Letter pixel size for a logMAR level given calibration.
// A 20/20 optotype subtends 5 arcmin at 6m. We render at ~60cm viewing distance
// so the stimulus scales with pxPerMm.
export function letterPxForLogMar(logMar: number, pxPerMm: number): number {
  const distanceMm = 600; // assumed viewing distance
  const arcmin5HeightMm = distanceMm * Math.tan((5 / 60) * (Math.PI / 180));
  const sizeMm = arcmin5HeightMm * Math.pow(10, logMar);
  return Math.max(6, Math.round(sizeMm * pxPerMm));
}

// --- Color plates (procedural Ishihara-style) -------------------------------

const PLATE_DEFS: { number: string; decoys: string[] }[] = [
  { number: "12", decoys: ["17", "21", "72"] },
  { number: "8", decoys: ["3", "5", "0"] },
  { number: "29", decoys: ["28", "20", "70"] },
  { number: "5", decoys: ["2", "6", "8"] },
  { number: "74", decoys: ["71", "21", "47"] },
];

const FG_HUES = [25, 35, 15]; // orange/amber number dots
const BG_HUES = [95, 120, 140]; // green field dots

export function getPlates(): ColorPlate[] {
  return PLATE_DEFS.map((d) => ({
    number: d.number,
    options: shuffle([d.number, ...d.decoys]),
    fg: FG_HUES.map((h) => `oklch(0.72 0.14 ${h})`),
    bg: BG_HUES.map((h) => `oklch(0.62 0.1 ${h})`),
  }));
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Deterministic-ish dot field for a plate; number revealed via colored dots.
export function plateDots(seed: number): { x: number; y: number; r: number }[] {
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const dots: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < 260; i++) {
    dots.push({ x: rand() * 300, y: rand() * 300, r: 5 + rand() * 11 });
  }
  return dots;
}

// --- Scoring ----------------------------------------------------------------

export function computeRiskScore(r: TestResults): number {
  // 0 (great) -> 100 (high risk). Weighted blend of round outcomes.
  const acuityRisk = (eye: number) => clamp(((eye - -0.1) / (1.0 - -0.1)) * 100, 0, 100);
  const acuity = (acuityRisk(r.acuity.left.logMar) + acuityRisk(r.acuity.right.logMar)) / 2;
  const color = r.color.total === 0 ? 0 : (1 - r.color.correct / r.color.total) * 100;
  const astig = r.astigmatism.linesUnequal ? 60 : 0;
  const contrast = clamp(100 - r.contrast.score, 0, 100);
  const score = 0.45 * acuity + 0.2 * color + 0.15 * astig + 0.2 * contrast;
  return Math.round(clamp(score, 0, 100));
}

export function riskBand(score: number): { label: string; tone: "ok" | "warn" | "bad" } {
  if (score < 30) return { label: "Low risk", tone: "ok" };
  if (score < 60) return { label: "Moderate risk", tone: "warn" };
  return { label: "Elevated risk", tone: "bad" };
}

// --- Anomaly detection -------------------------------------------------------

export function detectAnomalies(r: TestResults): string[] {
  const flags: string[] = [];
  const allAnswers = [...r.acuity.left.answers, ...r.acuity.right.answers, ...r.contrast.answers];
  const tooFast = allAnswers.filter((a) => a.responseMs < 500).length;
  if (allAnswers.length >= 4 && tooFast / allAnswers.length > 0.5) {
    flags.push("Many answers were given too quickly to be reliable.");
  }
  const gap = Math.abs(r.acuity.left.logMar - r.acuity.right.logMar);
  if (gap >= 0.4) {
    flags.push("Large difference between left and right eye acuity — worth a professional check.");
  }
  for (const eye of [r.acuity.left, r.acuity.right]) {
    const seq = eye.answers;
    let flips = 0;
    for (let i = 1; i < seq.length; i++) if (seq[i].correct !== seq[i - 1].correct) flips++;
    if (seq.length >= 6 && flips >= seq.length - 1) {
      flags.push("Alternating right/wrong answers suggest guessing in the acuity round.");
      break;
    }
  }
  const totalMs = r.finishedAt - r.startedAt;
  if (totalMs < 60_000) flags.push("The full test finished unusually fast.");
  return flags;
}

// --- Prescription estimate ----------------------------------------------------

export type PrescriptionEstimate = {
  left: { sph: number; cyl: number; note: string };
  right: { sph: number; cyl: number; note: string };
  disclaimer: string;
};

export function estimatePrescription(r: TestResults): PrescriptionEstimate {
  const sphFromLogMar = (lm: number) => {
    if (lm <= 0) return 0;
    return -Math.round((lm / 0.25) * 2) / 2 * 0.5; // rough: 0.1 logMAR ≈ -0.25D
  };
  const cyl = r.astigmatism.linesUnequal ? -0.75 : 0;
  const mk = (lm: number) => {
    const sph = sphFromLogMar(lm);
    return {
      sph,
      cyl,
      note:
        sph === 0 && cyl === 0
          ? "No significant refractive error estimated."
          : `Estimated myopia of about ${sph.toFixed(2)}D${cyl ? " with mild astigmatism" : ""}.`,
    };
  };
  return {
    left: mk(r.acuity.left.logMar),
    right: mk(r.acuity.right.logMar),
    disclaimer:
      "This is a rough screening estimate only — not a prescription. Only an eye care professional can prescribe lenses.",
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
