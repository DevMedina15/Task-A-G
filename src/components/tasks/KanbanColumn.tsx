import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import { cn } from '@/lib/utils';
import { Task } from '@/hooks/useTasks';
import { Profile } from '@/hooks/useProfiles';
import { Database } from '@/integrations/supabase/types';

type TaskStatus = Database['public']['Enums']['task_status'];

interface KanbanColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  profiles: Profile[];
  color: string;
  onViewTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

export function KanbanColumn({ id, title, tasks, profiles, color, onViewTask, onEditTask, onDeleteTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex-1 min-w-[280px] max-w-[350px] flex flex-col rounded-xl transition-colors",
        isOver && "bg-primary/5 ring-2 ring-primary/20"
      )}
    >
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-t-xl", color)}>
        <span className="font-semibold text-sm">{title}</span>
        <span className="ml-auto bg-background/20 text-xs px-2 py-0.5 rounded-full font-medium">
          {tasks.length}
        </span>
      </div>
      
      <div className="flex-1 p-2 space-y-2 bg-muted/30 rounded-b-xl min-h-[200px]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanCard 
              key={task.id} 
              task={task}
              profiles={profiles}
              onView={onViewTask}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-20 text-muted-foreground text-sm border-2 border-dashed border-muted rounded-lg">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}
