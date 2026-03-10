CREATE TABLE IF NOT EXISTS public.shared_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id uuid REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  share_code text NOT NULL UNIQUE,
  sharer_name text,
  is_active boolean DEFAULT true,
  views integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.shared_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own shared plans"
  ON public.shared_plans FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active shared plans"
  ON public.shared_plans FOR SELECT
  USING (is_active = true);

CREATE INDEX IF NOT EXISTS idx_shared_plans_code ON public.shared_plans(share_code);
CREATE INDEX IF NOT EXISTS idx_shared_plans_user ON public.shared_plans(user_id);
