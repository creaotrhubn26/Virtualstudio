import { SceneComposition } from '../core/models/sceneComposer';

export interface ScheduledTask {
  id: string;
  sceneId: string;
  action: 'save' | 'export' | 'backup' | 'render' | 'publish';
  schedule: {
    type: 'once' | 'daily' | 'weekly' | 'monthly';
    time: string; // HH:mm format
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    date?: string; // ISO date for 'once'
  };
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
}

export const sceneSchedulerService = {
  /**
   * Create scheduled task
   */
  createTask(task: Omit<ScheduledTask, 'id' | 'createdAt' | 'nextRun'>): ScheduledTask {
    const newTask: ScheduledTask = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      nextRun: this.calculateNextRun(task.schedule),
    };

    this.saveTask(newTask);
    this.startScheduler();
    return newTask;
  },

  /**
   * Get all tasks
   */
  getTasks(): ScheduledTask[] {
    try {
      const stored = localStorage.getItem('virtualStudio_scheduledTasks');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  /**
   * Calculate next run time
   */
  calculateNextRun(schedule: ScheduledTask['schedule']): string {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);

    if (schedule.type === 'once') {
      return schedule.date || new Date().toISOString();
    }

    const nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    if (schedule.type === 'daily') {
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
    } else if (schedule.type === 'weekly' && schedule.dayOfWeek !== undefined) {
      const daysUntilNext = (schedule.dayOfWeek - now.getDay() + 7) % 7;
      nextRun.setDate(now.getDate() + (daysUntilNext || 7));
    } else if (schedule.type === 'monthly' && schedule.dayOfMonth !== undefined) {
      nextRun.setDate(schedule.dayOfMonth);
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
    }

    return nextRun.toISOString();
  },

  /**
   * Start scheduler
   */
  startScheduler(): void {
    // Check every minute for tasks to run
    setInterval(() => {
      const tasks = this.getTasks().filter(t => t.enabled);
      const now = new Date();

      tasks.forEach(task => {
        if (task.nextRun && new Date(task.nextRun) <= now) {
          this.executeTask(task);
          task.lastRun = new Date().toISOString();
          task.nextRun = this.calculateNextRun(task.schedule);
          this.saveTask(task);
        }
      });
    }, 60000); // Check every minute
  },

  /**
   * Execute scheduled task
   */
  async executeTask(task: ScheduledTask): Promise<void> {
    console.log(`Executing scheduled task: ${task.action} for scene ${task.sceneId}`);
    // In production, this would actually perform the action
    // For now, just log it
  },

  /**
   * Save task
   */
  saveTask(task: ScheduledTask): void {
    try {
      const tasks = this.getTasks();
      const existingIndex = tasks.findIndex(t => t.id === task.id);
      
      if (existingIndex >= 0) {
        tasks[existingIndex] = task;
      } else {
        tasks.push(task);
      }
      
      localStorage.setItem('virtualStudio_scheduledTasks', JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving task:', error);
    }
  },
};

