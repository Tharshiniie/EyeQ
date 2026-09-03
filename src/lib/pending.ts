import type { TestResults } from "./vision";

const TEST_KEY = "eyeq.pendingTest";
const DETECT_KEY = "eyeq.pendingDetection";

export type PendingDetection = {
  imageBase64: string; // data URL
  mime: string;
  verdict: string;
  conditions: { name: string; confidence: number; note: string }[];
  confidence: number;
  disposition: string;
  createdAt: number;
};

export function savePendingTest(r: TestResults) {
  try {
    localStorage.setItem(TEST_KEY, JSON.stringify(r));
  } catch {
    /* ignore */
  }
}

export function readPendingTest(): TestResults | null {
  try {
    const raw = localStorage.getItem(TEST_KEY);
    return raw ? (JSON.parse(raw) as TestResults) : null;
  } catch {
    return null;
  }
}

export function clearPendingTest() {
  try {
    localStorage.removeItem(TEST_KEY);
  } catch {
    /* ignore */
  }
}

export function savePendingDetection(d: PendingDetection) {
  try {
    localStorage.setItem(DETECT_KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}

export function readPendingDetection(): PendingDetection | null {
  try {
    const raw = localStorage.getItem(DETECT_KEY);
    return raw ? (JSON.parse(raw) as PendingDetection) : null;
  } catch {
    return null;
  }
}

export function clearPendingDetection() {
  try {
    localStorage.removeItem(DETECT_KEY);
  } catch {
    /* ignore */
  }
}
