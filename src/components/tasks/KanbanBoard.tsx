import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { Task, useUpdateTask } from '@/hooks/useTasks';
import { Profile } from '@/hooks/useProfiles';
import { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type TaskStatus = Database['public']['Enums']['task_status'];

interface KanbanBoardProps {
  tasks: Task[];
  profiles: Profile[];
  onViewTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

const columns: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'PENDING', title: 'Pending', color: 'bg-muted text-muted-foreground' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-info/20 text-info' },
  { id: 'IN_REVIEW', title: 'In Review', color: 'bg-warning/20 text-warning' },
  { id: 'DONE', title: 'Done', color: 'bg-success/20 text-success' },
];

export function KanbanBoard({ tasks, profiles, onViewTask, onEditTask, onDeleteTask }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const updateTask = useUpdateTask();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveTask(null);
      return;
    }

    const taskId = active.id as string;
    const overId = over.id as string;
    const draggedTask = tasks.find(t => t.id === taskId);
    
    if (!draggedTask) {
      setActiveTask(null);
      return;
    }

    // Check if dropped on a column
    const targetColumn = columns.find(c => c.id === overId);
    let newStatus: TaskStatus | null = null;

    if (targetColumn) {
      newStatus = targetColumn.id;
    } else {
      // Dropped on another task - get that task's status
      const overTask = tasks.find(t => t.id === overId);
      if (overTask && overTask.id !== taskId) {
        newStatus = overTask.status;
      }
    }

    if (newStatus && newStatus !== draggedTask.status) {
      try {
        await updateTask.mutateAsync({
          id: taskId,
          updates: { status: newStatus },
          previousAssigneeId: draggedTask.assignee_id,
        });
        toast.success(`Task moved to ${newStatus.replace('_', ' ').toLowerCase()}`);
      } catch (error) {
        toast.error('Failed to update task status');
      }
    }
    
    setActiveTask(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
        {columns.map(column => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            tasks={tasks.filter(t => t.status === column.id)}
            profiles={profiles}
            onViewTask={onViewTask}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>
      
      <DragOverlay>
        {activeTask ? (
          <div className="rotate-3 opacity-90">
            <KanbanCard 
              task={activeTask} 
              profiles={profiles}
              onView={() => {}} 
              onEdit={() => {}} 
              onDelete={() => {}} 
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
