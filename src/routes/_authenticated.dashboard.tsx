import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ScanEye, Eye } from "lucide-react";
import { listMyDetections, listMySessions } from "@/lib/eyeq.functions";
import { logMarToSnellen, riskBand } from "@/lib/vision";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your History — EyeQ" },
      {
        name: "description",
        content: "Every EyeQ vision screening and AI eye photo check you've saved, in one place.",
      },
      { property: "og:title", content: "Your History — EyeQ" },
      { property: "og:description", content: "Your saved vision screenings and eye photo checks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const sessionsFn = useServerFn(listMySessions);
  const detectionsFn = useServerFn(listMyDetections);
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: () => sessionsFn({}) });
  const detections = useQuery({ queryKey: ["detections"], queryFn: () => detectionsFn({}) });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Your history</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Saved screenings and photo checks, newest first.
      </p>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Eye className="h-4 w-4 text-primary" /> Vision tests
        </h2>
        <div className="mt-4 space-y-3">
          {sessions.isLoading && <Spinner />}
          {sessions.isError && <Empty text="Couldn't load your tests." />}
          {sessions.data?.length === 0 && (
            <Empty
              text="No saved tests yet."
              action={{ to: "/test", label: "Take the vision test" }}
            />
          )}
          {sessions.data?.map((s) => {
            const band = riskBand(s.risk_score ?? 0);
            return (
              <div key={s.id} className="card-ring rounded-2xl bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold">
                      Risk score {s.risk_score} — {band.label}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-6 font-mono text-xs text-muted-foreground">
                    <span>L {logMarToSnellen(Number(s.acuity_left))}</span>
                    <span>R {logMarToSnellen(Number(s.acuity_right))}</span>
                    <span>
                      Color {s.color_score}/{s.color_total}
                    </span>
                    <span>Contrast {Math.round(Number(s.contrast_score))}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <ScanEye className="h-4 w-4 text-primary" /> Eye photo checks
        </h2>
        <div className="mt-4 space-y-3">
          {detections.isLoading && <Spinner />}
          {detections.isError && <Empty text="Couldn't load your photo checks." />}
          {detections.data?.length === 0 && (
            <Empty text="No photo checks yet." action={{ to: "/detect", label: "Check a photo" }} />
          )}
          {detections.data?.map((d) => (
            <div key={d.id} className="card-ring flex gap-4 rounded-2xl bg-card p-5">
              {d.imageUrl && (
                <img
                  src={d.imageUrl}
                  alt="Saved eye photo"
                  loading="lazy"
                  className="h-20 w-20 shrink-0 rounded-xl object-cover"
                />
              )}
              <div>
                <p className="font-display text-lg font-semibold">{d.verdict}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(d.created_at).toLocaleString()} · confidence{" "}
                  {Math.round(Number(d.confidence) * 100)}%
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{d.disposition}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-8">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function Empty({
  text,
  action,
}: {
  text: string;
  action?: { to: "/test" | "/detect"; label: string };
}) {
  return (
    <div className="card-ring rounded-2xl bg-card p-8 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      {action && (
        <Link
          to={action.to}
          className="mt-4 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
