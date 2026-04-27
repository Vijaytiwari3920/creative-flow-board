import { format, isPast, isToday, parseISO } from "date-fns";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, GripVertical, Pencil, Trash2 } from "lucide-react";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  isOverlay?: boolean;
}

const PRIORITY_STYLES: Record<Task["priority"], string> = {
  low: "bg-blue-50 text-priority-low border-blue-200/60",
  medium: "bg-amber-50 text-priority-medium border-amber-200/60",
  high: "bg-red-50 text-priority-high border-red-200/60",
};

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function TaskCard({ task, onEdit, onDelete, isOverlay }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: "task", task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const due = task.due_date ? parseISO(task.due_date) : null;
  const overdue = due && !isToday(due) && isPast(due) && task.status !== "done";
  const dueToday = due && isToday(due);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl bg-card border border-border p-3.5 shadow-card animate-card-in",
        "transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 hover:border-border/80",
        isDragging && !isOverlay && "opacity-40",
        isOverlay && "shadow-elevated rotate-2 cursor-grabbing"
      )}
    >
      {/* drag handle area covers most of the card */}
      <div className="absolute inset-0 cursor-grab" {...attributes} {...listeners} aria-label="Drag task" />

      <div className="relative flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm leading-snug text-foreground line-clamp-2">{task.title}</h4>
            <GripVertical className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border",
                PRIORITY_STYLES[task.priority]
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", `bg-priority-${task.priority}`)} />
              {PRIORITY_LABEL[task.priority]}
            </span>

            {due && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium",
                  overdue
                    ? "bg-red-50 text-priority-high"
                    : dueToday
                      ? "bg-amber-50 text-priority-medium"
                      : "bg-secondary text-muted-foreground"
                )}
              >
                <Calendar className="h-3 w-3" />
                {format(due, "MMM d")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* actions */}
      <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 bg-card/80 backdrop-blur hover:bg-secondary"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 bg-card/80 backdrop-blur hover:bg-destructive/10 hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
