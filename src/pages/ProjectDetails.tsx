import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useProject, useProjectMembers, useUpdateProject } from '@/hooks/useProjects';
import { useTasksByProject, useCreateTask, useUpdateTask, useDeleteTask, Task } from '@/hooks/useTasks';
import { useProfiles, Profile } from '@/hooks/useProfiles';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { TaskDeleteDialog } from '@/components/tasks/TaskDeleteDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  CheckSquare, 
  Users,
  Edit,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type TaskStatus = Database['public']['Enums']['task_status'];
type TaskPriority = Database['public']['Enums']['task_priority'];

const statusColors: Record<string, string> = {
  PLANNING: 'bg-info/10 text-info border-info/20',
  ACTIVE: 'bg-success/10 text-success border-success/20',
  ON_HOLD: 'bg-warning/10 text-warning border-warning/20',
  COMPLETED: 'bg-primary/10 text-primary border-primary/20',
  ARCHIVED: 'bg-muted text-muted-foreground border-muted',
};

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

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Fetch data using hooks
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: tasks = [] } = useTasksByProject(id);
  const { data: projectMembers = [] } = useProjectMembers(id);
  const { data: profiles = [] } = useProfiles();
  
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const updateProject = useUpdateProject();

  // Get member profiles for this project
  const memberProfiles: Profile[] = profiles.filter(p => 
    projectMembers.some(pm => pm.user_id === p.user_id) || p.user_id === project?.owner_id
  );

  const completedTasks = tasks.filter(t => t.status === 'DONE').length;
  const owner = profiles.find(p => p.user_id === project?.owner_id);

  const handleCreateTask = async (data: {
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    assigneeId: string | null;
    dueDate: string | null;
  }) => {
    if (!id) return;
    
    try {
      await createTask.mutateAsync({
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        assignee_id: data.assigneeId,
        due_date: data.dueDate,
        project_id: id,
      });
      setTaskFormOpen(false);
      toast.success('Task created successfully!');
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleEditTask = async (data: {
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    assigneeId: string | null;
    dueDate: string | null;
  }) => {
    if (!editingTask) return;
    
    try {
      await updateTask.mutateAsync({
        id: editingTask.id,
        updates: {
          title: data.title,
          description: data.description,
          priority: data.priority,
          status: data.status,
          assignee_id: data.assigneeId,
          due_date: data.dueDate,
        },
        previousAssigneeId: editingTask.assignee_id,
      });
      setEditingTask(null);
      setTaskFormOpen(false);
      toast.success('Task updated successfully!');
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    
    try {
      await deleteTask.mutateAsync(taskToDelete.id);
      setTaskToDelete(null);
      setDeleteDialogOpen(false);
      toast.success('Task deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleUpdateMembers = async () => {
    if (!project) return;
    
    try {
      await updateProject.mutateAsync({
        id: project.id,
        updates: {},
        memberIds: selectedMemberIds,
      });
      setMembersDialogOpen(false);
      toast.success('Members updated successfully!');
    } catch (error) {
      toast.error('Failed to update members');
      console.log(error);
    }
  };

  const openMembersDialog = () => {
    setSelectedMemberIds(projectMembers.map(pm => pm.user_id));
    setMembersDialogOpen(true);
  };

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground">Project not found</p>
        <Button variant="link" onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
            <Badge variant="outline" className={statusColors[project.status]}>
              {project.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openMembersDialog}>
              <UserPlus className="h-4 w-4 mr-2" />
              Manage Members
            </Button>
            <Button size="sm" onClick={() => { setEditingTask(null); setTaskFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        )}
      </div>

      {/* Project Info */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: project.description || 'No description' }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Timeline</p>
                <p className="text-sm font-medium">
                  {project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : 'No start date'} - {project.end_date ? format(new Date(project.end_date), 'MMM d, yyyy') : 'No end date'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckSquare className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Progress</p>
                <p className="text-sm font-medium">{completedTasks}/{tasks.length} tasks completed</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Team</p>
                <div className="flex items-center gap-2 mt-1">
                  {owner && (
                    <Avatar className="h-7 w-7 border-2 border-primary">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {owner.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {memberProfiles.filter(m => m.user_id !== project.owner_id).slice(0, 3).map(member => (
                    <Avatar key={member.id} className="h-7 w-7">
                      <AvatarFallback className="text-xs">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {memberProfiles.length > 4 && (
                    <span className="text-xs text-muted-foreground">+{memberProfiles.length - 4} more</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tasks</CardTitle>
          {tasks.length > 0 && (
            <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(completedTasks / tasks.length) * 100}%` }}
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No tasks yet. Create your first task!</p>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => {
                const assignee = task.assignee_id ? profiles.find(p => p.user_id === task.assignee_id) : null;
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{task.title}</span>
                          <Badge variant="outline" className={priorityColors[task.priority]}>
                            {task.priority}
                          </Badge>
                          <Badge variant="outline" className={taskStatusColors[task.status]}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {task.due_date && (
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(task.due_date), 'MMM d')}
                        </span>
                      )}
                      {assignee && (
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px]">
                            {assignee.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {  (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => { setEditingTask(task); setTaskFormOpen(true); }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => { setTaskToDelete(task); setDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Form Dialog */}
      <TaskFormDialog
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        task={editingTask}
        projectId={project.id}
        projectMembers={memberProfiles}
        onSubmit={editingTask ? handleEditTask : handleCreateTask}
      />

      {/* Task Delete Dialog */}
      <TaskDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        task={taskToDelete}
        onConfirm={handleDeleteTask}
      />

      {/* Manage Members Dialog */}
      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Project Members</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {profiles.filter(p => p.user_id !== project.owner_id).map(profile => (
                <div key={profile.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted">
                  <Checkbox
                    checked={selectedMemberIds.includes(profile.user_id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedMemberIds([...selectedMemberIds, profile.user_id]);
                      } else {
                        setSelectedMemberIds(selectedMemberIds.filter(id => id !== profile.user_id));
                      }
                    }}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {profile.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMembersDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateMembers}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
