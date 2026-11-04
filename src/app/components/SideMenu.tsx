import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { 
  SettingsIcon,
  HelpCircleIcon,
  InfoIcon,
  LogOutIcon,
  ShoppingBagIcon,
  UserIcon,
  BellIcon,
  DownloadIcon,
  ShareIcon,
  LinkIcon,
  Shield,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAdmin } from '../hooks/useAdmin';
import { useSocialConfig } from '../hooks/useSocialConfig';
import { SocialIconRow } from './social/SocialIconRow';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  onLogout: () => void;
  onLoginClick: () => void;
}

export default function SideMenu({
  isOpen,
  onClose,
  isLoggedIn,
  onLogout,
  onLoginClick
}: SideMenuProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { profiles: socialProfiles } = useSocialConfig();
  
  const handleNavigation = (path?: string, action?: () => void) => {
    if (path) {
      navigate(path);
    }
    if (action) {
      action();
    }
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-80 bg-background/95 backdrop-blur-sm border-border/50">
        <SheetHeader>
          <SheetTitle className="text-left">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-primary-foreground rounded-full"></div>
              </div>
              <span className="text-lg tracking-wide">Oriri</span>
            </div>
          </SheetTitle>
          <SheetDescription className="sr-only">
            Navigation menu with links to store, settings, and other app features
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-2 mt-6">
          {/* User Section */}
          {isLoggedIn ? (
            <div className="mb-4">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12"
                onClick={() => handleNavigation('/profile')}
              >
                <UserIcon className="w-5 h-5" />
                <div className="flex flex-col items-start">
                  <span>My Profile</span>
                  {user?.email && (
                    <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                      {user.email}
                    </span>
                  )}
                </div>
              </Button>
            </div>
          ) : (
            <div className="mb-4">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12"
                onClick={() => handleNavigation(undefined, onLoginClick)}
              >
                <UserIcon className="w-5 h-5" />
                <span>Sign In</span>
              </Button>
            </div>
          )}

          {/* Admin Dashboard Section - Only for admin users */}
          {isAdmin && isLoggedIn && (
            <>
              <Separator className="my-2" />
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2 px-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Admin Dashboard
                  </p>
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-10 bg-primary/5 hover:bg-primary/10 border border-primary/20"
                  onClick={() => handleNavigation('/admin/dashboard')}
                >
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <span className="text-primary font-medium">Admin Dashboard</span>
                </Button>
              </div>
            </>
          )}

          {/* Also show for admin@oriri.com email regardless of admin loading state */}
          {user?.email === 'admin@oriri.com' && !isAdmin && (
            <>
              <Separator className="my-2" />
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2 px-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Admin Dashboard
                  </p>
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                    <Shield className="w-3 h-3 mr-1" />
                    Creator
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-10 bg-primary/5 hover:bg-primary/10 border border-primary/20"
                  onClick={() => handleNavigation('/admin/dashboard')}
                >
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <span className="text-primary font-medium">Admin Dashboard</span>
                </Button>
              </div>
            </>
          )}

          <Separator className="my-2" />

          {/* Store & Shopping */}
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-3">
              Store
            </p>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-10"
              onClick={() => handleNavigation('/store')}
            >
              <ShoppingBagIcon className="w-5 h-5" />
              <span>Merchandise Store</span>
            </Button>
          </div>

          <Separator className="my-2" />

          {/* App Features */}
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-3">
              Features
            </p>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-10"
              onClick={() => handleNavigation('/settings')}
            >
              <SettingsIcon className="w-5 h-5" />
              <span>Settings</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-10"
              onClick={() => {
                // Notification settings would go here
                onClose();
              }}
            >
              <BellIcon className="w-5 h-5" />
              <span>Notifications</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-10"
              onClick={() => {
                // Download/offline content
                onClose();
              }}
            >
              <DownloadIcon className="w-5 h-5" />
              <span>Downloads</span>
            </Button>
          </div>

          <Separator className="my-2" />

          {/* Follow Oriri */}
          {socialProfiles.length > 0 && (
            <>
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-3">
                  Follow Oriri
                </p>
                <div className="px-3">
                  <SocialIconRow profiles={socialProfiles} source="side-menu" size="md" tone="brand" />
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-10 mt-2"
                  onClick={() => handleNavigation('/links')}
                >
                  <LinkIcon className="w-5 h-5" />
                  <span>All our links</span>
                </Button>
              </div>

              <Separator className="my-2" />
            </>
          )}

          {/* Support */}
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-3">
              Support
            </p>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-10"
              onClick={() => {
                // Help center
                onClose();
              }}
            >
              <HelpCircleIcon className="w-5 h-5" />
              <span>Help Center</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-10"
              onClick={() => {
                // Share app
                onClose();
              }}
            >
              <ShareIcon className="w-5 h-5" />
              <span>Share Oriri</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-10"
              onClick={() => {
                // About page
                onClose();
              }}
            >
              <InfoIcon className="w-5 h-5" />
              <span>About</span>
            </Button>
          </div>

          {/* Logout */}
          {isLoggedIn && (
            <>
              <Separator className="my-2" />
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleNavigation(undefined, onLogout)}
              >
                <LogOutIcon className="w-5 h-5" />
                <span>Sign Out</span>
              </Button>
            </>
          )}
        </div>

        {/* App Version */}
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-xs text-muted-foreground text-center">
            Oriri v1.0.0 • Built with ❤️ for urban planners
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}