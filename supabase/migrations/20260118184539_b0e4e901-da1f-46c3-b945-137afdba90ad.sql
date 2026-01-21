-- Update notifications policy to be more specific
DROP POLICY "Anyone can create notifications" ON public.notifications;
CREATE POLICY "Admins and system can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NOT NULL);

-- Update email_logs policy to be more specific
DROP POLICY "Anyone can create email logs" ON public.email_logs;
CREATE POLICY "System can create email logs"
  ON public.email_logs FOR INSERT
  TO authenticated
  WITH CHECK (to_user_id IS NOT NULL AND to_email IS NOT NULL);