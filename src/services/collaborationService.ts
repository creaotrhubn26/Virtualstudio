/**
 * Real-Time Collaboration Service
 * WebSocket-based multi-user editing with presence awareness and conflict resolution
 */

import { create } from 'zustand';

// Types
export interface CollaboratorPresence {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  cursor?: { x: number; y: number; z: number };
  selectedObject?: string;
  lastActive: number;
  isTyping?: boolean;
}

// Alias exported for UI panels expecting a simple collaborator type
export type Collaborator = CollaboratorPresence;

export interface CollaborationMessage {
  type: 'presence' | 'object_update' | 'object_create' | 'object_delete' | 'camera_sync' | 'chat' | 'annotation' | 'lock' | 'unlock';
  payload: any;
  userId: string;
  timestamp: number;
  version?: number;
}

export interface ObjectLock {
  objectId: string;
  userId: string;
  userName: string;
  lockedAt: number;
  expiresAt: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
  type: 'text' | 'annotation' | 'system';
}

export interface CollaborationState {
  // Connection
  isConnected: boolean;
  roomId: string | null;
  userId: string;
  userName: string;
  userColor: string;
  
  // Presence
  collaborators: Map<string, CollaboratorPresence>;
  
  // Locks
  objectLocks: Map<string, ObjectLock>;
  
  // Chat
  chatMessages: ChatMessage[];
  unreadCount: number;
  
  // Sync state
  lastSyncVersion: number;
  pendingOperations: CollaborationMessage[];
  
  // Actions
  connect: (roomId: string, userName: string) => Promise<void>;
  disconnect: () => void;
  updatePresence: (cursor?: { x: number; y: number; z: number }, selectedObject?: string) => void;
  broadcastObjectUpdate: (objectId: string, changes: any) => void;
  broadcastObjectCreate: (objectData: any) => void;
  broadcastObjectDelete: (objectId: string) => void;
  broadcastCameraSync: (cameraData: any) => void;
  requestLock: (objectId: string) => Promise<boolean>;
  releaseLock: (objectId: string) => void;
  sendChatMessage: (message: string, type?: 'text' | 'annotation') => void;
  markChatRead: () => void;
}

// Generate random color for user
const generateUserColor = (): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Generate user ID
const generateUserId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

class CollaborationWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private messageHandlers: ((message: CollaborationMessage) => void)[] = [];
  private connectionHandlers: ((connected: boolean) => void)[] = [];
  
  connect(roomId: string, userId: string, userName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/collaboration/ws/${roomId}?userId=${userId}&userName=${encodeURIComponent(userName)}`;
      
      try {
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('[Collaboration] WebSocket connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.connectionHandlers.forEach(h => h(true));
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message: CollaborationMessage = JSON.parse(event.data);
            this.messageHandlers.forEach(h => h(message));
          } catch (e) {
            console.error('[Collaboration] Failed to parse message:', e);
          }
        };
        
        this.ws.onclose = () => {
          console.log('[Collaboration] WebSocket closed');
          this.stopHeartbeat();
          this.connectionHandlers.forEach(h => h(false));
          this.attemptReconnect(roomId, userId, userName);
        };
        
        this.ws.onerror = (error) => {
          console.error('[Collaboration] WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }
  
  private attemptReconnect(roomId: string, userId: string, userName: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[Collaboration] Reconnecting... attempt ${this.reconnectAttempts}`);
      setTimeout(() => {
        this.connect(roomId, userId, userName).catch(() => {});
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }
  
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'heartbeat' });
    }, 30000);
  }
  
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
  
  onMessage(handler: (message: CollaborationMessage) => void) {
    this.messageHandlers.push(handler);
  }
  
  onConnectionChange(handler: (connected: boolean) => void) {
    this.connectionHandlers.push(handler);
  }
  
  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Singleton WebSocket instance
