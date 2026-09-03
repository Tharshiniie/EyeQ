import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACUITY_LEVELS,
  OPTOTYPES,
  createStaircase,
  getPlates,
  letterPxForLogMar,
  shuffle,
  stepStaircase,
  type AcuityAnswer,
  type Staircase,
} from "@/lib/vision";

// ---------- shared bits ------------------------------------------------------

export function RoundShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center px-4 py-10">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-8 flex w-full flex-1 flex-col items-center">{children}</div>
    </div>
  );
}

export function OptionButtons({
  options,
  onPick,
}: {
  options: string[];
  onPick: (value: string) => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const idx = ["1", "2", "3", "4"].indexOf(e.key);
      if (idx >= 0 && options[idx]) onPick(options[idx]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [options, onPick]);

  return (
    <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-3">
      {options.map((opt, i) => (
        <button
          key={opt}
          onClick={() => onPick(opt)}
          className="rounded-xl border border-border bg-card px-4 py-4 font-display text-xl font-semibold transition-colors hover:border-primary hover:bg-accent"
        >
          <span className="mr-2 font-mono text-xs text-muted-foreground">{i + 1}</span>
          {opt}
        </button>
      ))}
    </div>
  );
}

// ---------- Round 1: calibration ----------------------------------------------

export function CalibrationRound({ onDone }: { onDone: (pxPerMm: number) => void }) {
  const [cardPx, setCardPx] = useState(320);
  const CARD_MM = 85.6; // credit card width
  const pxPerMm = cardPx / CARD_MM;

  return (
    <RoundShell
      title="Quick calibration"
      subtitle="Hold a credit/debit card (or any ID-1 card) against the screen and match the width below. Then sit about an arm's length (60 cm) from the screen."
    >
      <div
        className="mt-6 flex h-24 items-center justify-center rounded-xl border-2 border-primary bg-primary/10 font-mono text-xs text-primary"
        style={{ width: cardPx }}
      >
        card
      </div>
      <input
        type="range"
        min={180}
        max={560}
        value={cardPx}
        onChange={(e) => setCardPx(Number(e.target.value))}
        className="mt-8 w-full max-w-md accent-primary"
        aria-label="Match card width"
      />
      <p className="mt-2 text-xs text-muted-foreground">
        No card? The default is close enough for a screening.
      </p>
      <button
        onClick={() => onDone(pxPerMm)}
        className="mt-8 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Start the test
      </button>
    </RoundShell>
  );
}

// ---------- Round 2: acuity ----------------------------------------------------

export function AcuityRound({
  eye,
  pxPerMm,
  onDone,
}: {
  eye: "left" | "right";
  pxPerMm: number;
  onDone: (answers: AcuityAnswer[]) => void;
}) {
  const [stair, setStair] = useState<Staircase>(() => createStaircase(4));
  const [answers, setAnswers] = useState<AcuityAnswer[]>([]);
  const [letter, setLetter] = useState<string>(() => OPTOTYPES[Math.floor(Math.random() * OPTOTYPES.length)]!);
  const [options, setOptions] = useState<string[]>([]);
  const shownAt = useRef(Date.now());

  const logMar = ACUITY_LEVELS[stair.level] ?? 1.0;
  const px = letterPxForLogMar(logMar, pxPerMm);

  useEffect(() => {
    const distractors = shuffle(OPTOTYPES.filter((l) => l !== letter)).slice(0, 3);
    setOptions(shuffle([letter, ...distractors]));
    shownAt.current = Date.now();
  }, [letter]);

  const pick = (value: string) => {
    const correct = value === letter;
    const nextAnswers = [
      ...answers,
      { logMar, correct, responseMs: Date.now() - shownAt.current },
    ];
    const nextStair = stepStaircase(stair, correct);
    setAnswers(nextAnswers);
    if (nextStair.done || nextAnswers.length >= 12) {
      onDone(nextAnswers);
      return;
    }
    setStair(nextStair);
    let nextLetter = letter;
    while (nextLetter === letter) {
      nextLetter = OPTOTYPES[Math.floor(Math.random() * OPTOTYPES.length)]!;
    }
    setLetter(nextLetter);
  };

  return (
    <RoundShell
      title={`Visual acuity — ${eye} eye`}
      subtitle={`Cover your ${eye === "left" ? "right" : "left"} eye. Which letter do you see? Press 1–4 or tap.`}
    >
      <div className="flex min-h-48 flex-1 items-center justify-center">
        <span
          className="font-display font-bold leading-none text-foreground"
          style={{ fontSize: px }}
          aria-label="Optotype letter"
        >
          {letter}
        </span>
      </div>
      {options.length === 4 && <OptionButtons options={options} onPick={pick} />}
      <p className="mt-6 font-mono text-xs text-muted-foreground">
        Trial {answers.length + 1} · level {logMar.toFixed(1)} logMAR
      </p>
    </RoundShell>
  );
}

// ---------- Round 3: color -----------------------------------------------------

function PlateCanvas({ number, index }: { number: string; index: number }) {
  const [dots, setDots] = useState<{ x: number; y: number; r: number; fg: boolean }[]>([]);

  useEffect(() => {
    const size = 300;
    const mask = document.createElement("canvas");
    mask.width = size;
    mask.height = size;
    const mctx = mask.getContext("2d");
    if (!mctx) return;
    mctx.fillStyle = "#000";
    mctx.fillRect(0, 0, size, size);
    mctx.fillStyle = "#fff";
    mctx.font = "bold 150px sans-serif";
    mctx.textAlign = "center";
    mctx.textBaseline = "middle";
    mctx.fillText(number, size / 2, size / 2);
    const data = mctx.getImageData(0, 0, size, size).data;

    let s = index * 7919 + 17;
    const rand = () => {
      s = (s * 1103515245 + 12345) % 2147483648;
      return s / 2147483648;
    };
    const out: { x: number; y: number; r: number; fg: boolean }[] = [];
    let guard = 0;
    while (out.length < 420 && guard++ < 8000) {
      const x = rand() * size;
      const y = rand() * size;
      const dx = x - size / 2;
      const dy = y - size / 2;
      if (dx * dx + dy * dy > (size / 2 - 8) ** 2) continue;
      const r = 4 + rand() * 9;
      const px = data[(Math.floor(y) * size + Math.floor(x)) * 4] ?? 0;
      out.push({ x, y, r, fg: px > 128 });
    }
    setDots(out);
  }, [number, index]);

  const FG = ["oklch(0.72 0.16 30)", "oklch(0.68 0.15 15)", "oklch(0.76 0.14 45)"];
  const BG = ["oklch(0.62 0.1 120)", "oklch(0.58 0.09 145)", "oklch(0.66 0.1 95)"];

  return (
    <svg viewBox="0 0 300 300" className="h-64 w-64 rounded-full border border-border sm:h-72 sm:w-72" role="img" aria-label="Color vision plate">
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={d.r}
          fill={d.fg ? FG[i % FG.length] : BG[i % BG.length]}
        />
      ))}
    </svg>
  );
}

