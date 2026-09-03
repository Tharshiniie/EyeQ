CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acuity_left NUMERIC,
  acuity_right NUMERIC,
  color_score INT,
  color_total INT,
  astigmatism BOOLEAN,
  contrast_score NUMERIC,
  risk_score INT,
  anomaly_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  rounds JSONB NOT NULL DEFAULT '{}'::jsonb,
  prescription JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_sessions TO authenticated;
GRANT ALL ON public.test_sessions TO service_role;
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own sessions" ON public.test_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON public.test_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own sessions" ON public.test_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  image_path TEXT NOT NULL,
  verdict TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC,
  disposition TEXT
);
GRANT SELECT, INSERT, DELETE ON public.detections TO authenticated;
GRANT ALL ON public.detections TO service_role;
ALTER TABLE public.detections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own detections" ON public.detections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own detections" ON public.detections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own detections" ON public.detections FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users upload own eye photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'eye-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own eye photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'eye-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own eye photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'eye-photos' AND (storage.foldername(name))[1] = auth.uid()::text);