import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { computeRiskScore, detectAnomalies, estimatePrescription } from "./vision";
import {
  clearPendingDetection,
  clearPendingTest,
  readPendingDetection,
  readPendingTest,
} from "./pending";
import { saveDetection, saveTestSession } from "./eyeq.functions";

// Flushes anonymous results (test + detection) to the database once the user
// is signed in. Safe to mount anywhere; runs once per login.
export function useFlushPendingResults(isSignedIn: boolean) {
  const ran = useRef(false);
  const saveTest = useServerFn(saveTestSession);
  const saveDetect = useServerFn(saveDetection);

  useEffect(() => {
    if (!isSignedIn || ran.current) return;
    ran.current = true;
    void (async () => {
      try {
        const test = readPendingTest();
        if (test) {
          await saveTest({
            data: {
              acuityLeft: test.acuity.left.logMar,
              acuityRight: test.acuity.right.logMar,
              colorScore: test.color.correct,
              colorTotal: test.color.total,
              astigmatism: test.astigmatism.linesUnequal,
              contrastScore: test.contrast.score,
              riskScore: computeRiskScore(test),
              anomalyFlags: detectAnomalies(test),
              rounds: {
                acuity: test.acuity,
                color: test.color,
                astigmatism: test.astigmatism,
                contrast: test.contrast,
              } as Record<string, unknown>,
              prescription: estimatePrescription(test) as unknown as Record<string, unknown>,
            },
          });
          clearPendingTest();
        }
      } catch (e) {
        console.error("Failed to save test session", e);
      }
      try {
        const det = readPendingDetection();
        if (det) {
          const base64 = det.imageBase64.includes(",")
            ? det.imageBase64.split(",")[1]
            : det.imageBase64;
          await saveDetect({
            data: {
              imageBase64: base64,
              mime: det.mime,
              verdict: det.verdict,
              conditions: det.conditions,
              confidence: det.confidence,
              disposition: det.disposition,
            },
          });
          clearPendingDetection();
        }
      } catch (e) {
        console.error("Failed to save detection", e);
      }
    })();
  }, [isSignedIn, saveTest, saveDetect]);
}
