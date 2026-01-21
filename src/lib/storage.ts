import { AppData, User, Project, Task, Notification } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'project_management_data';
const AUTH_KEY = 'project_management_auth';

// Default admin user
const defaultAdmin: User = {
  id: 'admin-001',
  email: 'admin@example.com',
  name: 'System Admin',
  role: 'ADMIN',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Demo user for testing
const demoUser: User = {
  id: 'user-001',
  email: 'user@example.com',
  name: 'John Doe',
  role: 'USER',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const defaultData: AppData = {
  users: [defaultAdmin, demoUser],
  projects: [],
  tasks: [],
  notifications: [],
};

// User credentials storage (password hashes in real app)
const CREDENTIALS_KEY = 'project_management_credentials';

interface UserCredentials {
  [email: string]: string;
}

const defaultCredentials: UserCredentials = {
  'admin@example.com': 'admin123',
  'user@example.com': 'user123',
};

export function initializeStorage(): void {
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
  }
  if (!localStorage.getItem(CREDENTIALS_KEY)) {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(defaultCredentials));
  }
}

export function getData(): AppData {
  initializeStorage();
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : defaultData;
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Auth functions
export function getAuthUser(): User | null {
  const authData = localStorage.getItem(AUTH_KEY);
  return authData ? JSON.parse(authData) : null;
}

export function setAuthUser(user: User | null): void {
  if (user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
}

export function validateCredentials(email: string, password: string): User | null {
  const credentials = JSON.parse(localStorage.getItem(CREDENTIALS_KEY) || '{}');
  const data = getData();
  
  if (credentials[email] === password) {
    const user = data.users.find(u => u.email === email && u.isActive);
    return user || null;
  }
  return null;
}

export function registerUser(email: string, password: string, name: string): User | null {
  const data = getData();
  const credentials = JSON.parse(localStorage.getItem(CREDENTIALS_KEY) || '{}');
  
  // Check if user already exists
  if (data.users.find(u => u.email === email)) {
    return null;
  }
  
  const newUser: User = {
    id: uuidv4(),
    email,
    name,
    role: 'USER',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  data.users.push(newUser);
  credentials[email] = password;
  
  saveData(data);
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
  
  return newUser;
}

// Users CRUD
export function getUsers(): User[] {
  return getData().users;
}

export function getUserById(id: string): User | undefined {
  return getData().users.find(u => u.id === id);
}

export function updateUser(id: string, updates: Partial<User>): User | null {
  const data = getData();
  const index = data.users.findIndex(u => u.id === id);
  if (index === -1) return null;
  
  data.users[index] = { 
    ...data.users[index], 
    ...updates, 
    updatedAt: new Date().toISOString() 
  };
  saveData(data);
  return data.users[index];
}

export function deleteUser(id: string): boolean {
  const data = getData();
  const index = data.users.findIndex(u => u.id === id);
  if (index === -1) return false;
  
  // Don't allow deleting the last admin
  const admins = data.users.filter(u => u.role === 'ADMIN');
  if (admins.length === 1 && data.users[index].role === 'ADMIN') {
    return false;
  }
  
  data.users.splice(index, 1);
  saveData(data);
  return true;
}

export function createUserByAdmin(email: string, password: string, name: string, role: 'ADMIN' | 'USER'): User | null {
  const data = getData();
  const credentials = JSON.parse(localStorage.getItem(CREDENTIALS_KEY) || '{}');
  
  if (data.users.find(u => u.email === email)) {
    return null;
  }
  
  const newUser: User = {
    id: uuidv4(),
    email,
    name,
    role,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  data.users.push(newUser);
  credentials[email] = password;
  
  saveData(data);
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
  
  return newUser;
}

// Projects CRUD
export function getProjects(): Project[] {
  return getData().projects;
}

export function getProjectById(id: string): Project | undefined {
  return getData().projects.find(p => p.id === id);
}

export function getProjectsForUser(userId: string): Project[] {
  return getData().projects.filter(p => 
    p.ownerId === userId || p.members.includes(userId)
  );
}

export function createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
  const data = getData();
  const newProject: Project = {
    ...project,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  data.projects.push(newProject);
  saveData(data);
  return newProject;
}

export function updateProject(id: string, updates: Partial<Project>): Project | null {
  const data = getData();
  const index = data.projects.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  data.projects[index] = { 
    ...data.projects[index], 
    ...updates, 
    updatedAt: new Date().toISOString() 
  };
  saveData(data);
  return data.projects[index];
}

export function deleteProject(id: string): boolean {
  const data = getData();
  const index = data.projects.findIndex(p => p.id === id);
  if (index === -1) return false;
  
  // Also delete all tasks for this project
  data.tasks = data.tasks.filter(t => t.projectId !== id);
  data.projects.splice(index, 1);
  saveData(data);
  return true;
}

// Tasks CRUD
export function getTasks(): Task[] {
  return getData().tasks;
}

export function getTaskById(id: string): Task | undefined {
  return getData().tasks.find(t => t.id === id);
}

export function getTasksByProject(projectId: string): Task[] {
  return getData().tasks.filter(t => t.projectId === projectId);
}

export function getTasksForUser(userId: string): Task[] {
  const data = getData();
  const userProjects = data.projects.filter(p => 
    p.ownerId === userId || p.members.includes(userId)
  );
  const projectIds = userProjects.map(p => p.id);
  
  return data.tasks.filter(t => 
    t.assigneeId === userId || projectIds.includes(t.projectId)
  );
}

export function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
  const data = getData();
  const newTask: Task = {
    ...task,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  data.tasks.push(newTask);
  saveData(data);
  
  // Create notification if task is assigned
  if (newTask.assigneeId) {
    createNotification({
      userId: newTask.assigneeId,
      type: 'TASK_ASSIGNED',
      title: 'New Task Assigned',
      message: `You have been assigned to "${newTask.title}"`,
      isRead: false,
      relatedId: newTask.id,
    });
  }
  
  return newTask;
}

export function updateTask(id: string, updates: Partial<Task>): Task | null {
  const data = getData();
  const index = data.tasks.findIndex(t => t.id === id);
  if (index === -1) return null;
  
  const oldTask = data.tasks[index];
  data.tasks[index] = { 
    ...oldTask, 
    ...updates, 
    updatedAt: new Date().toISOString() 
  };
  saveData(data);
  
  // Create notification if assignee changed
  if (updates.assigneeId && updates.assigneeId !== oldTask.assigneeId) {
    createNotification({
      userId: updates.assigneeId,
      type: 'TASK_ASSIGNED',
      title: 'New Task Assigned',
      message: `You have been assigned to "${data.tasks[index].title}"`,
      isRead: false,
      relatedId: id,
    });
  }
  
  return data.tasks[index];
}

export function deleteTask(id: string): boolean {
  const data = getData();
  const index = data.tasks.findIndex(t => t.id === id);
  if (index === -1) return false;
  
  data.tasks.splice(index, 1);
  saveData(data);
  return true;
}

// Notifications CRUD
export function getNotifications(): Notification[] {
  return getData().notifications;
}

export function getNotificationsForUser(userId: string): Notification[] {
  return getData().notifications.filter(n => n.userId === userId);
}

export function createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Notification {
  const data = getData();
  const newNotification: Notification = {
    ...notification,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  data.notifications.unshift(newNotification);
  saveData(data);
  return newNotification;
}

export function markNotificationAsRead(id: string): boolean {
  const data = getData();
  const notification = data.notifications.find(n => n.id === id);
  if (!notification) return false;
  
  notification.isRead = true;
  saveData(data);
  return true;
}

export function markAllNotificationsAsRead(userId: string): void {
  const data = getData();
  data.notifications.forEach(n => {
    if (n.userId === userId) {
      n.isRead = true;
    }
  });
  saveData(data);
}

export function deleteNotification(id: string): boolean {
  const data = getData();
  const index = data.notifications.findIndex(n => n.id === id);
  if (index === -1) return false;
  
  data.notifications.splice(index, 1);
  saveData(data);
  return true;
}
