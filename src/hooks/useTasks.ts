import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useEffect } from 'react';

export type Task = Tables<'tasks'>;
export type TaskInsert = TablesInsert<'tasks'>;
export type TaskUpdate = TablesUpdate<'tasks'>;

export function useTasks() {
  const queryClient = useQueryClient();

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Task[];
    },
  });
}

export function useTasksByProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', 'project', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!projectId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (task: TaskInsert) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single();
      
      if (error) throw error;
      
      // Create notification if task is assigned
      if (task.assignee_id) {
        await createTaskNotification(task.assignee_id, data.id, data.title, 'assigned');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates, previousAssigneeId }: { 
      id: string; 
      updates: TaskUpdate;
      previousAssigneeId?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Create notification if assignee changed
      if (updates.assignee_id && updates.assignee_id !== previousAssigneeId) {
        await createTaskNotification(updates.assignee_id, data.id, data.title, 'assigned');
      } else if (updates.status && previousAssigneeId) {
        await createTaskNotification(previousAssigneeId, data.id, data.title, 'updated');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

async function createTaskNotification(
  userId: string, 
  taskId: string, 
  taskTitle: string, 
  type: 'assigned' | 'updated'
) {
  // Check in-app notification settings
  const { data: settings } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const shouldShowInApp = type === 'assigned'
    ? (settings?.in_app_task_assigned ?? true)
    : (settings?.in_app_task_updated ?? true);

  // Create in-app notification if enabled
  if (shouldShowInApp) {
    const notificationData = {
      user_id: userId,
      type: type === 'assigned' ? 'TASK_ASSIGNED' as const : 'TASK_UPDATED' as const,
      title: type === 'assigned' ? 'New Task Assigned' : 'Task Updated',
      message: type === 'assigned' 
        ? `You have been assigned to "${taskTitle}"`
        : `Task "${taskTitle}" has been updated`,
      related_id: taskId,
      is_read: false,
    };

    await supabase.from('notifications').insert(notificationData);
  }
  
  // Email notifications disabled for now
}
