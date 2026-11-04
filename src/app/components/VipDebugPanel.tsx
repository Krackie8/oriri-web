import React from 'react';
import { useVipSubscription } from '../contexts/VipSubscriptionContext';
import { useAuth } from '../hooks/useAuth';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

export function VipDebugPanel() {
  const { user, isLoggedIn } = useAuth();
  const {
    currentSubscription,
    currentTier,
    isVipMember,
    isOnTrial,
    getRemainingTrialDays,
    isLoading,
    startFreeTrial
  } = useVipSubscription();

  // Check localStorage directly
  const localStorageData = localStorage.getItem('oriri-free-trial');
  let parsedLocalData = null;
  try {
    parsedLocalData = localStorageData ? JSON.parse(localStorageData) : null;
  } catch (e) {
    // ignore
  }

  // Debug function to clear localStorage
  const handleClearTrial = () => {
    localStorage.removeItem('oriri-free-trial');
    window.location.reload();
  };

  // Debug function to start trial
  const handleStartTrial = async () => {
    try {
      await startFreeTrial('vip');
    } catch (error) {
      console.error('Failed to start trial:', error);
    }
  };

  return (
    <Card className="p-4 m-4 bg-card/50 border-border/50">
      <h3 className="font-medium mb-3 text-lg">🔧 VIP Subscription Debug Panel</h3>
      
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <strong>User Logged In:</strong> 
            <Badge variant={isLoggedIn ? "default" : "destructive"} className="ml-2">
              {isLoggedIn ? "Yes" : "No"}
            </Badge>
          </div>
          <div>
            <strong>User Email:</strong> 
            <span className="ml-2 text-muted-foreground">{user?.email || 'N/A'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <strong>VIP Loading:</strong> 
            <Badge variant={isLoading ? "secondary" : "outline"} className="ml-2">
              {isLoading ? "Loading..." : "Ready"}
            </Badge>
          </div>
          <div>
            <strong>VIP Member:</strong> 
            <Badge variant={isVipMember ? "default" : "secondary"} className="ml-2">
              {isVipMember ? "Yes" : "No"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <strong>On Trial:</strong> 
            <Badge variant={isOnTrial ? "default" : "secondary"} className="ml-2">
              {isOnTrial ? `Yes (${getRemainingTrialDays()} days)` : "No"}
            </Badge>
          </div>
          <div>
            <strong>Current Tier:</strong> 
            <span className="ml-2 text-muted-foreground">{currentTier?.displayName || 'Free'}</span>
          </div>
        </div>

        <div className="border-t pt-3">
          <strong>Current Subscription:</strong>
          {currentSubscription ? (
            <div className="ml-2 mt-1 p-2 bg-muted/30 rounded text-xs font-mono">
              <div>ID: {currentSubscription.id}</div>
              <div>User ID: {currentSubscription.userId}</div>
              <div>Tier: {currentSubscription.tierId}</div>
              <div>Status: {currentSubscription.status}</div>
              {currentSubscription.trialEndDate && (
                <div>Trial End: {new Date(currentSubscription.trialEndDate).toLocaleString()}</div>
              )}
            </div>
          ) : (
            <div className="ml-2 text-muted-foreground">None</div>
          )}
        </div>

        <div className="border-t pt-3">
          <strong>localStorage Data:</strong>
          {parsedLocalData ? (
            <div className="ml-2 mt-1 p-2 bg-muted/30 rounded text-xs font-mono max-h-32 overflow-y-auto">
              <div>User ID: {parsedLocalData.userId}</div>
              <div>User Email: {parsedLocalData.userEmail}</div>
              <div>Subscription User ID: {parsedLocalData.subscription?.userId}</div>
              <div>Status: {parsedLocalData.subscription?.status}</div>
              {parsedLocalData.subscription?.trialEndDate && (
                <div>Trial End: {new Date(parsedLocalData.subscription.trialEndDate).toLocaleString()}</div>
              )}
              {parsedLocalData.lastRestored && (
                <div>Last Restored: {new Date(parsedLocalData.lastRestored).toLocaleString()}</div>
              )}
            </div>
          ) : (
            <div className="ml-2 text-muted-foreground">No trial data in localStorage</div>
          )}
        </div>

        <div className="border-t pt-3 flex gap-2">
          <Button onClick={handleStartTrial} size="sm" className="flex-1">
            🚀 Start Trial
          </Button>
          <Button onClick={handleClearTrial} variant="destructive" size="sm" className="flex-1">
            🗑️ Clear Trial
          </Button>
        </div>
      </div>
    </Card>
  );
}