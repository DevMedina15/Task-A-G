import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar, MoreVertical, Users, CheckSquare, Edit, Trash2, Eye } from 'lucide-react';
import { Project, ProjectMember } from '@/hooks/useProjects';
import { Task } from '@/hooks/useTasks';
import { Profile } from '@/hooks/useProfiles';

interface ProjectCardProps {
  project: Project;
  index: number;
  tasks: Task[];
  profiles: Profile[];
  projectMembers: ProjectMember[];
  onView: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

const statusColors: Record<string, string> = {
  PLANNING: 'bg-info/10 text-info border-info/20',
  ACTIVE: 'bg-success/10 text-success border-success/20',
  ON_HOLD: 'bg-warning/10 text-warning border-warning/20',
  COMPLETED: 'bg-primary/10 text-primary border-primary/20',
  ARCHIVED: 'bg-muted text-muted-foreground border-muted',
};

export function ProjectCard({ 
  project, 
  index, 
  tasks, 
  profiles, 
  projectMembers,
  onView, 
  onEdit, 
  onDelete 
}: ProjectCardProps) {
  const projectTasks = tasks.filter(t => t.project_id === project.id);
  const completedTasks = projectTasks.filter(t => t.status === 'DONE').length;
  const owner = profiles.find(p => p.user_id === project.owner_id);
  
  const memberUserIds = projectMembers
    .filter(pm => pm.project_id === project.id)
    .map(pm => pm.user_id);
  const memberProfiles = profiles.filter(p => memberUserIds.includes(p.user_id)).slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="group hover:shadow-lg transition-all duration-300 hover:border-primary/30 cursor-pointer" onClick={() => onView(project)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              <Badge variant="outline" className={statusColors[project.status]}>
                {project.status.replace('_', ' ')}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(project); }}>
                  <Eye className="mr-2 h-4 w-4" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(project); }}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(project); }} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="pb-3">
          <div 
            className="text-sm text-muted-foreground line-clamp-2 mb-4"
            dangerouslySetInnerHTML={{ __html: project.description || 'No description' }}
          />
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{project.start_date ? format(new Date(project.start_date), 'MMM d') : 'No date'}</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckSquare className="h-4 w-4" />
              <span>{completedTasks}/{projectTasks.length} tasks</span>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="pt-3 border-t">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="flex -space-x-2">
                {owner && (
                  <Avatar className="h-7 w-7 border-2 border-background">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {owner.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                )}
                {memberProfiles.map(member => (
                  <Avatar key={member.id} className="h-7 w-7 border-2 border-background">
                    <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {memberUserIds.length > 3 && (
                  <Avatar className="h-7 w-7 border-2 border-background">
                    <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                      +{memberUserIds.length - 3}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
            {projectTasks.length > 0 && (
              <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(completedTasks / projectTasks.length) * 100}%` }}
                />
              </div>
            )}
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
