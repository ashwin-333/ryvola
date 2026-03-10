create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  google_calendar_connected boolean default false,
  google_refresh_token text,
  google_access_token text,
  google_token_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.courses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  color text default '#6366f1',
  created_at timestamptz default now()
);

alter table public.courses enable row level security;
create policy "Users can CRUD own courses" on public.courses for all using (auth.uid() = user_id);

create table public.assignments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  description text,
  due_date timestamptz,
  requirements text[] default '{}',
  deliverables text[] default '{}',
  estimated_minutes integer default 0,
  status text default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  original_image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.assignments enable row level security;
create policy "Users can CRUD own assignments" on public.assignments for all using (auth.uid() = user_id);

create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  assignment_id uuid references public.assignments(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  estimated_minutes integer default 30,
  order_index integer default 0,
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.tasks enable row level security;
create policy "Users can CRUD own tasks" on public.tasks for all using (auth.uid() = user_id);

create table public.calendar_blocks (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  google_event_id text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz default now()
);

alter table public.calendar_blocks enable row level security;
create policy "Users can CRUD own calendar_blocks" on public.calendar_blocks for all using (auth.uid() = user_id);

create table public.progress_signals (
  id uuid default gen_random_uuid() primary key,
  assignment_id uuid references public.assignments(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  signal_type text not null check (signal_type in ('check_in', 'submission_detected', 'doc_activity')),
  note text,
  created_at timestamptz default now()
);

alter table public.progress_signals enable row level security;
create policy "Users can CRUD own progress_signals" on public.progress_signals for all using (auth.uid() = user_id);

create index idx_assignments_user_id on public.assignments(user_id);
create index idx_assignments_due_date on public.assignments(due_date);
create index idx_tasks_assignment_id on public.tasks(assignment_id);
create index idx_tasks_user_id on public.tasks(user_id);
create index idx_tasks_status on public.tasks(status);
create index idx_calendar_blocks_user_id on public.calendar_blocks(user_id);
create index idx_calendar_blocks_start_time on public.calendar_blocks(start_time);
