import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Loader2, ShieldIcon, CheckIcon, CopyIcon, AlertTriangleIcon } from 'lucide-react';
import { useAdmin } from '../hooks/useAdmin';
import { toast } from 'sonner@2.0.3';
import ErrorBoundary from './ErrorBoundary';

interface AdminSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AdminSetupContent({ open, onOpenChange }: AdminSetupModalProps) {
  const { setupAdmin, loading } = useAdmin();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [result, setResult] = useState<any>(null);
  const [step, setStep] = useState<'setup' | 'success' | 'error'>('setup');
  const [errorDetails, setErrorDetails] = useState<string>('');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSetupAdmin = async () => {
    try {
      setResult(null); // Clear previous results
      setErrorDetails('');
      setStep('setup');
      
      console.log('[AdminSetupModal] Starting admin setup...');
      
      const setupResult = await setupAdmin(
        formData.email || undefined,
        formData.password || undefined,
        formData.name || undefined
      );

      if (setupResult && setupResult.success) {
        console.log('[AdminSetupModal] Setup successful:', setupResult);
        setResult(setupResult);
        setStep('success');
        toast.success('Admin user created successfully!');
      } else {
        const errorMessage = setupResult?.error || 'Failed to create admin user';
        console.error('[AdminSetupModal] Setup failed:', errorMessage);
        setErrorDetails(errorMessage);
        setStep('error');
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('[AdminSetupModal] Error setting up admin:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setErrorDetails(errorMessage);
      setStep('error');
      toast.error('An unexpected error occurred');
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        toast.success(`${type} copied to clipboard!`);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          toast.success(`${type} copied to clipboard!`);
        } catch (err) {
          console.error('Fallback copy failed:', err);
          toast.error('Failed to copy to clipboard');
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error('[AdminSetupModal] Failed to copy to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleClose = () => {
    setStep('setup');
    setResult(null);
    setErrorDetails('');
    setFormData({
      email: '',
      password: '',
      name: ''
    });
    onOpenChange(false);
  };

  const handleRetry = () => {
    setStep('setup');
    setResult(null);
    setErrorDetails('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-background/95 backdrop-blur-sm border-border/50 max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldIcon className="w-5 h-5 text-primary" />
            Admin Setup
          </DialogTitle>
          <DialogDescription>
            {step === 'setup' 
              ? 'Create or update your admin account to access the dashboard'
              : step === 'success'
              ? 'Admin account ready! Use these credentials to sign in'
              : 'Setup failed. Please try again.'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'setup' && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription className="text-sm">
                Leave fields empty to use default values:
                <br />
                • Email: admin@oriri.com
                <br />
                • Password: admin123
                <br />
                • Name: Oriri Admin
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <Label htmlFor="admin-email" className="text-sm font-medium">
                  Email (optional)
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@oriri.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="bg-input border-border"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="admin-password" className="text-sm font-medium">
                  Password (optional)
                </Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="admin123"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="bg-input border-border"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="admin-name" className="text-sm font-medium">
                  Name (optional)
                </Label>
                <Input
                  id="admin-name"
                  type="text"
                  placeholder="Oriri Admin"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="bg-input border-border"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleSetupAdmin}
                disabled={loading}
                className="flex-1 bg-primary/90 hover:bg-primary text-primary-foreground"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {loading ? 'Creating...' : 'Create Admin Account'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && result && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckIcon className="w-6 h-6 text-green-500" />
              </div>
              <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                {result.admin.status === 'created' ? 'Account Created' : 'Account Updated'}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="bg-muted/30 rounded-lg p-3">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-sm">{result.credentials.email}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(result.credentials.email, 'Email')}
                  >
                    <CopyIcon className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-3">
                <Label className="text-xs text-muted-foreground">Password</Label>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-sm">{result.credentials.password}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(result.credentials.password, 'Password')}
                  >
                    <CopyIcon className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            <Alert>
              <AlertDescription className="text-sm">
                <strong>Important:</strong> Save these credentials! You can now sign in with this account to access the admin dashboard.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleClose}
              className="w-full"
            >
              Done
            </Button>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangleIcon className="w-6 h-6 text-destructive" />
              </div>
              <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                Setup Failed
              </Badge>
            </div>

            <Alert>
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Error:</strong> {errorDetails || 'An unexpected error occurred while setting up the admin account.'}
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button 
                onClick={handleRetry}
                className="flex-1"
                variant="outline"
              >
                Try Again
              </Button>
              <Button 
                onClick={handleClose}
                className="flex-1"
                variant="secondary"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AdminSetupModal({ open, onOpenChange }: AdminSetupModalProps) {
  return (
    <ErrorBoundary>
      <AdminSetupContent open={open} onOpenChange={onOpenChange} />
    </ErrorBoundary>
  );
}