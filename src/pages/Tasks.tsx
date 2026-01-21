import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { TaskDeleteDialog } from '@/components/tasks/TaskDeleteDialog';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { TaskCalendar } from '@/components/tasks/TaskCalendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskDetailDialog } from '@/components/tasks/TaskDetailDialog';
import { 
  Plus, 
  Search, 
  CheckSquare, 
  Calendar,
  LayoutList,
  LayoutGrid,
  CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, Task } from '@/hooks/useTasks';
import { useProjects, useProjectMembers } from '@/hooks/useProjects';
import { useProfiles, Profile } from '@/hooks/useProfiles';
import { Database } from '@/integrations/supabase/types';

type TaskStatus = Database['public']['Enums']['task_status'];
type TaskPriority = Database['public']['Enums']['task_priority'];

const statusColors: Record<string, string> = {
  PENDING: 'bg-muted text-muted-foreground',
  IN_PROGRESS: 'bg-info/10 text-info border-info/20',
  IN_REVIEW: 'bg-warning/10 text-warning border-warning/20',
  DONE: 'bg-success/10 text-success border-success/20',
};

const priorityColors: Record<string, string> = {
  LOW: 'bg-muted text-muted-foreground',
  MEDIUM: 'bg-info/10 text-info',
  HIGH: 'bg-warning/10 text-warning',
  URGENT: 'bg-destructive/10 text-destructive',
};

export default function Tasks() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar'>('list');

  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: projects = [] } = useProjects();
  const { data: profiles = [] } = useProfiles();
  const { data: projectMembers = [] } = useProjectMembers(selectedProjectId || editingTask?.project_id);
  
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Get members for the selected project
  const getProjectMembersAsProfiles = (projectId: string): Profile[] => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return [];
    
    const memberUserIds = projectMembers
      .filter(pm => pm.project_id === projectId)
      .map(pm => pm.user_id);
    
    // Include owner and members
    return profiles.filter(p => 
      p.user_id === project.owner_id || memberUserIds.includes(p.user_id)
    );
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesProject = projectFilter === 'all' || task.project_id === projectFilter;
    return matchesSearch && matchesStatus && matchesProject;
  });

  const handleCreateTask = async (data: {
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    assigneeId: string | null;
    dueDate: string | null;
  }) => {
    if (!selectedProjectId) {
      toast.error('Please select a project first');
      return;
    }
    
    try {
      await createTask.mutateAsync({
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        assignee_id: data.assigneeId,
        due_date: data.dueDate,
        project_id: selectedProjectId,
      });
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

  const openCreateDialog = () => {
    if (projects.length === 0) {
      toast.error('Create a project first before adding tasks');
      return;
    }
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
    setEditingTask(null);
    setFormOpen(true);
  };

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    setSelectedProjectId(task.project_id);
    setFormOpen(true);
  };

  const handleDeleteClick = (task: Task) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const stats = [
    { label: 'Total', value: tasks.length, color: 'text-foreground' },
    { label: 'Pending', value: tasks.filter(t => t.status === 'PENDING').length, color: 'text-muted-foreground' },
    { label: 'In Progress', value: tasks.filter(t => t.status === 'IN_PROGRESS').length, color: 'text-info' },
    { label: 'Done', value: tasks.filter(t => t.status === 'DONE').length, color: 'text-success' },
  ];

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Tasks</h1>
          <p className="text-muted-foreground">View and manage all your assigned tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'kanban' | 'calendar')}>
            <TabsList>
              <TabsTrigger value="list" className="gap-2">
                <LayoutList className="h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Calendar
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="IN_REVIEW">In Review</SelectItem>
            <SelectItem value="DONE">Done</SelectItem>
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isAdmin && (
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select project for new task" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Task Views */}
      {viewMode === 'calendar' ? (
        <TaskCalendar
          tasks={filteredTasks}
          projects={projects}
          profiles={profiles}
          onTaskClick={handleEditClick}
        />
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          tasks={filteredTasks}
          profiles={profiles}
          onViewTask={(task) => {
            setViewingTask(task);
            setDetailDialogOpen(true);
          }}
          onEditTask={handleEditClick}
          onDeleteTask={handleDeleteClick}
        />
      ) : (
        <>
          {filteredTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <CheckSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">No tasks found</h3>
              <p className="text-muted-foreground mb-4">
                {search || statusFilter !== 'all' || projectFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Create your first task to get started'}
              </p>
            </motion.div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {filteredTasks.map((task, index) => {
                    const project = projects.find(p => p.id === task.project_id);
                    const assignee = profiles.find(p => p.user_id === task.assignee_id);
                    
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          setViewingTask(task);
                          setDetailDialogOpen(true);
                        }}
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{task.title}</span>
                              <Badge variant="outline" className={priorityColors[task.priority]}>
                                {task.priority}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span 
                                className="hover:text-primary cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/projects/${task.project_id}`);
                                }}
                              >
                                {project?.name}
                              </span>
                              {task.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(task.due_date), 'MMM d')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={statusColors[task.status]}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                          {assignee ? (
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-xs">
                                {assignee.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-7 w-7 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">?</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Create/Edit Task Dialog */}
      {formOpen && (
        <TaskFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          task={editingTask}
          projectId={editingTask?.project_id || selectedProjectId}
          projectMembers={getProjectMembersAsProfiles(editingTask?.project_id || selectedProjectId)}
          onSubmit={editingTask ? handleEditTask : handleCreateTask}
        />
      )}

      {/* Delete Confirmation */}
      <TaskDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        task={taskToDelete}
        onConfirm={handleDeleteTask}
      />
      <TaskDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        task={viewingTask}
        assignee={viewingTask?.assignee_id ? profiles.find(p => p.user_id === viewingTask.assignee_id) || null : null}
        onEdit={() => {
          setDetailDialogOpen(false);
          if (viewingTask) {
            handleEditClick(viewingTask);
          }
        }}
        canEdit={isAdmin || viewingTask?.assignee_id === user?.id}
      />
    </div>
  );
}
