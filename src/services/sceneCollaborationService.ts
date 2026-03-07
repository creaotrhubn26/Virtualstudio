import { SceneComposition, SceneComment, ScenePermissions } from '../core/models/sceneComposer';
import settingsService, { getCurrentUserId } from './settingsService';

const COMMENTS_KEY = 'virtualStudio_sceneComments';
const REVIEWS_KEY = 'virtualStudio_sceneReviews';
const PERMISSIONS_KEY = 'virtualStudio_scenePermissions';
const ACTIVITY_KEY = 'virtualStudio_activityLog';
const NOTIFICATIONS_KEY = 'virtualStudio_notifications';
let cachedComments: SceneComment[] = [];
let cachedReviews: SceneReview[] = [];
let cachedPermissions: Record<string, ScenePermissions> = {};
let cachedActivity: ActivityLogEntry[] = [];
let cachedNotifications: Notification[] = [];

const hydrateCollaborationFromDb = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  try {
    const userId = getCurrentUserId();
    const [comments, reviews, permissions, activity, notifications] = await Promise.all([
      settingsService.getSetting<SceneComment[]>(COMMENTS_KEY, { userId }),
      settingsService.getSetting<SceneReview[]>(REVIEWS_KEY, { userId }),
      settingsService.getSetting<Record<string, ScenePermissions>>(PERMISSIONS_KEY, { userId }),
      settingsService.getSetting<ActivityLogEntry[]>(ACTIVITY_KEY, { userId }),
      settingsService.getSetting<Notification[]>(NOTIFICATIONS_KEY, { userId }),
    ]);

    if (comments) cachedComments = comments;
    if (reviews) cachedReviews = reviews;
    if (permissions) cachedPermissions = permissions;
    if (activity) cachedActivity = activity;
    if (notifications) cachedNotifications = notifications;
  } catch {
    // Ignore hydration errors
  }
};

void hydrateCollaborationFromDb();

export interface SceneReview {
  id: string;
  sceneId: string;
  reviewerId: string;
  reviewerName: string;
  rating: number; // 1-5
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLogEntry {
  id: string;
  sceneId: string;
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'comment' | 'review' | 'share' | 'export' | 'import';
  details?: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'comment' | 'review' | 'share' | 'mention' | 'update';
  title: string;
  message: string;
  sceneId?: string;
  read: boolean;
  createdAt: string;
}

export const sceneCollaborationService = {
  /**
   * Add comment to scene or element
   */
  addComment(sceneId: string, comment: Omit<SceneComment, 'id' | 'createdAt'>): SceneComment {
    const newComment: SceneComment = {
      ...comment,
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    this.saveComment(newComment);
    this.logActivity(sceneId, comment.author || 'Unknown', 'comment', `Comment added: ${comment.text.substring(0, 50)}`);
    return newComment;
  },

  /**
   * Get comments for scene
   */
  getComments(sceneId: string, elementId?: string): SceneComment[] {
    return cachedComments.filter(c => 
      c.sceneId === sceneId && (!elementId || c.elementId === elementId)
    );
  },

  /**
   * Save comment
   */
  saveComment(comment: SceneComment): void {
    try {
      cachedComments.push(comment);
      void settingsService.setSetting(COMMENTS_KEY, cachedComments, { userId: getCurrentUserId() });
    } catch (error) {
      console.error('Error saving comment:', error);
    }
  },

  /**
   * Create review
   */
  createReview(sceneId: string, review: Omit<SceneReview, 'id' | 'createdAt' | 'updatedAt'>): SceneReview {
    const newReview: SceneReview = {
      ...review,
      id: `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.saveReview(newReview);
    this.logActivity(sceneId, review.reviewerId, 'review', `Review created: ${review.rating}/5`);
    return newReview;
  },

  /**
   * Get reviews for scene
   */
  getReviews(sceneId: string): SceneReview[] {
    return cachedReviews.filter(r => r.sceneId === sceneId);
  },

  /**
   * Save review
   */
  saveReview(review: SceneReview): void {
    try {
      const existingIndex = cachedReviews.findIndex(r => r.id === review.id);
      
      if (existingIndex >= 0) {
        cachedReviews[existingIndex] = { ...review, updatedAt: new Date().toISOString() };
      } else {
        cachedReviews.push(review);
      }
      
      void settingsService.setSetting(REVIEWS_KEY, cachedReviews, { userId: getCurrentUserId() });
    } catch (error) {
      console.error('Error saving review:', error);
    }
  },

  /**
   * Set scene permissions
   */
  setPermissions(sceneId: string, permissions: ScenePermissions): void {
    try {
      cachedPermissions[sceneId] = permissions;
      void settingsService.setSetting(PERMISSIONS_KEY, cachedPermissions, { userId: getCurrentUserId() });
    } catch (error) {
      console.error('Error saving permissions:', error);
    }
  },

  /**
   * Get scene permissions
   */
  getPermissions(sceneId: string): ScenePermissions | null {
    return cachedPermissions[sceneId] || null;
  },

  /**
   * Log activity
   */
  logActivity(sceneId: string, userId: string, action: ActivityLogEntry['action'], details?: string): void {
    const entry: ActivityLogEntry = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sceneId,
      userId,
      userName: userId, // Would be resolved from user service
      action,
      details,
      timestamp: new Date().toISOString(),
    };

    try {
      cachedActivity.push(entry);
      
      // Keep only last 1000 entries
      if (cachedActivity.length > 1000) {
        cachedActivity.shift();
      }
      
      void settingsService.setSetting(ACTIVITY_KEY, cachedActivity, { userId: getCurrentUserId() });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  },

  /**
   * Get activity log for scene
   */
  getActivityLog(sceneId: string, limit: number = 50): ActivityLogEntry[] {
    return cachedActivity
      .filter(entry => entry.sceneId === sceneId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  },

  /**
   * Create notification
   */
  createNotification(notification: Omit<Notification, 'id' | 'read' | 'createdAt'>): Notification {
    const newNotification: Notification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };

    this.saveNotification(newNotification);
    return newNotification;
  },

  /**
   * Get notifications for user
   */
  getNotifications(userId: string, unreadOnly: boolean = false): Notification[] {
    return cachedNotifications
      .filter(n => n.userId === userId && (!unreadOnly || !n.read))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    try {
      const notification = cachedNotifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        void settingsService.setSetting(NOTIFICATIONS_KEY, cachedNotifications, { userId: getCurrentUserId() });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  /**
   * Save notification
   */
  saveNotification(notification: Notification): void {
    try {
      cachedNotifications.push(notification);
      
      // Keep only last 500 notifications
      if (cachedNotifications.length > 500) {
        cachedNotifications.shift();
      }
      
      void settingsService.setSetting(NOTIFICATIONS_KEY, cachedNotifications, { userId: getCurrentUserId() });
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  },
};

