import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Mail, Settings as SettingsIcon, Loader2, Save, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationSettings, useUpdateNotificationSettings, NotificationSettings } from '@/hooks/useNotificationSettings';
import { useProfile, useUpdateProfile } from '@/hooks/useProfiles';
import { Input } from '@/components/ui/input';

export default function Settings() {
  const { user } = useAuth();
  const { data: settings, isLoading: settingsLoading } = useNotificationSettings(user?.id);
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const updateSettings = useUpdateNotificationSettings();
  const updateProfile = useUpdateProfile();

  const [emailTaskAssigned, setEmailTaskAssigned] = useState(true);
  const [emailTaskUpdated, setEmailTaskUpdated] = useState(true);
  const [emailProjectInvite, setEmailProjectInvite] = useState(true);
  const [inAppTaskAssigned, setInAppTaskAssigned] = useState(true);
  const [inAppTaskUpdated, setInAppTaskUpdated] = useState(true);
  const [inAppProjectInvite, setInAppProjectInvite] = useState(true);

  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setEmailTaskAssigned(settings.email_task_assigned ?? true);
      setEmailTaskUpdated(settings.email_task_updated ?? true);
      setEmailProjectInvite(settings.email_project_invite ?? true);
      setInAppTaskAssigned(settings.in_app_task_assigned ?? true);
      setInAppTaskUpdated(settings.in_app_task_updated ?? true);
      setInAppProjectInvite(settings.in_app_project_invite ?? true);
    }
  }, [settings]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.name);
    }
  }, [profile]);

  const handleSaveNotifications = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      await updateSettings.mutateAsync({
        userId: user.id,
        settings: {
          email_task_assigned: emailTaskAssigned,
          email_task_updated: emailTaskUpdated,
          email_project_invite: emailProjectInvite,
          in_app_task_assigned: inAppTaskAssigned,
          in_app_task_updated: inAppTaskUpdated,
          in_app_project_invite: inAppProjectInvite,
        },
      });
      toast.success('Notification settings saved!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        userId: user.id,
        updates: { name: displayName.trim() },
      });
      toast.success('Profile updated!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (settingsLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground">Manage your account and notification preferences</p>
      </div>

      {/* Profile Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile?.email || user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Profile
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notification Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Choose how you want to be notified about activity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* In-App Notifications */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Bell className="h-4 w-4" />
                In-App Notifications
              </div>
              
              <div className="space-y-3 pl-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="inAppTaskAssigned" className="cursor-pointer">
                    Task assignments
                  </Label>
                  <Switch
                    id="inAppTaskAssigned"
                    checked={inAppTaskAssigned}
                    onCheckedChange={setInAppTaskAssigned}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="inAppTaskUpdated" className="cursor-pointer">
                    Task updates
                  </Label>
                  <Switch
                    id="inAppTaskUpdated"
                    checked={inAppTaskUpdated}
                    onCheckedChange={setInAppTaskUpdated}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="inAppProjectInvite" className="cursor-pointer">
                    Project invitations
                  </Label>
                  <Switch
                    id="inAppProjectInvite"
                    checked={inAppProjectInvite}
                    onCheckedChange={setInAppProjectInvite}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Email Notifications */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Mail className="h-4 w-4" />
                Email Notifications
              </div>
              
              <div className="space-y-3 pl-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailTaskAssigned" className="cursor-pointer">
                      Task assignments
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Receive an email when assigned to a new task
                    </p>
                  </div>
                  <Switch
                    id="emailTaskAssigned"
                    checked={emailTaskAssigned}
                    onCheckedChange={setEmailTaskAssigned}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailTaskUpdated" className="cursor-pointer">
                      Task updates
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Receive an email when your tasks are updated
                    </p>
                  </div>
                  <Switch
                    id="emailTaskUpdated"
                    checked={emailTaskUpdated}
                    onCheckedChange={setEmailTaskUpdated}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailProjectInvite" className="cursor-pointer">
                      Project invitations
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Receive an email when invited to a project
                    </p>
                  </div>
                  <Switch
                    id="emailProjectInvite"
                    checked={emailProjectInvite}
                    onCheckedChange={setEmailProjectInvite}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <Button onClick={handleSaveNotifications} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Preferences
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
