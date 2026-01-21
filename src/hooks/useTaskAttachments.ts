import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

export function useTaskAttachments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-attachments', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TaskAttachment[];
    },
    enabled: !!taskId,
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      taskId, 
      file, 
      userId 
    }: { 
      taskId: string; 
      file: File; 
      userId: string;
    }) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `${taskId}/${Date.now()}-${file.name}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      // Create attachment record
      const { data, error } = await supabase
        .from('task_attachments')
        .insert({
          task_id: taskId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: userId,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, filePath, taskId }: { id: string; filePath: string; taskId: string }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('task-attachments')
        .remove([filePath]);
      
      if (storageError) throw storageError;
      
      // Delete record
      const { error } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
    },
  });
}

export function getAttachmentUrl(filePath: string) {
  const { data } = supabase.storage
    .from('task-attachments')
    .getPublicUrl(filePath);
  return data.publicUrl;
}
