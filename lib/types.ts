export type ScheduleType = "rolling" | "fixed" | "once";
export type IntervalUnit = "day" | "week" | "month" | "year";
export type DueStatus = "overdue" | "due_soon" | "upcoming" | "done";

export type Category = {
  id: string;
  household_id: string;
  name: string;
  icon: string | null;
  sort_order: number;
};

export type Asset = {
  id: string;
  household_id: string;
  name: string;
  category_id: string | null;
  brand: string | null;
  model: string | null;
  serial: string | null;
  purchased_at: string | null;
  warranty_until: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: string;
  household_id: string;
  name: string;
  company: string | null;
  role: string | null;
  category_id: string | null;
  phone: string | null;
  email: string | null;
  line_id: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  household_id: string;
  title: string;
  category_id: string | null;
  asset_id: string | null;
  contact_id: string | null;
  notes: string | null;
  schedule_type: ScheduleType;
  interval_value: number | null;
  interval_unit: IntervalUnit | null;
  fixed_day_of_month: number | null;
  fixed_month: number | null;
  start_date: string;
  estimated_cost: number | null;
  paused_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskDue = Task & {
  last_completed_at: string | null;
  completion_count: number;
  due_on: string | null;
  status: DueStatus;
  days_until_due: number | null;
};

export type TaskCompletion = {
  id: string;
  task_id: string;
  household_id: string;
  completed_at: string;
  completed_by: string | null;
  contact_id: string | null;
  cost: number | null;
  notes: string | null;
  photo_path: string | null;
  created_at: string;
};

export type FridgeLocation = "fridge" | "freezer";
export type FridgeUnit = "pcs" | "pack" | "g" | "kg" | "ml" | "l";

export type FridgeItem = {
  id: string;
  household_id: string;
  name: string;
  location: FridgeLocation;
  quantity: number;
  unit: FridgeUnit;
  added_on: string;
  expires_on: string | null;
  opened_on: string | null;
  notes: string | null;
  removed_at: string | null;
  removed_reason: "used" | "discarded" | null;
  created_at: string;
  updated_at: string;
};

export type ActionState = { error?: string; success?: string } | undefined;
