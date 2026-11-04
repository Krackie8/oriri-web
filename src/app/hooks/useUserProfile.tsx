import { useAuth } from './useAuth';
import { useMemo } from 'react';

interface UserProfile {
  displayName: string;
  initials: string;
  email: string | undefined;
  isVip: boolean;
  isAdmin: boolean;
  avatarUrl: string | undefined;
  joinedDate: Date | undefined;
}

export function useUserProfile(): UserProfile | null {
  const { user, isLoggedIn } = useAuth();

  return useMemo(() => {
    if (!isLoggedIn || !user) return null;

    // Get display name
    const getDisplayName = () => {
      if (user.user_metadata?.name) return user.user_metadata.name;
      if (user.user_metadata?.full_name) return user.user_metadata.full_name;
      
      if (user.email) {
        const emailName = user.email.split('@')[0];
        return emailName.charAt(0).toUpperCase() + emailName.slice(1);
      }
      
      return 'User';
    };

    // Get initials
    const getInitials = (name: string) => {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    // Check VIP status
    const getVipStatus = () => {
      // Admin users are always VIP
      if (user.email === 'admin@oriri.com') return true;
      
      // Check VIP status from user metadata
      return user.user_metadata?.isVip || 
             user.user_metadata?.vip_status || 
             user.user_metadata?.subscription_tier === 'vip' || 
             false;
    };

    // Check admin status
    const getAdminStatus = () => {
      return user.email === 'admin@oriri.com';
    };

    const displayName = getDisplayName();
    
    return {
      displayName,
      initials: getInitials(displayName),
      email: user.email,
      isVip: getVipStatus(),
      isAdmin: getAdminStatus(),
      avatarUrl: user.user_metadata?.avatar_url,
      joinedDate: user.created_at ? new Date(user.created_at) : undefined,
    };
  }, [user, isLoggedIn]);
}