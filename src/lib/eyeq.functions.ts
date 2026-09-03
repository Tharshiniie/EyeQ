import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const conditionSchema = z.object({
  name: z.string(),
  confidence: z.number(),
  note: z.string(),
});

export const analyzeEyePhoto = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        imageBase64: z.string().min(100).max(15_000_000),
        mime: z.string().min(3),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI service is not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an eye-photo screening assistant. Analyze the eye photo for visible signs of common conditions (cataract, conjunctivitis, pterygium, ptosis, cloudy cornea, redness/irritation, other anomalies). This is a screening aid, not a diagnosis. Respond ONLY with JSON: {\"verdict\": string, \"conditions\": [{\"name\": string, \"confidence\": number 0-1, \"note\": string}], \"confidence\": number 0-1, \"disposition\": string}. If the image is not a readable eye photo, set verdict to \"Unreadable image\" and give a disposition asking for a clearer close-up. Keep notes short and non-technical.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Screen this eye photo." },
              {
                type: "image_url",
                image_url: { url: `data:${data.mime};base64,${data.imageBase64}` },
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI analysis failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: {
      verdict?: string;
      conditions?: unknown;
      confidence?: number;
      disposition?: string;
    };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI returned an unreadable response. Try again.");
    }
    const conditions = z.array(conditionSchema).safeParse(parsed.conditions ?? []);
    return {
      verdict: parsed.verdict ?? "Analysis complete",
      conditions: conditions.success ? conditions.data : [],
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      disposition: parsed.disposition ?? "Consult an eye care professional for a full exam.",
    };
  });

export const writeAdvisory = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        riskScore: z.number(),
        acuityLeft: z.string(),
        acuityRight: z.string(),
        colorScore: z.string(),
        astigmatism: z.boolean(),
        contrastScore: z.number(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    const fallback =
      "Keep up regular eye checks, take a 20-second screen break every 20 minutes, and see an eye care professional if anything changes.";
    if (!key) return { advisory: fallback };
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "google/gemini-3.7-flash",
          messages: [
            {
              role: "system",
              content:
                "You explain at-home vision screening results in plain, calm language. Write 3-4 short sentences: what the numbers suggest, one or two practical habits, and when to see an eye care professional. Never diagnose. No lists, no markdown.",
            },
            {
              role: "user",
              content: `Risk score ${data.riskScore}/100. Acuity left ${data.acuityLeft}, right ${data.acuityRight}. Color plates ${data.colorScore}. Astigmatism signs: ${data.astigmatism ? "yes" : "no"}. Contrast sensitivity ${data.contrastScore}%.`,
            },
          ],
        }),
      });
      if (!res.ok) return { advisory: fallback };
      const json = await res.json();
      const text = json?.choices?.[0]?.message?.content;
      return { advisory: typeof text === "string" && text.trim() ? text.trim() : fallback };
    } catch {
      return { advisory: fallback };
    }
  });

export const saveTestSession = createServerFn({ method: "POST" })

  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        acuityLeft: z.number(),
        acuityRight: z.number(),
        colorScore: z.number(),
        colorTotal: z.number(),
        astigmatism: z.boolean(),
        contrastScore: z.number(),
        riskScore: z.number(),
        anomalyFlags: z.array(z.string()),
        rounds: z.record(z.string(), z.unknown()),
        prescription: z.record(z.string(), z.unknown()),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("test_sessions").insert({
      user_id: userId,
      acuity_left: data.acuityLeft,
      acuity_right: data.acuityRight,
      color_score: data.colorScore,
      color_total: data.colorTotal,
      astigmatism: data.astigmatism,
      contrast_score: data.contrastScore,
      risk_score: data.riskScore,
      anomaly_flags: data.anomalyFlags,
      rounds: data.rounds,
      prescription: data.prescription,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveDetection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        imageBase64: z.string().min(100).max(15_000_000),
        mime: z.string(),
        verdict: z.string(),
        conditions: z.array(conditionSchema),
        confidence: z.number(),
        disposition: z.string(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ext = data.mime.includes("png") ? "png" : "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const bytes = Uint8Array.from(atob(data.imageBase64), (c) => c.charCodeAt(0));
    const { error: upErr } = await supabase.storage
      .from("eye-photos")
      .upload(path, bytes, { contentType: data.mime });
    if (upErr) throw new Error(upErr.message);
    const { error } = await supabase.from("detections").insert({
      user_id: userId,
      image_path: path,
      verdict: data.verdict,
      conditions: data.conditions,
      confidence: data.confidence,
      disposition: data.disposition,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMySessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("test_sessions")
      .select("id, created_at, risk_score, acuity_left, acuity_right, color_score, color_total, astigmatism, contrast_score, anomaly_flags, prescription")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data;
  });

export const listMyDetections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("detections")
      .select("id, created_at, verdict, confidence, disposition, image_path")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    const withUrls = await Promise.all(
      (data ?? []).map(async (d) => {
        const { data: signed } = await supabase.storage
          .from("eye-photos")
          .createSignedUrl(d.image_path, 3600);
        return { ...d, imageUrl: signed?.signedUrl ?? null };
      }),
    );
    return withUrls;
  });
