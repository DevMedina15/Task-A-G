import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { TaskAttachments } from '@/components/tasks/TaskAttachments';
import { format } from 'date-fns';
import { Edit, Calendar, User } from 'lucide-react';
import { Task } from '@/hooks/useTasks';
import { Profile } from '@/hooks/useProfiles';

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  assignee: Profile | null;
  onEdit: () => void;
  canEdit: boolean;
}

const taskStatusColors: Record<string, string> = {
  PENDING: 'bg-muted text-muted-foreground',
  IN_PROGRESS: 'bg-info/10 text-info',
  IN_REVIEW: 'bg-warning/10 text-warning',
  DONE: 'bg-success/10 text-success',
};

const priorityColors: Record<string, string> = {
  LOW: 'bg-muted text-muted-foreground',
  MEDIUM: 'bg-info/10 text-info',
  HIGH: 'bg-warning/10 text-warning',
  URGENT: 'bg-destructive/10 text-destructive',
};

export function TaskDetailDialog({ 
  open, 
  onOpenChange, 
  task, 
  assignee,
  onEdit,
  canEdit 
}: TaskDetailDialogProps) {
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-start justify-between">
          <div className="flex-1">
            <DialogTitle className="text-2xl pr-8">{task.title}</DialogTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={taskStatusColors[task.status]}>
                {task.status.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className={priorityColors[task.priority]}>
                {task.priority}
              </Badge>
            </div>
          </div>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            {task.due_date && (
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p className="text-sm font-medium">
                    {format(new Date(task.due_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}
            
            {assignee && (
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Assigned to</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {assignee.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium">{assignee.name}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Description</h3>
            {task.description ? (
              <div 
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: task.description }}
              />
            ) : (
              <p className="text-sm text-muted-foreground italic">No description provided</p>
            )}
          </div>

          <Separator />

          {/* Attachments */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Attachments</h3>
            <TaskAttachments taskId={task.id} />
          </div>

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Created: {format(new Date(task.created_at), 'MMM d, yyyy • h:mm a')}</p>
            <p>Updated: {format(new Date(task.updated_at), 'MMM d, yyyy • h:mm a')}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}