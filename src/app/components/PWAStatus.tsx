import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';
import { WifiOff, Download, RefreshCw } from 'lucide-react';
import { serviceWorkerManager } from '../utils/serviceWorker';

export default function PWAStatus() {
  const [isOffline, setIsOffline] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [serviceWorkerSupported, setServiceWorkerSupported] = useState(false);

  useEffect(() => {
    // Check if service worker is supported and available
    const swSupported = 'serviceWorker' in navigator && window === window.top;
    setServiceWorkerSupported(swSupported);
    
    if (!swSupported) {
      console.debug('[PWAStatus] Service worker not supported in this environment');
      return;
    }

    try {
      // Subscribe to service worker state changes
      const unsubscribeUpdates = serviceWorkerManager.onStateChange((state) => {
        setUpdateAvailable(state.updateAvailable);
      });

      // Subscribe to offline status changes
      const unsubscribeOffline = serviceWorkerManager.onOfflineChange((offline) => {
        setIsOffline(offline);
        
        if (offline) {
          toast.info('You are now offline. Downloaded content is still available.', {
            icon: <WifiOff className="w-4 h-4" />,
            duration: 5000,
          });
        } else {
          toast.success('You are back online!', {
            duration: 3000,
          });
        }
      });

      // Show update notification when available
      if (updateAvailable && serviceWorkerSupported) {
        toast.info('App update available', {
          description: 'A new version of the app is ready to install.',
          action: (
            <Button
              size="sm"
              onClick={handleInstallUpdate}
              disabled={installing}
            >
              {installing ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <Download className="w-3 h-3 mr-1" />
                  Update
                </>
              )}
            </Button>
          ),
          duration: 10000,
        });
      }

      return () => {
        unsubscribeUpdates();
        unsubscribeOffline();
      };
    } catch (error) {
      console.debug('[PWAStatus] Failed to set up service worker listeners:', error.message);
      return () => {}; // Return empty cleanup function
    }
  }, [updateAvailable, installing, serviceWorkerSupported]);

  const handleInstallUpdate = async () => {
    if (!serviceWorkerSupported) {
      toast.error('Updates not supported in this environment');
      return;
    }
    
    setInstalling(true);
    
    try {
      const success = await serviceWorkerManager.applyUpdate();
      
      if (success) {
        toast.success('Update installed! Reloading app...', {
          duration: 2000,
        });
        
        // Reload after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error('Failed to install update. Please refresh manually.');
      }
    } catch (error) {
      console.error('Failed to install update:', error);
      toast.error('Failed to install update. Please refresh manually.');
    } finally {
      setInstalling(false);
    }
  };

  // This component doesn't render any persistent UI
  // It only shows toast notifications
  return null;
}