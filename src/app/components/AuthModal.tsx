import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner@2.0.3';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType?: 'like' | 'comment' | 'general';
}

export function AuthModal({ isOpen, onClose, actionType = 'general' }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [showPasswordMode, setShowPasswordMode] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getActionText = () => {
    switch (actionType) {
      case 'like':
        return 'like episodes';
      case 'comment':
        return 'comment on episodes';
      default:
        return 'continue';
    }
  };

  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call to check if user exists or create account
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, always show success
      toast.success('Welcome to Oriri! Account created successfully');
      onClose();
      
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call for password sign in
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Welcome back!');
      onClose();
      
    } catch (error) {
      toast.error('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = () => {
    // Switch to account creation mode
    setShowPasswordMode(false);
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setShowPasswordMode(false);
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 bg-card/95 backdrop-blur-xl border border-white/10" aria-describedby={undefined}>
        <DialogHeader className="sr-only">
          <DialogTitle>Sign in to Oriri</DialogTitle>
          <DialogDescription>
            {actionType === 'like' 
              ? 'Sign in to like episodes and engage with the community'
              : actionType === 'comment'
              ? 'Sign in to comment on episodes and join the conversation'  
              : 'Sign in to access your account and personalized features'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="px-8 py-8">
          {/* Oriri Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-primary-foreground rounded-full"></div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-xl mb-2">Sign in to Oriri</h2>
            {!showPasswordMode ? (
              <p className="text-muted-foreground text-sm">
                First time here?{' '}
                <button 
                  onClick={handleCreateAccount}
                  className="text-primary hover:underline"
                >
                  Create account
                </button>
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                Enter your password to sign in
              </p>
            )}
          </div>

          {!showPasswordMode ? (
            /* Email Mode */
            <div className="space-y-4">
              {/* Email Input */}
              <div>
                <Input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 px-4 border-2 border-white/20 bg-white/5 backdrop-blur-sm rounded-lg focus:border-primary focus:ring-0"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleEmailSubmit();
                    }
                  }}
                />
              </div>

              {/* Continue Button */}
              <Button
                onClick={handleEmailSubmit}
                disabled={isLoading || !email.trim()}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Continue'
                )}
              </Button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-card/95 backdrop-blur-xl text-muted-foreground">OR</span>
                </div>
              </div>

              {/* Sign in with Password */}
              <Button
                variant="outline"
                onClick={() => setShowPasswordMode(true)}
                className="w-full h-12 border-2 border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 rounded-lg"
              >
                Sign in with password
              </Button>
            </div>
          ) : (
            /* Password Mode */
            <div className="space-y-4">
              {/* Email Input */}
              <div>
                <Input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 px-4 border-2 border-white/20 bg-white/5 backdrop-blur-sm rounded-lg focus:border-primary focus:ring-0"
                />
              </div>

              {/* Password Input */}
              <div>
                <Input
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 px-4 border-2 border-white/20 bg-white/5 backdrop-blur-sm rounded-lg focus:border-primary focus:ring-0"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handlePasswordSignIn();
                    }
                  }}
                />
              </div>

              {/* Sign In Button */}
              <Button
                onClick={handlePasswordSignIn}
                disabled={isLoading || !email.trim() || !password.trim()}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Sign in'
                )}
              </Button>

              {/* Back to Email Mode */}
              <div className="text-center">
                <button 
                  onClick={() => setShowPasswordMode(false)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Back to email sign in
                </button>
              </div>
            </div>
          )}

          {/* Context Message */}
          {actionType !== 'general' && (
            <div className="mt-6 p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
              <p className="text-sm text-muted-foreground text-center">
                Sign in to {getActionText()} and engage with the Oriri community
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}