export function ColorRound({
  onDone,
}: {
  onDone: (result: { correct: number; total: number; misses: string[] }) => void;
}) {
  const plates = useMemo(() => getPlates(), []);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [misses, setMisses] = useState<string[]>([]);

  const plate = plates[idx]!;

  const pick = (value: string) => {
    const isRight = value === plate.number;
    const nextCorrect = correct + (isRight ? 1 : 0);
    const nextMisses = isRight ? misses : [...misses, plate.number];
    if (idx + 1 >= plates.length) {
      onDone({ correct: nextCorrect, total: plates.length, misses: nextMisses });
      return;
    }
    setCorrect(nextCorrect);
    setMisses(nextMisses);
    setIdx(idx + 1);
  };

  return (
    <RoundShell
      title="Color vision"
      subtitle="What number do you see in the dots? If you can't see one, take your best guess."
    >
      <PlateCanvas number={plate.number} index={idx} />
      <OptionButtons options={plate.options} onPick={pick} />
      <p className="mt-6 font-mono text-xs text-muted-foreground">
        Plate {idx + 1} of {plates.length}
      </p>
    </RoundShell>
  );
}

// ---------- Round 4: astigmatism -------------------------------------------------

export function AstigmatismRound({ onDone }: { onDone: (linesUnequal: boolean) => void }) {
  const lines = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const angle = (i * 180) / 12;
      return angle;
    });
  }, []);

  return (
    <RoundShell
      title="Astigmatism check"
      subtitle="Cover one eye and look at the fan of lines. Do all the lines look equally dark and sharp?"
    >
      <svg viewBox="0 0 300 300" className="mt-4 h-64 w-64" role="img" aria-label="Astigmatism fan of lines">
        {lines.map((angle) => (
          <line
            key={angle}
            x1="150"
            y1="150"
            x2={150 + 130 * Math.cos((angle * Math.PI) / 180)}
            y2={150 + 130 * Math.sin((angle * Math.PI) / 180)}
            stroke="currentColor"
            strokeWidth="2.5"
          />
        ))}
        <circle cx="150" cy="150" r="5" fill="currentColor" />
      </svg>
      <div className="mt-8 flex gap-3">
        <button
          onClick={() => onDone(false)}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Yes, all equal
        </button>
        <button
          onClick={() => onDone(true)}
          className="rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium hover:border-primary hover:bg-accent"
        >
          No, some are darker/blurrier
        </button>
      </div>
    </RoundShell>
  );
}

