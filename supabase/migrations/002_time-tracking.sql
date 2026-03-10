ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS actual_minutes integer;

ALTER TABLE public.calendar_blocks ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE public.calendar_blocks ADD COLUMN IF NOT EXISTS finished_at timestamptz;
ALTER TABLE public.calendar_blocks ADD COLUMN IF NOT EXISTS actual_minutes integer;
