import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/types';
import { toast } from 'sonner';

interface ProfileWithRole {
  id: string;
  user_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
  role: 'admin' | 'user';
}

// Transform database profile + role to User type
function transformToUser(profile: ProfileWithRole): User {
  return {
    id: profile.user_id,
    email: profile.email,
    name: profile.name,
    role: profile.role === 'admin' ? 'ADMIN' : 'USER',
    avatar: profile.avatar_url || undefined,
    isActive: profile.is_active ?? true,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
      
      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
      
      if (rolesError) throw rolesError;

      // Map roles to profiles
      const usersWithRoles: ProfileWithRole[] = profiles.map(profile => {
        const userRole = roles.find(r => r.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role || 'user',
        };
      });

      return usersWithRoles.map(transformToUser);
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const dbRole = role === 'ADMIN' ? 'admin' : 'user';
      
      // Update the user's role in user_roles table
      const { data, error } = await supabase
        .from('user_roles')
        .update({ role: dbRole as 'admin' | 'user' })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['userRole'] });
    },
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, name }: { userId: string; name: string }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ name })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ email, password, name, role }: { 
      email: string; 
      password: string; 
      name: string; 
      role: UserRole 
    }) => {
      // Create user using Supabase Auth admin functions via edge function
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: { email, password, name, role: role === 'ADMIN' ? 'admin' : 'user' },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear usuario: ${error.message}`);
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      // Delete user via edge function (requires admin privileges)
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario eliminado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar usuario: ${error.message}`);
    },
  });
}