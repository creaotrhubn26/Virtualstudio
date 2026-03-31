export interface WorkerMessage<T = unknown> {
  id: string;
  type: string;
  payload: T;
  error?: string;
}

export interface WorkerTask<TInput = unknown, TOutput = unknown> {
  id: string;
  type: string;
  input: TInput;
  resolve: (result: TOutput) => void;
  reject: (error: Error) => void;
}

type WorkerHandler<TInput = unknown, TOutput = unknown> = (payload: TInput) => Promise<TOutput> | TOutput;

class WebWorkerEngine {
  private handlers: Map<string, WorkerHandler> = new Map();
  private pendingTasks: Map<string, WorkerTask> = new Map();
  private isWorkerContext: boolean;

  constructor() {
    this.isWorkerContext = typeof self !== 'undefined' && typeof window === 'undefined';

    if (this.isWorkerContext) {
      self.addEventListener('message', this.handleWorkerMessage.bind(this));
    }
  }

  register<TInput, TOutput>(type: string, handler: WorkerHandler<TInput, TOutput>): void {
    this.handlers.set(type, handler as WorkerHandler);
  }

  async dispatch<TInput = unknown, TOutput = unknown>(type: string, payload: TInput): Promise<TOutput> {
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    if (this.isWorkerContext) {
      const message: WorkerMessage<TInput> = { id, type, payload };
      self.postMessage(message);
      return new Promise<TOutput>((resolve, reject) => {
        this.pendingTasks.set(id, { id, type, input: payload, resolve: resolve as (r: unknown) => void, reject });
      });
    }

    const handler = this.handlers.get(type);
    if (!handler) throw new Error(`No handler registered for type: ${type}`);
    return handler(payload) as Promise<TOutput>;
  }

  private async handleWorkerMessage(event: MessageEvent<WorkerMessage>): Promise<void> {
    const { id, type, payload } = event.data;
    const handler = this.handlers.get(type);

    if (!handler) {
      const response: WorkerMessage = { id, type: `${type}:response`, payload: null, error: `No handler for: ${type}` };
      self.postMessage(response);
      return;
    }

    try {
      const result = await handler(payload);
      const response: WorkerMessage = { id, type: `${type}:response`, payload: result };
      self.postMessage(response);
    } catch (err) {
      const response: WorkerMessage = { id, type: `${type}:response`, payload: null, error: String(err) };
      self.postMessage(response);
    }
  }

  dispose(): void {
    this.handlers.clear();
    this.pendingTasks.clear();
  }
}

export const webWorkerEngine = new WebWorkerEngine();
export default webWorkerEngine;
