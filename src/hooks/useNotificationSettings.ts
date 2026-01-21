import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationSettings {
  id: string;
  user_id: string;
  email_task_assigned: boolean;
  email_task_updated: boolean;
  email_project_invite: boolean;
  in_app_task_assigned: boolean;
  in_app_task_updated: boolean;
  in_app_project_invite: boolean;
  created_at: string;
  updated_at: string;
}

const defaultSettings: Omit<NotificationSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  email_task_assigned: true,
  email_task_updated: true,
  email_project_invite: true,
  in_app_task_assigned: true,
  in_app_task_updated: true,
  in_app_project_invite: true,
};

export function useNotificationSettings(userId: string | undefined) {
  return useQuery({
    queryKey: ['notification-settings', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      
      // Return existing settings or defaults
      if (data) {
        return data as NotificationSettings;
      }
      
      return { ...defaultSettings, user_id: userId } as Partial<NotificationSettings>;
    },
    enabled: !!userId,
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      settings 
    }: { 
      userId: string; 
      settings: Partial<NotificationSettings>;
    }) => {
      // Check if settings exist
      const { data: existing } = await supabase
        .from('notification_settings')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('notification_settings')
          .update(settings)
          .eq('user_id', userId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('notification_settings')
          .insert({ user_id: userId, ...settings })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings', userId] });
    },
  });
}
