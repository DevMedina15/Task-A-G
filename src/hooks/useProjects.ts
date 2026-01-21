import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Project = Tables<'projects'>;
export type ProjectInsert = TablesInsert<'projects'>;
export type ProjectUpdate = TablesUpdate<'projects'>;
export type ProjectMember = Tables<'project_members'>;

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Project;
    },
    enabled: !!id,
  });
}

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId);
      
      if (error) throw error;
      return data as ProjectMember[];
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ project, memberIds }: { project: ProjectInsert; memberIds: string[] }) => {
      // Create project
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single();
      
      if (projectError) throw projectError;
      
      // Add members
      if (memberIds.length > 0) {
        const members = memberIds.map(userId => ({
          project_id: newProject.id,
          user_id: userId,
        }));
        
        const { error: membersError } = await supabase
          .from('project_members')
          .insert(members);
        
        if (membersError) throw membersError;
      }
      
      return newProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      updates, 
      memberIds 
    }: { 
      id: string; 
      updates: ProjectUpdate; 
      memberIds?: string[];
    }) => {
      let projectData = null;
      
      // Solo actualiza el project si hay cambios reales
      if (Object.keys(updates).length > 0) {
        const { data, error } = await supabase
          .from('projects')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        projectData = data;
      }
      
      // Update members if provided
      if (memberIds !== undefined) {
        // Delete existing members
        const { error: deleteError } = await supabase
          .from('project_members')
          .delete()
          .eq('project_id', id);
        
        if (deleteError) throw deleteError;
        
        // Add new members
        if (memberIds.length > 0) {
          const members = memberIds.map(userId => ({
            project_id: id,
            user_id: userId,
          }));
          
          const { error: insertError } = await supabase
            .from('project_members')
            .insert(members);
          
          if (insertError) throw insertError;
        }
      }
      
      return projectData;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