let wsInstance: CollaborationWebSocket | null = null;

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  // Initial state
  isConnected: false,
  roomId: null,
  userId: generateUserId(),
  userName: 'Anonymous',
  userColor: generateUserColor(),
  collaborators: new Map(),
  objectLocks: new Map(),
  chatMessages: [],
  unreadCount: 0,
  lastSyncVersion: 0,
  pendingOperations: [],
  
  connect: async (roomId: string, userName: string) => {
    const { userId, userColor } = get();
    
    wsInstance = new CollaborationWebSocket();
    
    wsInstance.onConnectionChange((connected) => {
      set({ isConnected: connected });
    });
    
    wsInstance.onMessage((message) => {
      const state = get();
      
      switch (message.type) {
        case 'presence':
          const newCollaborators = new Map(state.collaborators);
          if (message.payload.action === 'join') {
            newCollaborators.set(message.userId, {
              id: message.userId,
              name: message.payload.userName,
              color: message.payload.color || generateUserColor(),
              lastActive: message.timestamp
            });
            // System message for join
            set({
              chatMessages: [...state.chatMessages, {
                id: `sys_${Date.now()}`,
                userId: 'system',
                userName: 'System',
                message: `${message.payload.userName} joined the session`,
                timestamp: message.timestamp,
                type: 'system'
              }]
            });
          } else if (message.payload.action === 'leave') {
            const leaving = newCollaborators.get(message.userId);
            newCollaborators.delete(message.userId);
            if (leaving) {
              set({
                chatMessages: [...state.chatMessages, {
                  id: `sys_${Date.now()}`,
                  userId: 'system',
                  userName: 'System',
                  message: `${leaving.name} left the session`,
                  timestamp: message.timestamp,
                  type: 'system'
                }]
              });
            }
          } else if (message.payload.action === 'update') {
            const existing = newCollaborators.get(message.userId);
            if (existing) {
              newCollaborators.set(message.userId, {
                ...existing,
                cursor: message.payload.cursor,
                selectedObject: message.payload.selectedObject,
                lastActive: message.timestamp
              });
            }
          }
          set({ collaborators: newCollaborators });
          break;
          
        case 'object_update':
          // Emit event for scene to handle
          window.dispatchEvent(new CustomEvent('collaboration:object_update', {
            detail: { objectId: message.payload.objectId, changes: message.payload.changes, userId: message.userId }
          }));
          break;
          
        case 'object_create':
          window.dispatchEvent(new CustomEvent('collaboration:object_create', {
            detail: { objectData: message.payload.objectData, userId: message.userId }
          }));
          break;
          
        case 'object_delete':
          window.dispatchEvent(new CustomEvent('collaboration:object_delete', {
            detail: { objectId: message.payload.objectId, userId: message.userId }
          }));
          break;
          
        case 'camera_sync':
          window.dispatchEvent(new CustomEvent('collaboration:camera_sync', {
            detail: { cameraData: message.payload, userId: message.userId }
          }));
          break;
          
        case 'lock':
          const newLocks = new Map(state.objectLocks);
          newLocks.set(message.payload.objectId, {
            objectId: message.payload.objectId,
            userId: message.userId,
            userName: message.payload.userName,
            lockedAt: message.timestamp,
            expiresAt: message.timestamp + 60000 // 1 minute lock
          });
          set({ objectLocks: newLocks });
          break;
          
        case 'unlock':
          const unlockedLocks = new Map(state.objectLocks);
          unlockedLocks.delete(message.payload.objectId);
          set({ objectLocks: unlockedLocks });
          break;
          
        case 'chat':
          set({
            chatMessages: [...state.chatMessages, {
              id: `chat_${Date.now()}`,
              userId: message.userId,
              userName: message.payload.userName,
              message: message.payload.message,
              timestamp: message.timestamp,
              type: message.payload.type || 'text'
            }],
            unreadCount: state.unreadCount + 1
          });
          break;
      }
    });
    
    await wsInstance.connect(roomId, userId, userName);
    
    set({ roomId, userName });
    
    // Send join presence
    wsInstance.send({
      type: 'presence',
      payload: { action: 'join', userName, color: userColor },
      userId,
      timestamp: Date.now()
    });
  },
  
  disconnect: () => {
    const { userId, userName } = get();
    
    if (wsInstance) {
      wsInstance.send({
        type: 'presence',
        payload: { action: 'leave', userName },
        userId,
        timestamp: Date.now()
      });
      wsInstance.disconnect();
      wsInstance = null;
    }
    
    set({
      isConnected: false,
      roomId: null,
      collaborators: new Map(),
      objectLocks: new Map()
    });
  },
  
  updatePresence: (cursor, selectedObject) => {
    const { userId, userName } = get();
    
    if (wsInstance) {
      wsInstance.send({
        type: 'presence',
        payload: { action: 'update', userName, cursor, selectedObject },
        userId,
        timestamp: Date.now()
      });
    }
  },
  
  broadcastObjectUpdate: (objectId: string, changes: any) => {
    const { userId } = get();
    
    if (wsInstance) {
      wsInstance.send({
        type: 'object_update',
        payload: { objectId, changes },
        userId,
        timestamp: Date.now()
      });
    }
  },
  
  broadcastObjectCreate: (objectData: any) => {
    const { userId } = get();
    
    if (wsInstance) {
      wsInstance.send({
        type: 'object_create',
        payload: { objectData },
        userId,
        timestamp: Date.now()
      });
    }
  },
  
  broadcastObjectDelete: (objectId: string) => {
    const { userId } = get();
    
    if (wsInstance) {
      wsInstance.send({
        type: 'object_delete',
        payload: { objectId },
        userId,
        timestamp: Date.now()
      });
    }
  },
  
  broadcastCameraSync: (cameraData: any) => {
    const { userId } = get();
    
    if (wsInstance) {
      wsInstance.send({
        type: 'camera_sync',
        payload: cameraData,
        userId,
        timestamp: Date.now()
      });
    }
  },
  
  requestLock: async (objectId: string): Promise<boolean> => {
    const { userId, userName, objectLocks } = get();
    
    // Check if already locked by someone else
    const existingLock = objectLocks.get(objectId);
    if (existingLock && existingLock.userId !== userId && existingLock.expiresAt > Date.now()) {
      return false;
    }
    
    if (wsInstance) {
      wsInstance.send({
        type: 'lock',
        payload: { objectId, userName },
        userId,
        timestamp: Date.now()
      });
      
      // Optimistically set lock
      const newLocks = new Map(objectLocks);
      newLocks.set(objectId, {
        objectId,
        userId,
        userName,
        lockedAt: Date.now(),
        expiresAt: Date.now() + 60000
      });
      set({ objectLocks: newLocks });
      
      return true;
    }
    
    return false;
  },
  
  releaseLock: (objectId: string) => {
    const { userId, objectLocks } = get();
    
    if (wsInstance) {
      wsInstance.send({
        type: 'unlock',
        payload: { objectId },
        userId,
        timestamp: Date.now()
      });
      
      const newLocks = new Map(objectLocks);
      newLocks.delete(objectId);
      set({ objectLocks: newLocks });
    }
  },
  
  sendChatMessage: (message: string, type: 'text' | 'annotation' = 'text') => {
    const { userId, userName } = get();
    
    if (wsInstance && message.trim()) {
      wsInstance.send({
        type: 'chat',
        payload: { message: message.trim(), userName, type },
        userId,
        timestamp: Date.now()
      });
    }
  },
  
  markChatRead: () => {
    set({ unreadCount: 0 });
  }
}));

export default useCollaborationStore;
