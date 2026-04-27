import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { ColumnDef, Task } from "@/lib/types";
import { TaskCard } from "./TaskCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ColumnProps {
  column: ColumnDef;
  tasks: Task[];
  onAdd: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function Column({ column, tasks, onAdd, onEdit, onDelete }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", status: column.id },
  });

  return (
    <div className="flex flex-col w-[300px] shrink-0 bg-secondary/40 rounded-2xl border border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", column.dot)} />
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{column.label}</h3>
          <span className="text-xs font-medium text-muted-foreground bg-card px-1.5 py-0.5 rounded">
            {tasks.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onAdd}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* List */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 px-2 pb-2 space-y-2 min-h-[120px] transition-colors rounded-b-2xl",
          isOver && "bg-primary-soft/60"
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <button
            onClick={onAdd}
            className="w-full py-8 text-center text-xs text-muted-foreground hover:text-foreground border-2 border-dashed border-border/60 rounded-xl hover:border-primary/40 hover:bg-card/40 transition-colors"
          >
            <Plus className="h-4 w-4 mx-auto mb-1 opacity-60" />
            Add a task
          </button>
        )}
      </div>
    </div>
  );
}
