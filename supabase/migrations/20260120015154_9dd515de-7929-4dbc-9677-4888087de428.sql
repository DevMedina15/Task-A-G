-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true);

-- Create task_attachments table
CREATE TABLE public.task_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_attachments
CREATE POLICY "Users can view task attachments"
  ON public.task_attachments FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert task attachments"
  ON public.task_attachments FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete task attachments"
  ON public.task_attachments FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Storage RLS policies
CREATE POLICY "Anyone can view task attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-attachments');

CREATE POLICY "Admins can upload task attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task-attachments' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete task attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'task-attachments' AND public.is_admin(auth.uid()));

-- Create notification_settings table
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email_task_assigned BOOLEAN NOT NULL DEFAULT true,
  email_task_updated BOOLEAN NOT NULL DEFAULT true,
  email_project_invite BOOLEAN NOT NULL DEFAULT true,
  in_app_task_assigned BOOLEAN NOT NULL DEFAULT true,
  in_app_task_updated BOOLEAN NOT NULL DEFAULT true,
  in_app_project_invite BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_settings
CREATE POLICY "Users can view their own settings"
  ON public.notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();