import React from 'react';
import { X, Heart, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface SubscriptionPromptProps {
  action: 'like' | 'comment';
  onClose: () => void;
  onSubscribe: () => void;
}

export function SubscriptionPrompt({ action, onClose, onSubscribe }: SubscriptionPromptProps) {
  const actionText = action === 'like' ? 'like episodes' : 'join the discussion';
  const actionIcon = action === 'like' ? <Heart className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {actionIcon}
              <h3 className="font-semibold">Subscribe to continue</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1 h-auto"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <p className="text-muted-foreground">
              Create a free account to {actionText} and engage with the Oriri community.
            </p>

            <div className="space-y-3">
              <Button 
                onClick={onSubscribe}
                className="w-full"
              >
                Create Free Account
              </Button>
              
              <Button 
                variant="outline" 
                onClick={onClose}
                className="w-full"
              >
                Maybe Later
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Already have an account?{' '}
                <button 
                  onClick={onSubscribe}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SubscriptionPrompt;