import { SceneComposition } from '../core/models/sceneComposer';

export type TriggerEvent = 'scene.created' | 'scene.updated' | 'scene.deleted' | 'scene.shared' | 'comment.added' | 'review.created';

export interface Trigger {
  id: string;
  event: TriggerEvent;
  condition?: (data: any) => boolean;
  action: (data: any) => void | Promise<void>;
  enabled: boolean;
  createdAt: string;
}

export const sceneTriggerService = {
  triggers: [] as Trigger[],

  /**
   * Register trigger
   */
  register(trigger: Omit<Trigger, 'id' | 'createdAt'>): Trigger {
    const newTrigger: Trigger = {
      ...trigger,
      id: `trigger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    this.triggers.push(newTrigger);
    return newTrigger;
  },

  /**
   * Fire trigger for event
   */
  async fire(event: TriggerEvent, data: any): Promise<void> {
    const relevantTriggers = this.triggers.filter(t => 
      t.enabled && t.event === event && (!t.condition || t.condition(data))
    );

    for (const trigger of relevantTriggers) {
      try {
        await trigger.action(data);
      } catch (error) {
        console.error(`Error executing trigger ${trigger.id}:`, error);
      }
    }
  },

  /**
   * Get all triggers
   */
  getTriggers(): Trigger[] {
    return [...this.triggers];
  },

  /**
   * Remove trigger
   */
  removeTrigger(id: string): void {
    this.triggers = this.triggers.filter(t => t.id !== id);
  },
};

