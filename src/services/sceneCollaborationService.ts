import { SceneComposition, SceneComment, ScenePermissions } from '../core/models/sceneComposer';

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
    try {
      const stored = localStorage.getItem('virtualStudio_sceneComments');
      const allComments: SceneComment[] = stored ? JSON.parse(stored) : [];
      return allComments.filter(c => 
        c.sceneId === sceneId && (!elementId || c.elementId === elementId)
      );
    } catch {
      return [];
    }
  },

  /**
   * Save comment
   */
  saveComment(comment: SceneComment): void {
    try {
      const stored = localStorage.getItem('virtualStudio_sceneComments');
      const allComments: SceneComment[] = stored ? JSON.parse(stored) : [];
      allComments.push(comment);
      localStorage.setItem('virtualStudio_sceneComments', JSON.stringify(allComments));
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
    try {
      const stored = localStorage.getItem('virtualStudio_sceneReviews');
      const allReviews: SceneReview[] = stored ? JSON.parse(stored) : [];
      return allReviews.filter(r => r.sceneId === sceneId);
    } catch {
      return [];
    }
  },

  /**
   * Save review
   */
  saveReview(review: SceneReview): void {
    try {
      const stored = localStorage.getItem('virtualStudio_sceneReviews');
      const allReviews: SceneReview[] = stored ? JSON.parse(stored) : [];
      const existingIndex = allReviews.findIndex(r => r.id === review.id);
      
      if (existingIndex >= 0) {
        allReviews[existingIndex] = { ...review, updatedAt: new Date().toISOString() };
      } else {
        allReviews.push(review);
      }
      
      localStorage.setItem('virtualStudio_sceneReviews', JSON.stringify(allReviews));
    } catch (error) {
      console.error('Error saving review:', error);
    }
  },

  /**
   * Set scene permissions
   */
  setPermissions(sceneId: string, permissions: ScenePermissions): void {
    try {
      const stored = localStorage.getItem('virtualStudio_scenePermissions');
      const allPermissions: Record<string, ScenePermissions> = stored ? JSON.parse(stored) : {};
      allPermissions[sceneId] = permissions;
      localStorage.setItem('virtualStudio_scenePermissions', JSON.stringify(allPermissions));
    } catch (error) {
      console.error('Error saving permissions:', error);
    }
  },

  /**
   * Get scene permissions
   */
  getPermissions(sceneId: string): ScenePermissions | null {
    try {
      const stored = localStorage.getItem('virtualStudio_scenePermissions');
      const allPermissions: Record<string, ScenePermissions> = stored ? JSON.parse(stored) : {};
      return allPermissions[sceneId] || null;
    } catch {
      return null;
    }
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
      const stored = localStorage.getItem('virtualStudio_activityLog');
      const log: ActivityLogEntry[] = stored ? JSON.parse(stored) : [];
      log.push(entry);
      
      // Keep only last 1000 entries
      if (log.length > 1000) {
        log.shift();
      }
      
      localStorage.setItem('virtualStudio_activityLog', JSON.stringify(log));
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  },

  /**
   * Get activity log for scene
   */
  getActivityLog(sceneId: string, limit: number = 50): ActivityLogEntry[] {
    try {
      const stored = localStorage.getItem('virtualStudio_activityLog');
      const log: ActivityLogEntry[] = stored ? JSON.parse(stored) : [];
      return log
        .filter(entry => entry.sceneId === sceneId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch {
      return [];
    }
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
    try {
      const stored = localStorage.getItem('virtualStudio_notifications');
      const allNotifications: Notification[] = stored ? JSON.parse(stored) : [];
      return allNotifications
        .filter(n => n.userId === userId && (!unreadOnly || !n.read))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return [];
    }
  },

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    try {
      const stored = localStorage.getItem('virtualStudio_notifications');
      const allNotifications: Notification[] = stored ? JSON.parse(stored) : [];
      const notification = allNotifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        localStorage.setItem('virtualStudio_notifications', JSON.stringify(allNotifications));
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
      const stored = localStorage.getItem('virtualStudio_notifications');
      const allNotifications: Notification[] = stored ? JSON.parse(stored) : [];
      allNotifications.push(notification);
      
      // Keep only last 500 notifications
      if (allNotifications.length > 500) {
        allNotifications.shift();
      }
      
      localStorage.setItem('virtualStudio_notifications', JSON.stringify(allNotifications));
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  },
};

