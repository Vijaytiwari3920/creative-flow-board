import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTasks, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { COLUMNS, type Task, type TaskStatus } from "@/lib/types";
import { Column } from "./Column";
import { TaskCard } from "./TaskCard";
import { TaskDialog } from "./TaskDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface BoardProps {
  search: string;
  openDialogStatus: TaskStatus | null;
  setOpenDialogStatus: (s: TaskStatus | null) => void;
}

export function Board({ search, openDialogStatus, setOpenDialogStatus }: BoardProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: tasks = [], isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["tasks"] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q)
    );
  }, [tasks, search]);

  const byColumn = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], review: [], done: [] };
    for (const t of filtered) map[t.status].push(t);
    for (const k of Object.keys(map) as TaskStatus[]) {
      map[k].sort((a, b) => a.position - b.position);
    }
    return map;
  }, [filtered]);

  const handleDragStart = (e: DragStartEvent) => {
    const t = tasks.find((x) => x.id === e.active.id);
    if (t) setActiveTask(t);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const overData = over.data.current as { type?: string; status?: TaskStatus; task?: Task } | undefined;

    const sourceTask = tasks.find((t) => t.id === activeId);
    if (!sourceTask) return;

    let targetStatus: TaskStatus;
    let targetIndex: number;

    if (overData?.type === "column") {
      targetStatus = overData.status!;
      targetIndex = byColumn[targetStatus].length;
    } else if (overData?.type === "task") {
      targetStatus = overData.task!.status;
      const colTasks = byColumn[targetStatus].filter((t) => t.id !== activeId);
      targetIndex = colTasks.findIndex((t) => t.id === overId);
      if (targetIndex === -1) targetIndex = colTasks.length;
    } else {
      return;
    }

    // Compute new position between neighbors
    const colTasks = byColumn[targetStatus].filter((t) => t.id !== activeId);
    const before = colTasks[targetIndex - 1];
    const after = colTasks[targetIndex];
    let newPos: number;
    if (!before && !after) newPos = 1000;
    else if (!before) newPos = after!.position - 500;
    else if (!after) newPos = before.position + 1000;
    else newPos = (before.position + after.position) / 2;

    if (sourceTask.status === targetStatus && Math.abs(sourceTask.position - newPos) < 0.5) return;

    await updateTask.mutateAsync({ id: sourceTask.id, status: targetStatus, position: newPos });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-6 px-6 scrollbar-thin">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              column={col}
              tasks={byColumn[col.id]}
              onAdd={() => setOpenDialogStatus(col.id)}
              onEdit={(t) => setEditingTask(t)}
              onDelete={(t) => setDeletingTask(t)}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} isOverlay />
          )}
        </DragOverlay>
      </DndContext>

      <TaskDialog
        open={!!openDialogStatus && !editingTask}
        onOpenChange={(o) => !o && setOpenDialogStatus(null)}
        initialStatus={openDialogStatus ?? "todo"}
      />

      <TaskDialog
        open={!!editingTask}
        onOpenChange={(o) => !o && setEditingTask(null)}
        task={editingTask}
      />

      <AlertDialog open={!!deletingTask} onOpenChange={(o) => !o && setDeletingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deletingTask?.title}" will be permanently removed. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deletingTask) await deleteTask.mutateAsync(deletingTask.id);
                setDeletingTask(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