// ---------- Round 5: contrast -----------------------------------------------------

const CONTRAST_OPACITY = [0.55, 0.4, 0.28, 0.18, 0.1];

export function ContrastRound({ onDone }: { onDone: (answers: AcuityAnswer[]) => void }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AcuityAnswer[]>([]);
  const [letter, setLetter] = useState<string>(() => OPTOTYPES[Math.floor(Math.random() * OPTOTYPES.length)]!);
  const [options, setOptions] = useState<string[]>([]);
  const shownAt = useRef(Date.now());

  useEffect(() => {
    const distractors = shuffle(OPTOTYPES.filter((l) => l !== letter)).slice(0, 3);
    setOptions(shuffle([letter, ...distractors]));
    shownAt.current = Date.now();
  }, [letter]);

  const pick = (value: string) => {
    const correct = value === letter;
    const nextAnswers = [
      ...answers,
      { logMar: idx, correct, responseMs: Date.now() - shownAt.current },
    ];
    setAnswers(nextAnswers);
    if (idx + 1 >= CONTRAST_OPACITY.length) {
      onDone(nextAnswers);
      return;
    }
    setIdx(idx + 1);
    let nextLetter = letter;
    while (nextLetter === letter) {
      nextLetter = OPTOTYPES[Math.floor(Math.random() * OPTOTYPES.length)]!;
    }
    setLetter(nextLetter);
  };

  return (
    <RoundShell
      title="Contrast sensitivity"
      subtitle="The letters will get fainter. Which letter do you see? Press 1–4 or tap."
    >
      <div className="flex min-h-48 flex-1 items-center justify-center rounded-2xl bg-foreground/[0.03] px-8">
        <span
          className="font-display text-7xl font-bold leading-none text-foreground"
          style={{ opacity: CONTRAST_OPACITY[idx] }}
        >
          {letter}
        </span>
      </div>
      {options.length === 4 && <OptionButtons options={options} onPick={pick} />}
      <p className="mt-6 font-mono text-xs text-muted-foreground">
        Step {idx + 1} of {CONTRAST_OPACITY.length}
      </p>
    </RoundShell>
  );
}
