ALTER TABLE public.tasks ALTER COLUMN assignment_id DROP NOT NULL;

ALTER TABLE public.progress_signals ALTER COLUMN assignment_id DROP NOT NULL;

ALTER TABLE public.calendar_blocks ALTER COLUMN task_id DROP NOT NULL;
