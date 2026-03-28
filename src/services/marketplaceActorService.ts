import authSessionService from './authSessionService';
import { getCurrentUserId } from './settingsService';

export interface MarketplaceActor {
  userId: string;
  name: string;
  role: string;
  isAdmin: boolean;
}

const ADMIN_ROLES = new Set(['admin', 'owner']);

export function isMarketplaceAdminRole(role: string | null | undefined): boolean {
  return ADMIN_ROLES.has(String(role || '').trim().toLowerCase());
}

export function getMarketplaceActor(): MarketplaceActor {
  const session = authSessionService.getSessionSync();
  const adminUser = session.adminUser;
  const userId = String(
    adminUser?.id ?? session.currentUserId ?? getCurrentUserId() ?? 'default-user',
  ).trim() || 'default-user';
  const role = String(adminUser?.role || session.selectedProfession || 'viewer').trim() || 'viewer';
  const name = String(
    adminUser?.display_name || adminUser?.email || userId,
  ).trim() || userId;

  return {
    userId,
    name,
    role,
    isAdmin: isMarketplaceAdminRole(role),
  };
}
