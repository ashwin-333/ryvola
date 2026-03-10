export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  google_calendar_connected: boolean;
  google_refresh_token: string | null;
  google_access_token: string | null;
  google_token_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Course = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
};

export type Assignment = {
  id: string;
  user_id: string;
  course_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  requirements: string[];
  deliverables: string[];
  estimated_minutes: number;
  status: "not_started" | "in_progress" | "completed";
  original_image_url: string | null;
  created_at: string;
  updated_at: string;
  course?: Course | null;
  tasks?: Task[];
};

export type Task = {
  id: string;
  assignment_id: string | null;
  user_id: string;
  title: string;
  estimated_minutes: number;
  order_index: number;
  status: "pending" | "in_progress" | "completed";
  completed_at: string | null;
  created_at: string;
  assignment?: Assignment | null;
};

export type CalendarBlock = {
  id: string;
  task_id: string | null;
  user_id: string;
  google_event_id: string | null;
  start_time: string;
  end_time: string;
  created_at: string;
};

export type ProgressSignal = {
  id: string;
  assignment_id: string | null;
  user_id: string;
  signal_type: "check_in" | "submission_detected" | "doc_activity";
  note: string | null;
  created_at: string;
};
