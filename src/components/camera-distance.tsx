import { useEffect, useRef, useState } from "react";

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

const IPD_MM = 63; // average adult interpupillary distance
const FOV_RAD = (60 * Math.PI) / 180; // assumed webcam horizontal field of view
const TARGET_CM = 60;

type Status = "idle" | "loading" | "running" | "error";

export function CameraDistance({ onMeasure }: { onMeasure?: (cm: number) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");
  const [distance, setDistance] = useState<number | null>(null);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => () => stopRef.current(), []);

  async function start() {
    setStatus("loading");
    setError("");
    try {
      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_CDN);
      const detector = await vision.FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 } },
        audio: false,
      });
      const video = videoRef.current;
      if (!video) throw new Error("no video element");
      video.srcObject = stream;
      await video.play();
      setStatus("running");

      let raf = 0;
      let alive = true;
      const loop = () => {
        if (!alive || !videoRef.current) return;
        const v = videoRef.current;
        if (v.videoWidth > 0) {
          const res = detector.detectForVideo(v, performance.now());
          const face = res.detections[0];
          const kp = face?.keypoints;
          if (kp && kp.length >= 2) {
            const dxPx = (kp[0]!.x - kp[1]!.x) * v.videoWidth;
            const dyPx = (kp[0]!.y - kp[1]!.y) * v.videoHeight;
            const eyePx = Math.hypot(dxPx, dyPx);
            if (eyePx > 2) {
              const focalPx = v.videoWidth / 2 / Math.tan(FOV_RAD / 2);
              const cm = (focalPx * IPD_MM) / eyePx / 10;
              setDistance((prev) => (prev == null ? cm : prev * 0.8 + cm * 0.2));
            }
          } else {
            setDistance(null);
          }
        }
        raf = requestAnimationFrame(loop);
      };
      loop();

      stopRef.current = () => {
        alive = false;
        cancelAnimationFrame(raf);
        stream.getTracks().forEach((t) => t.stop());
        detector.close();
        setStatus("idle");
        setDistance(null);
      };
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Camera access was blocked. You can skip this step."
          : "Could not start the camera check. You can skip this step.",
      );
    }
  }

  const off = distance == null ? null : distance - TARGET_CM;
  const good = off != null && Math.abs(off) <= 8;

  return (
    <div className="mt-6 w-full max-w-md rounded-2xl border border-border bg-card/60 p-4 text-left">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Camera distance check</p>
          <p className="text-xs text-muted-foreground">Optional — helps you sit at the right distance.</p>
        </div>
        {status === "running" ? (
          <button
            onClick={() => stopRef.current()}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={start}
            disabled={status === "loading"}
            className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 disabled:opacity-60"
          >
            {status === "loading" ? "Starting…" : "Use camera"}
          </button>
        )}
      </div>

      <video
        ref={videoRef}
        playsInline
        muted
        className={`mt-3 w-full rounded-xl bg-muted ${status === "running" ? "block" : "hidden"}`}
        style={{ transform: "scaleX(-1)" }}
      />

      {status === "running" && (
        <div className="mt-3">
          <p className={`text-sm font-semibold ${good ? "text-primary" : "text-foreground"}`}>
            {distance == null
              ? "Looking for your face…"
              : `About ${Math.round(distance)} cm away`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {distance == null
              ? "Make sure your face is lit and inside the frame."
              : good
                ? "Great — stay right there and start the test."
                : off! > 0
                  ? `Move about ${Math.round(off!)} cm closer (aim for ${TARGET_CM} cm).`
                  : `Move about ${Math.round(-off!)} cm back (aim for ${TARGET_CM} cm).`}
          </p>
          {distance != null && (
            <button
              onClick={() => {
                onMeasure?.(distance);
                stopRef.current();
              }}
              className="mt-3 rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
            >
              Use this distance
            </button>
          )}
        </div>
      )}

      {status === "error" && <p className="mt-3 text-xs text-destructive">{error}</p>}
      <p className="mt-3 text-[11px] text-muted-foreground">
        Video stays on your device — nothing is uploaded.
      </p>
    </div>
  );
}
