// This hook has been removed as part of version 24 cleanup
// RBAC functionality is no longer available

import { ReactNode } from 'react';

export function usePermissions() {
  return {
    loading: false,
    userRole: null,
    hasPermission: () => false,
    canAccessAdminDashboard: () => false,
    canAccessSection: () => false
  };
}

export function WithPermissions({ children }: { children: ReactNode; permission: string }) {
  return null;
}