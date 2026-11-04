import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { 
  ArrowLeftIcon,
  BellIcon,
  Volume2Icon,
  MoonIcon,
  DownloadIcon,
  ShieldIcon,
  InfoIcon,
  TrashIcon,
  CrownIcon,
  BugIcon,
  RotateCcwIcon
} from 'lucide-react';
import AdminSetupModal from './AdminSetupModal';
import ErrorBoundary from './ErrorBoundary';
import DebugUtils from '../utils/debugUtils';
import { Slider } from './ui/slider';
import { useAdmin } from '../hooks/useAdmin';
import { useAuth } from '../hooks/useAuth';
import { notificationService } from '../utils/notificationService';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';

const PUSH_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;

interface SettingsScreenProps {
  onBack: () => void;
}

// Settings Component wrapped in error boundary
function SettingsContent({ onBack }: SettingsScreenProps) {
  const { isAdmin } = useAdmin();
  const { session, isLoggedIn } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [autoDownload, setAutoDownload] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [dataSync, setDataSync] = useState(true);
  const [volume, setVolume] = useState([75]);
  const [language, setLanguage] = useState('en');
  const [downloadQuality, setDownloadQuality] = useState('medium');
  const [wifiOnly, setWifiOnly] = useState(true);
  const [showAdminSetup, setShowAdminSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [debugMode, setDebugMode] = useState(false);

  // Initialize settings safely
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        // Simulate loading settings from localStorage or API
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Load saved settings if they exist
        const savedSettings = localStorage.getItem('oriri-settings');
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings);
            setNotifications(parsed.notifications ?? true);
            setAutoDownload(parsed.autoDownload ?? false);
            setDarkMode(parsed.darkMode ?? true);
            setDataSync(parsed.dataSync ?? true);
            setVolume(parsed.volume ?? [75]);
            setLanguage(parsed.language ?? 'en');
            setDownloadQuality(parsed.downloadQuality ?? 'medium');
            setWifiOnly(parsed.wifiOnly ?? true);
            setDebugMode(parsed.debugMode ?? false);
          } catch (parseError) {
            console.warn('Failed to parse saved settings:', parseError);
          }
        }
        
        // Set debug log level based on saved preference
        DebugUtils.setLogLevel(debugMode ? 'debug' : 'info');
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing settings:', error);
        setIsLoading(false);
      }
    };

    initializeSettings();
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (!isLoading) {
      const settingsToSave = {
        notifications,
        autoDownload,
        darkMode,
        dataSync,
        volume,
        language,
        downloadQuality,
        wifiOnly,
        debugMode
      };
      
      try {
        localStorage.setItem('oriri-settings', JSON.stringify(settingsToSave));
        // Update debug level when debugMode changes
        DebugUtils.setLogLevel(debugMode ? 'debug' : 'info');
      } catch (error) {
        console.warn('Failed to save settings:', error);
      }
    }
  }, [notifications, autoDownload, darkMode, dataSync, volume, language, downloadQuality, wifiOnly, isLoading, debugMode]);

  // Reflect the actual browser push subscription state in the toggle.
  useEffect(() => {
    let cancelled = false;
    notificationService.getPushSubscription().then((sub) => {
      if (!cancelled) setPushEnabled(!!sub);
    });
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  // Subscribe / unsubscribe from real server push. Fails soft.
  const handleTogglePush = async (next: boolean) => {
    if (!notificationService.isPushSupported()) {
      toast.error('Push notifications are not supported on this device.');
      return;
    }
    if (!isLoggedIn || !session?.access_token) {
      toast.error('Please sign in to enable push notifications.');
      return;
    }

    setPushBusy(true);
    try {
      if (next) {
        const ok = await notificationService.subscribeToPush(PUSH_BASE_URL, session.access_token);
        setPushEnabled(ok);
        toast[ok ? 'success' : 'error'](
          ok ? 'Push notifications enabled' : 'Could not enable notifications',
        );
      } else {
        await notificationService.unsubscribeFromPush(PUSH_BASE_URL, session.access_token);
        setPushEnabled(false);
        toast.success('Push notifications disabled');
      }
    } finally {
      setPushBusy(false);
    }
  };

  const handleOpenPrivacyPolicy = () => {
    try {
      // In a real app, this would open the actual privacy policy
      alert('Privacy Policy would open here in a real implementation.');
    } catch (error) {
      console.error('Error opening privacy policy:', error);
    }
  };

  const handleOpenTerms = () => {
    try {
      // In a real app, this would open the actual terms of service
      alert('Terms of Service would open here in a real implementation.');
    } catch (error) {
      console.error('Error opening terms:', error);
    }
  };

  const handleSafeBack = () => {
    try {
      onBack();
    } catch (error) {
      console.error('Error navigating back:', error);
      // Fallback navigation
      window.history.back();
    }
  };

  const handleDownloadDebugReport = () => {
    try {
      DebugUtils.downloadDebugReport();
      alert('Debug report downloaded successfully!');
    } catch (error) {
      console.error('Error downloading debug report:', error);
      alert('Failed to download debug report. Please try again.');
    }
  };

  const handleClearDebugData = () => {
    try {
      const confirmed = confirm('This will clear all debug logs and error reports. Are you sure?');
      if (confirmed) {
        DebugUtils.clearStoredData();
        alert('Debug data cleared successfully!');
      }
    } catch (error) {
      console.error('Error clearing debug data:', error);
      alert('Failed to clear debug data. Please try again.');
    }
  };

  const handleResetOnboarding = () => {
    try {
      const confirmed = confirm('This will reset the onboarding flow. The onboarding will show again next time you refresh the page or re-enter the app as a guest. Are you sure?');
      if (confirmed) {
        localStorage.removeItem('oriri-onboarding-seen');
        sessionStorage.removeItem('oriri-admin-welcome-shown');
        alert('Onboarding has been reset! Refresh the page or sign out to see it again.');
        console.log('[SettingsScreen] Onboarding reset successfully');
      }
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      alert('Failed to reset onboarding. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        {/* Fixed header with proper spacing to account for main app header */}
        <div className="p-4 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-16 z-10">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" onClick={handleSafeBack}>
              <ArrowLeftIcon className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-medium">Settings</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Customize your Oriri experience
          </p>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Fixed header with proper spacing to account for main app header */}
      <div className="p-4 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-16 z-10">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="sm" onClick={handleSafeBack}>
            <ArrowLeftIcon className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-medium">Settings</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Customize your Oriri experience
        </p>
      </div>

      {/* Content with padding to account for main app header */}
      <div className="flex-1 overflow-y-auto pt-4">
        {/* Notifications Section */}
        <div className="p-4 pt-0">
          <div className="flex items-center gap-3 mb-4">
            <BellIcon className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-medium">Notifications</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Get notified about new episodes and live sessions</p>
              </div>
              <Switch
                checked={pushEnabled}
                disabled={pushBusy}
                onCheckedChange={handleTogglePush}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Episode Reminders</p>
                <p className="text-sm text-muted-foreground">Reminders for scheduled episodes</p>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Playback Section */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Volume2Icon className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-medium">Playback</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">Volume</p>
                <span className="text-sm text-muted-foreground">{volume[0]}%</span>
              </div>
              <Slider
                value={volume}
                onValueChange={setVolume}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-play Next Episode</p>
                <p className="text-sm text-muted-foreground">Automatically play the next episode</p>
              </div>
              <Switch
                checked={autoDownload}
                onCheckedChange={setAutoDownload}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Downloads Section */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <DownloadIcon className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-medium">Downloads</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-download Episodes</p>
                <p className="text-sm text-muted-foreground">Download new episodes automatically</p>
              </div>
              <Switch
                checked={autoDownload}
                onCheckedChange={setAutoDownload}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">WiFi Only Downloads</p>
                <p className="text-sm text-muted-foreground">Only download when connected to WiFi</p>
              </div>
              <Switch
                checked={wifiOnly}
                onCheckedChange={setWifiOnly}
              />
            </div>

            <div>
              <p className="font-medium mb-2">Download Quality</p>
              <Select value={downloadQuality} onValueChange={setDownloadQuality}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (32 kbps)</SelectItem>
                  <SelectItem value="medium">Medium (128 kbps)</SelectItem>
                  <SelectItem value="high">High (320 kbps)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Appearance Section */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <MoonIcon className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-medium">Appearance</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">Use dark theme</p>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            </div>

            <div>
              <p className="font-medium mb-2">Language</p>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Data & Privacy Section */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <ShieldIcon className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-medium">Data & Privacy</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sync Data</p>
                <p className="text-sm text-muted-foreground">Sync your progress across devices</p>
              </div>
              <Switch
                checked={dataSync}
                onCheckedChange={setDataSync}
              />
            </div>

            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={handleOpenPrivacyPolicy}
            >
              <InfoIcon className="w-4 h-4" />
              Privacy Policy
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={handleOpenTerms}
            >
              <InfoIcon className="w-4 h-4" />
              Terms of Service
            </Button>

            {/* Admin-only: Setup Admin Account */}
            {isAdmin && (
              <ErrorBoundary>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 border-primary/30 hover:border-primary hover:bg-primary/5"
                  onClick={() => setShowAdminSetup(true)}
                >
                  <CrownIcon className="w-4 h-4 text-primary" />
                  Setup Admin Account
                </Button>
              </ErrorBoundary>
            )}
          </div>
        </div>

        <Separator />

        {/* Developer Section - Admin Only */}
        {isAdmin && (
          <>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <BugIcon className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-medium">Developer</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Debug Mode</p>
                    <p className="text-sm text-muted-foreground">Enable detailed logging for troubleshooting</p>
                  </div>
                  <Switch
                    checked={debugMode}
                    onCheckedChange={setDebugMode}
                  />
                </div>

                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={handleDownloadDebugReport}
                >
                  <BugIcon className="w-4 h-4" />
                  Download Debug Report
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={handleClearDebugData}
                >
                  <TrashIcon className="w-4 h-4" />
                  Clear Debug Data
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/5"
                  onClick={handleResetOnboarding}
                >
                  <RotateCcwIcon className="w-4 h-4 text-amber-500" />
                  Reset Onboarding Flow
                </Button>
              </div>
            </div>

            <Separator />
          </>
        )}

        {/* App Info */}
        <div className="p-4 pb-20">
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">Oriri v1.0.0</p>
            <p className="text-xs text-muted-foreground">Built with ❤️ for content creators</p>
          </div>
        </div>
      </div>

      {/* Admin Setup Modal */}
      <ErrorBoundary>
        <AdminSetupModal 
          open={showAdminSetup}
          onOpenChange={setShowAdminSetup}
        />
      </ErrorBoundary>
    </div>
  );
}

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  return (
    <ErrorBoundary>
      <SettingsContent onBack={onBack} />
    </ErrorBoundary>
  );
}