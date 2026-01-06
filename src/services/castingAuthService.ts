import { UserRole, UserRoleType } from '../core/models/casting';
import { castingService } from './castingService';

/**
 * Casting Auth Service
 * Handles role-based access control for casting projects
 */
export const castingAuthService = {
  /**
   * Get current user (placeholder - in real app would get from auth system)
   */
  getCurrentUserId(): string {
    // Placeholder - in real implementation would get from auth context
    return localStorage.getItem('currentUserId') || 'default-user';
  },

  /**
   * Get user role for a project
   */
  async getUserRole(projectId: string, userId?: string): Promise<UserRole | null> {
    const targetUserId = userId || this.getCurrentUserId();
    const userRoles = await castingService.getUserRoles(projectId);
    return userRoles.find(ur => ur.userId === targetUserId) || null;
  },

  /**
   * Check if user has permission
   */
  async hasPermission(
    projectId: string,
    permission: keyof UserRole['permissions'],
    userId?: string
  ): Promise<boolean> {
    const userRole = await this.getUserRole(projectId, userId);
    if (!userRole) return false;
    
    // Director and producer have all permissions
    if (userRole.role === 'director' || userRole.role === 'producer') {
      return true;
    }
    
    return userRole.permissions[permission] === true;
  },

  /**
   * Check if user can view all data
   */
  async canViewAll(projectId: string, userId?: string): Promise<boolean> {
    return await this.hasPermission(projectId, 'canViewAll', userId);
  },

  /**
   * Check if user can edit casting
   */
  async canEditCasting(projectId: string, userId?: string): Promise<boolean> {
    const userRole = await this.getUserRole(projectId, userId);
    if (!userRole) return false;
    
    // Director, producer, and casting director can edit casting
    return ['director', 'producer', 'casting_director'].includes(userRole.role) ||
           await this.hasPermission(projectId, 'canEditCasting', userId);
  },

  /**
   * Check if user can edit production
   */
  async canEditProduction(projectId: string, userId?: string): Promise<boolean> {
    const userRole = await this.getUserRole(projectId, userId);
    if (!userRole) return false;
    
    // Director, producer, and production manager can edit production
    return ['director', 'producer', 'production_manager'].includes(userRole.role) ||
           await this.hasPermission(projectId, 'canEditProduction', userId);
  },

  /**
   * Check if user can edit shot lists
   */
  async canEditShotLists(projectId: string, userId?: string): Promise<boolean> {
    const userRole = await this.getUserRole(projectId, userId);
    if (!userRole) return false;
    
    // Director, producer, and camera team can edit shot lists
    return ['director', 'producer', 'camera_team'].includes(userRole.role) ||
           await this.hasPermission(projectId, 'canEditShotLists', userId);
  },

  /**
   * Check if user can manage crew
   */
  async canManageCrew(projectId: string, userId?: string): Promise<boolean> {
    const userRole = await this.getUserRole(projectId, userId);
    if (!userRole) return false;
    
    // Director, producer, and production manager can manage crew
    return ['director', 'producer', 'production_manager'].includes(userRole.role) ||
           await this.hasPermission(projectId, 'canManageCrew', userId);
  },

  /**
   * Check if user can manage locations
   */
  async canManageLocations(projectId: string, userId?: string): Promise<boolean> {
    const userRole = await this.getUserRole(projectId, userId);
    if (!userRole) return false;
    
    // Director, producer, and production manager can manage locations
    return ['director', 'producer', 'production_manager'].includes(userRole.role) ||
           await this.hasPermission(projectId, 'canManageLocations', userId);
  },

  /**
   * Check if user can approve
   */
  async canApprove(projectId: string, userId?: string): Promise<boolean> {
    const userRole = await this.getUserRole(projectId, userId);
    if (!userRole) return false;
    
    // Only director and producer can approve
    return ['director', 'producer'].includes(userRole.role) ||
           await this.hasPermission(projectId, 'canApprove', userId);
  },

  /**
   * Get default permissions for a role type
   */
  getDefaultPermissions(role: UserRoleType): UserRole['permissions'] {
    switch (role) {
      case 'director':
      case 'producer':
        return {
          canViewAll: true,
          canEditCasting: true,
          canEditProduction: true,
          canEditShotLists: true,
          canManageCrew: true,
          canManageLocations: true,
          canApprove: true,
        };
      case 'casting_director':
        return {
          canViewAll: true,
          canEditCasting: true,
          canEditProduction: false,
          canEditShotLists: false,
          canManageCrew: false,
          canManageLocations: false,
          canApprove: false,
        };
      case 'production_manager':
        return {
          canViewAll: true,
          canEditCasting: false,
          canEditProduction: true,
          canEditShotLists: false,
          canManageCrew: true,
          canManageLocations: true,
          canApprove: false,
        };
      case 'camera_team':
        return {
          canViewAll: false,
          canEditCasting: false,
          canEditProduction: false,
          canEditShotLists: true,
          canManageCrew: false,
          canManageLocations: false,
          canApprove: false,
        };
      case 'agency':
        return {
          canViewAll: false,
          canEditCasting: false,
          canEditProduction: false,
          canEditShotLists: false,
          canManageCrew: false,
          canManageLocations: false,
          canApprove: false,
        };
      default:
        return {
          canViewAll: false,
          canEditCasting: false,
          canEditProduction: false,
          canEditShotLists: false,
          canManageCrew: false,
          canManageLocations: false,
          canApprove: false,
        };
    }
  },
};





