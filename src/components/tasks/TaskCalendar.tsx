import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Task } from '@/hooks/useTasks';
import { Profile } from '@/hooks/useProfiles';
import { Tables } from '@/integrations/supabase/types';

type Project = Tables<'projects'>;

interface TaskCalendarProps {
  tasks: Task[];
  projects: Project[];
  profiles: Profile[];
  onTaskClick: (task: Task) => void;
}

const priorityColors: Record<string, string> = {
  LOW: 'bg-muted text-muted-foreground',
  MEDIUM: 'bg-info/10 text-info border-info/30',
  HIGH: 'bg-warning/10 text-warning border-warning/30',
  URGENT: 'bg-destructive/10 text-destructive border-destructive/30',
};

const statusColors: Record<string, string> = {
  PENDING: 'border-l-muted-foreground',
  IN_PROGRESS: 'border-l-info',
  IN_REVIEW: 'border-l-warning',
  DONE: 'border-l-success',
};

export function TaskCalendar({ tasks, projects, profiles, onTaskClick }: TaskCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Group tasks by due date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(task => {
      if (task.due_date) {
        const dateKey = format(parseISO(task.due_date), 'yyyy-MM-dd');
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(task);
      }
    });
    return map;
  }, [tasks]);

  // Get tasks for selected date
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return tasksByDate.get(dateKey) || [];
  }, [selectedDate, tasksByDate]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDayOfMonth = startOfMonth(currentMonth).getDay();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentMonth(new Date());
                setSelectedDate(new Date());
              }}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Week days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div
                key={day}
                className="text-center text-sm font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before first of month */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24" />
            ))}

            {/* Day cells */}
            {days.map((day, index) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayTasks = tasksByDate.get(dateKey) || [];
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);

              return (
                <motion.div
                  key={dateKey}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.01 }}
                  className={cn(
                    'h-24 p-1 border rounded-lg cursor-pointer transition-all',
                    'hover:border-primary/50 hover:bg-accent/50',
                    isSelected && 'border-primary bg-primary/5',
                    !isCurrentMonth && 'opacity-50',
                    isToday(day) && 'border-primary'
                  )}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className={cn(
                    'text-sm font-medium mb-1',
                    isToday(day) && 'text-primary'
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    {dayTasks.slice(0, 2).map(task => (
                      <div
                        key={task.id}
                        className={cn(
                          'text-xs truncate px-1 py-0.5 rounded border-l-2',
                          statusColors[task.status],
                          'bg-muted/50'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskClick(task);
                        }}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <div className="text-xs text-muted-foreground px-1">
                        +{dayTasks.length - 2} more
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected date tasks */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">
            {selectedDate
              ? format(selectedDate, 'EEEE, MMMM d')
              : 'Select a date'}
          </h3>
        </CardHeader>
        <CardContent>
          {selectedDate ? (
            selectedDateTasks.length > 0 ? (
              <div className="space-y-3">
                {selectedDateTasks.map(task => {
                  const project = projects.find(p => p.id === task.project_id);
                  const assignee = profiles.find(p => p.user_id === task.assignee_id);

                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-all',
                        'hover:bg-accent border-l-4',
                        statusColors[task.status]
                      )}
                      onClick={() => onTaskClick(task)}
                    >
                      <div className="font-medium text-sm mb-1">{task.title}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={priorityColors[task.priority]}>
                          {task.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {project?.name}
                        </span>
                      </div>
                      {assignee && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Assigned to {assignee.name}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No tasks due on this date.
              </p>
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              Click on a date to see tasks due that day.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
