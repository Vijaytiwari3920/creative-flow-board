export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ColumnDef {
  id: TaskStatus;
  label: string;
  accent: string; // tailwind class
  dot: string;
}

export const COLUMNS: ColumnDef[] = [
  { id: "todo", label: "To Do", accent: "bg-col-todo", dot: "bg-col-todo" },
  { id: "in_progress", label: "In Progress", accent: "bg-col-progress", dot: "bg-col-progress" },
  { id: "review", label: "Review", accent: "bg-col-review", dot: "bg-col-review" },
  { id: "done", label: "Done", accent: "bg-col-done", dot: "bg-col-done" },
];

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};
