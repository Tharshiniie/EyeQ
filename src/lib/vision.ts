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
  fg: string[]; // dot colors for the number
  bg: string[]; // dot colors for the field
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
  snellen?: { left: number; right: number };
  duochrome?: { left: "red" | "green" | "equal"; right: "red" | "green" | "equal" };
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
  if (correct.length === 0) return ACUITY_LEVELS[0]!;
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
    [a[i], a[j]] = [a[j]!, a[i]!];
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
    for (let i = 1; i < seq.length; i++) if (seq[i]!.correct !== seq[i - 1]!.correct) flips++;
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
  const power = estimateEyePower(r);
  return {
    left: { sph: power.left.sph, cyl: power.left.cyl, note: power.left.note },
    right: { sph: power.right.sph, cyl: power.right.cyl, note: power.right.note },
    disclaimer: power.disclaimer,
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

// --- Snellen chart -----------------------------------------------------------

export type SnellenLine = { snellen: string; logMar: number; letters: string };

export const SNELLEN_LINES: SnellenLine[] = [
  { snellen: "20/200", logMar: 1.0, letters: "E" },
  { snellen: "20/100", logMar: 0.7, letters: "F P" },
  { snellen: "20/70", logMar: 0.54, letters: "T O Z" },
  { snellen: "20/50", logMar: 0.4, letters: "L P E D" },
  { snellen: "20/40", logMar: 0.3, letters: "P E C F D" },
  { snellen: "20/30", logMar: 0.18, letters: "E D F C Z P" },
  { snellen: "20/25", logMar: 0.1, letters: "F E L O P Z D" },
  { snellen: "20/20", logMar: 0.0, letters: "D E F P O T E C" },
];

export type Duochrome = "red" | "green" | "equal";

// --- Eye power estimate -------------------------------------------------------

export type EyePower = { sph: number; cyl: number; snellen: string; note: string };

const POWER_TABLE: [number, number][] = [
  [0.0, 0], [0.1, -0.25], [0.2, -0.5], [0.3, -0.75],
  [0.4, -1.0], [0.5, -1.5], [0.6, -2.0], [0.8, -3.0], [1.0, -4.0],
];

function quarter(v: number) {
  return Math.round(v * 4) / 4;
}

export function sphFromLogMar(logMar: number): number {
  if (logMar <= 0) return 0;
  for (let i = 1; i < POWER_TABLE.length; i++) {
    const [hiL, hiD] = POWER_TABLE[i]!;
    const [loL, loD] = POWER_TABLE[i - 1]!;
    if (logMar <= hiL) {
      const t = (logMar - loL) / (hiL - loL);
      return quarter(loD + t * (hiD - loD));
    }
  }
  return -4.0;
}

export function estimateEyePower(r: TestResults): {
  left: EyePower;
  right: EyePower;
  headline: string;
  disclaimer: string;
} {
  const mk = (eye: "left" | "right"): EyePower => {
    const logMar = r.snellen ? r.snellen[eye] : r.acuity[eye].logMar;
    let sph = sphFromLogMar(logMar);
    const duo = r.duochrome?.[eye];
    if (duo === "red" && sph < 0) sph = quarter(sph - 0.25);
    if (duo === "green") sph = quarter(sph + 0.25);
    if (sph > 0) sph = 0;
    const cyl = r.astigmatism.linesUnequal ? -0.75 : 0;
    return {
      sph,
      cyl,
      snellen: logMarToSnellen(logMar),
      note:
        sph === 0 && cyl === 0
          ? "No meaningful lens power needed."
          : `About ${sph.toFixed(2)}D${cyl ? ` with ${cyl.toFixed(2)}D cylinder` : ""}.`,
    };
  };
  const left = mk("left");
  const right = mk("right");
  const strongest = Math.min(left.sph, right.sph);
  const headline =
    strongest === 0
      ? "Your eyes look close to full strength — no lens power estimated."
      : strongest > -0.75
        ? `Very mild short-sightedness, around ${strongest.toFixed(2)}D.`
        : strongest > -2
          ? `Mild short-sightedness, around ${strongest.toFixed(2)}D — glasses would sharpen distance.`
          : `Noticeable short-sightedness, around ${strongest.toFixed(2)}D — worth a professional eye exam.`;
  return {
    left,
    right,
    headline,
    disclaimer:
      "This is a screening estimate from a screen test, not a prescription. Only an eye care professional can measure and prescribe your real lens power.",
  };
}

// How blurred the world looks, in CSS pixels, for a given lens power.
export function blurPxForPower(sph: number): number {
  return Math.min(14, Math.abs(sph) * 3.2);
}
