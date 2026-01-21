import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FolderKanban, CheckSquare, Users, Clock, TrendingUp, Activity } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useProfiles } from '@/hooks/useProfiles';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { format, subDays, startOfDay, isAfter } from 'date-fns';

const COLORS = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(142, 76%, 36%)',
  warning: 'hsl(38, 92%, 50%)',
  info: 'hsl(199, 89%, 48%)',
  destructive: 'hsl(var(--destructive))',
  muted: 'hsl(var(--muted-foreground))',
};

const statusColorMap: Record<string, string> = {
  PENDING: COLORS.muted,
  IN_PROGRESS: COLORS.info,
  IN_REVIEW: COLORS.warning,
  DONE: COLORS.success,
};

const projectStatusColorMap: Record<string, string> = {
  PLANNING: COLORS.info,
  ACTIVE: COLORS.success,
  ON_HOLD: COLORS.warning,
  COMPLETED: COLORS.primary,
  ARCHIVED: COLORS.muted,
};

export default function Dashboard() {
  const { user } = useAuth();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: profiles = [] } = useProfiles();

  const isLoading = projectsLoading || tasksLoading;

  // Stats calculations
  const activeProjects = projects.filter(p => p.status === 'ACTIVE').length;
  const pendingTasks = tasks.filter(t => t.status === 'PENDING').length;
  const completedTasks = tasks.filter(t => t.status === 'DONE').length;
  const myTasks = tasks.filter(t => t.assignee_id === user?.id);

  const stats = [
    { title: 'Active Projects', value: activeProjects, icon: FolderKanban, color: 'text-primary', bgColor: 'bg-primary/10' },
    { title: 'Total Tasks', value: tasks.length, icon: CheckSquare, color: 'text-info', bgColor: 'bg-info/10' },
    { title: 'Pending Tasks', value: pendingTasks, icon: Clock, color: 'text-warning', bgColor: 'bg-warning/10' },
    { title: 'Team Members', value: profiles.length, icon: Users, color: 'text-success', bgColor: 'bg-success/10' },
  ];

  // Task distribution by status
  const tasksByStatus = [
    { name: 'Pending', value: tasks.filter(t => t.status === 'PENDING').length, color: statusColorMap.PENDING },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'IN_PROGRESS').length, color: statusColorMap.IN_PROGRESS },
    { name: 'In Review', value: tasks.filter(t => t.status === 'IN_REVIEW').length, color: statusColorMap.IN_REVIEW },
    { name: 'Done', value: tasks.filter(t => t.status === 'DONE').length, color: statusColorMap.DONE },
  ];

  // Project distribution by status
  const projectsByStatus = [
    { name: 'Planning', value: projects.filter(p => p.status === 'PLANNING').length, color: projectStatusColorMap.PLANNING },
    { name: 'Active', value: projects.filter(p => p.status === 'ACTIVE').length, color: projectStatusColorMap.ACTIVE },
    { name: 'On Hold', value: projects.filter(p => p.status === 'ON_HOLD').length, color: projectStatusColorMap.ON_HOLD },
    { name: 'Completed', value: projects.filter(p => p.status === 'COMPLETED').length, color: projectStatusColorMap.COMPLETED },
    { name: 'Archived', value: projects.filter(p => p.status === 'ARCHIVED').length, color: projectStatusColorMap.ARCHIVED },
  ].filter(p => p.value > 0);

  // Task priority distribution
  const tasksByPriority = [
    { name: 'Low', value: tasks.filter(t => t.priority === 'LOW').length },
    { name: 'Medium', value: tasks.filter(t => t.priority === 'MEDIUM').length },
    { name: 'High', value: tasks.filter(t => t.priority === 'HIGH').length },
    { name: 'Urgent', value: tasks.filter(t => t.priority === 'URGENT').length },
  ];

  // Activity over last 7 days (tasks created)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStart = startOfDay(date);
    const dayEnd = startOfDay(subDays(date, -1));
    
    const tasksCreated = tasks.filter(t => {
      const taskDate = new Date(t.created_at);
      return isAfter(taskDate, dayStart) && !isAfter(taskDate, dayEnd);
    }).length;
    
    const tasksCompleted = tasks.filter(t => {
      if (t.status !== 'DONE') return false;
      const taskDate = new Date(t.updated_at);
      return isAfter(taskDate, dayStart) && !isAfter(taskDate, dayEnd);
    }).length;
    
    return {
      date: format(date, 'EEE'),
      created: tasksCreated,
      completed: tasksCompleted,
    };
  });

  // Team workload (tasks per member)
  const teamWorkload = profiles
    .map(profile => ({
      name: profile.name.split(' ')[0],
      tasks: tasks.filter(t => t.assignee_id === profile.user_id).length,
      completed: tasks.filter(t => t.assignee_id === profile.user_id && t.status === 'DONE').length,
    }))
    .filter(m => m.tasks > 0)
    .sort((a, b) => b.tasks - a.tasks)
    .slice(0, 6);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your projects and tasks</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Task Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              Task Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No tasks yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={tasksByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {tasksByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Project Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary" />
              Project Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No projects yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={projectsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {projectsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Task Priority */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Task Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No tasks yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={tasksByPriority} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="name" type="category" width={60} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="value" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Weekly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={last7Days}>
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.info} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.info} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="created" 
                  name="Created"
                  stroke={COLORS.info} 
                  fillOpacity={1} 
                  fill="url(#colorCreated)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  name="Completed"
                  stroke={COLORS.success} 
                  fillOpacity={1} 
                  fill="url(#colorCompleted)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Team Workload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Team Workload
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teamWorkload.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No assigned tasks yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={teamWorkload}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="tasks" name="Total Tasks" fill={COLORS.info} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Items Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-muted-foreground text-sm">No projects yet. Create your first project!</p>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 5).map(project => (
                  <motion.div 
                    key={project.id} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="font-medium">{project.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {project.status.replace('_', ' ')}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">No tasks assigned to you.</p>
            ) : (
              <div className="space-y-3">
                {myTasks.slice(0, 5).map(task => {
                  const assignee = profiles.find(p => p.user_id === task.assignee_id);
                  return (
                    <motion.div 
                      key={task.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {assignee && (
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">
                              {assignee.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <span className="font-medium truncate">{task.title}</span>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
