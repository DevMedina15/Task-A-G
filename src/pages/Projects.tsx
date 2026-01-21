import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';
import { ProjectDeleteDialog } from '@/components/projects/ProjectDeleteDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';
import { 
  useProjects, 
  useCreateProject, 
  useUpdateProject, 
  useDeleteProject,
  Project 
} from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useProfiles } from '@/hooks/useProfiles';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

type ProjectStatus = Database['public']['Enums']['project_status'];

export default function Projects() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const { data: projects = [], isLoading } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: profiles = [] } = useProfiles();
  
  // Fetch all project members
  const { data: allProjectMembers = [] } = useQuery({
    queryKey: ['all-project-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select('*');
      if (error) throw error;
      return data;
    },
  });
  
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreate = async (data: {
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    status: ProjectStatus;
    members: string[];
  }) => {
    if (!user) return;
    
    try {
      await createProject.mutateAsync({
        project: {
          name: data.name,
          description: data.description,
          start_date: data.startDate,
          end_date: data.endDate,
          status: data.status,
          owner_id: user.id,
        },
        memberIds: data.members,
      });
      toast.success('Project created successfully!');
    } catch (error) {
      toast.error('Failed to create project');
    }
  };

  const handleEdit = async (data: {
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    status: ProjectStatus;
    members: string[];
  }) => {
    if (!editingProject) return;
    
    try {
      await updateProject.mutateAsync({
        id: editingProject.id,
        updates: {
          name: data.name,
          description: data.description,
          start_date: data.startDate,
          end_date: data.endDate,
          status: data.status,
        },
        memberIds: data.members,
      });
      setEditingProject(null);
      toast.success('Project updated successfully!');
    } catch (error) {
      toast.error('Failed to update project');
    }
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;
    
    try {
      await deleteProject.mutateAsync(projectToDelete.id);
      setProjectToDelete(null);
      setDeleteDialogOpen(false);
      toast.success('Project deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const handleViewProject = (project: Project) => {
    navigate(`/projects/${project.id}`);
  };

  const handleEditClick = (project: Project) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
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
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground">Manage and track all your projects</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditingProject(null); setFormOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PLANNING">Planning</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="ON_HOLD">On Hold</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Project Grid */}
      {filteredProjects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <FolderKanban className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">No projects found</h3>
          <p className="text-muted-foreground mb-4">
            {search || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Create your first project to get started'}
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              tasks={tasks}
              profiles={profiles}
              projectMembers={allProjectMembers}
              onView={handleViewProject}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Project Dialog */}
      {isAdmin && user && (
        <ProjectFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          project={editingProject}
          currentUserId={user.id}
          onSubmit={editingProject ? handleEdit : handleCreate}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ProjectDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        project={projectToDelete}
        onConfirm={handleDelete}
      />
    </div>
  );
}
