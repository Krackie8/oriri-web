import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Search, Bell, User, ShoppingCart, Menu, UserCircle, Settings, LogOut } from 'lucide-react';
import NotificationPanel from './NotificationPanel';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';

interface HeaderProps {
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onLogout: () => void;
  onSearchClick: () => void;
  cartItemCount?: number;
  onCartClick?: () => void;
  onMenuClick?: () => void;
}

export default function Header({ isLoggedIn, onLoginClick, onLogout, onSearchClick, cartItemCount = 0, onCartClick, onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const userProfile = useUserProfile();

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  // Get user display name for avatar
  const getUserDisplayName = () => {
    if (!isLoggedIn || !user) return '';
    
    if (user.user_metadata?.name) return user.user_metadata.name;
    if (user.user_metadata?.full_name) return user.user_metadata.full_name;
    
    if (user.email) {
      const emailName = user.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    
    return 'User';
  };

  const userDisplayName = getUserDisplayName();

  return (
    <header className="fixed top-0 left-0 right-0 h-[60px] bg-background/80 backdrop-blur-sm border-b border-border z-40">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left Side - Menu & Logo */}
        <div className="flex items-center gap-2">
          {/* Hamburger Menu - Desktop/Larger screens */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="hidden md:flex w-8 h-8 p-0"
            onClick={onMenuClick}
          >
            <Menu className="h-4 w-4" />
          </Button>

          {/* Logo - Clickable to Home */}
          <button className="flex items-center space-x-2" onClick={handleLogoClick}>
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-primary-foreground rounded-full"></div>
            </div>
            <span className="text-lg tracking-wide hidden sm:block">Oriri</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSearchClick}
            className="w-full justify-start text-muted-foreground hover:bg-accent/50"
          >
            <Search className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Search episodes, guests...</span>
            <span className="sm:hidden">Search...</span>
          </Button>
        </div>

        {/* Right Side - Cart, Notifications & Avatar */}
        <div className="flex items-center space-x-3">
          {/* Shopping Cart */}
          {cartItemCount > 0 && (
            <div className="relative">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onCartClick}>
                <ShoppingCart className="h-4 w-4" />
              </Button>
              <Badge 
                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground"
              >
                {cartItemCount}
              </Badge>
            </div>
          )}

          {/* Notifications */}
          {isLoggedIn && (
            <NotificationPanel
              trigger={
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Bell className="h-4 w-4" />
                </Button>
              }
            />
          )}

          {/* User Avatar/Login */}
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full hover:ring-2 hover:ring-primary/50 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userProfile?.avatarUrl} />
                    <AvatarFallback>
                      {userProfile?.initials || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                side="bottom"
                sideOffset={4}
                alignOffset={0}
                avoidCollisions={true}
                collisionPadding={8}
                className="w-36 bg-background/95 backdrop-blur-sm border border-border/50"
                style={{
                  maxWidth: 'calc(100vw - 2rem)',
                  marginRight: '1rem'
                }}
              >
                <DropdownMenuItem 
                  className="cursor-pointer hover:bg-accent/50" 
                  onClick={handleProfileClick}
                >
                  <UserCircle className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={handleSettingsClick}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem 
                  className="cursor-pointer hover:bg-accent/50 text-destructive focus:text-destructive" 
                  onClick={onLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoginClick}
              className="h-8 w-8 p-0"
              data-login-trigger="true"
            >
              <User className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}