import { settingsService } from './settingsService';

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  enabled: boolean;
  createdAt: string;
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
}

const SETTINGS_NAMESPACE = 'virtualStudio_webhooks';

export const webhookService = {
  /**
   * Register webhook
   */
  async register(webhook: Omit<Webhook, 'id' | 'createdAt'>): Promise<Webhook> {
    const newWebhook: Webhook = {
      ...webhook,
      id: `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    await this.saveWebhook(newWebhook);
    return newWebhook;
  },

  /**
   * Trigger webhook
   */
  async trigger(event: string, data: any): Promise<void> {
    const webhooks = await this.getWebhooks();
    const relevantWebhooks = webhooks.filter(w => 
      w.enabled && (w.events.includes(event) || w.events.includes('*'))
    );

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    // Trigger all relevant webhooks
    for (const webhook of relevantWebhooks) {
      try {
        await this.sendWebhook(webhook, payload);
      } catch (error) {
        console.error(`Error triggering webhook ${webhook.id}:`, error);
      }
    }
  },

  /**
   * Send webhook request
   */
  async sendWebhook(webhook: Webhook, payload: WebhookPayload): Promise<void> {
    // In production, this would make an HTTP POST request
    // For now, just log it
    console.log(`Webhook ${webhook.id} triggered:`, payload);
    
    // Example implementation:
    // const response = await fetch(webhook.url, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'X-Webhook-Signature': this.signPayload(payload, webhook.secret),
    //   },
    //   body: JSON.stringify(payload),
    // });
    // if (!response.ok) throw new Error(`Webhook failed: ${response.statusText}`);
  },

  /**
   * Get all webhooks
   */
  async getWebhooks(): Promise<Webhook[]> {
    try {
      const stored = await settingsService.getSetting<Webhook[]>(SETTINGS_NAMESPACE);
      if (stored) return stored;
    } catch (error) {
      console.warn('Failed to fetch webhooks from settings API:', error);
    }

    return [];
  },

  /**
   * Save webhook
   */
  async saveWebhook(webhook: Webhook): Promise<void> {
    try {
      const webhooks = await this.getWebhooks();
      const existingIndex = webhooks.findIndex(w => w.id === webhook.id);
      
      if (existingIndex >= 0) {
        webhooks[existingIndex] = webhook;
      } else {
        webhooks.push(webhook);
      }

      await settingsService.setSetting(SETTINGS_NAMESPACE, webhooks);
    } catch (error) {
      console.error('Error saving webhook:', error);
    }
  },
};

