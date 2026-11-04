import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { 
  Lock, 
  Crown, 
  Star, 
  Sparkles, 
  Zap,
  Shield,
  Gift,
  ArrowRight
} from 'lucide-react';
import { useVipSubscription } from '../../contexts/VipSubscriptionContext';
import { SubscriptionModal } from './SubscriptionModal';
import { useModals } from '../../contexts/ModalContext';

interface VipGateComponentProps {
  requiredTier: string | string[];
  contentType?: 'episode' | 'feature' | 'live_session' | 'content';
  title?: string;
  description?: string;
  children?: React.ReactNode;
  variant?: 'overlay' | 'replacement' | 'banner';
  showPreview?: boolean;
  className?: string;
}

export function VipGateComponent({
  requiredTier,
  contentType = 'content',
  title,
  description,
  children,
  variant = 'overlay',
  showPreview = false,
  className = ''
}: VipGateComponentProps) {
  const {
    hasAccess,
    getGatingReason,
    availableTiers,
    currentTier,
    isVipMember
  } = useVipSubscription();
  
  const { setShowLogin } = useModals();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // If user has access, render children normally
  if (hasAccess(requiredTier)) {
    return <>{children}</>;
  }

  // Get the lowest tier that provides access
  const requiredTiers = Array.isArray(requiredTier) ? requiredTier : [requiredTier];
  const lowestTier = availableTiers
    .filter(tier => requiredTiers.includes(tier.id))
    .sort((a, b) => a.price - b.price)[0];

  const getContentTypeDisplay = () => {
    switch (contentType) {
      case 'episode': return { icon: '🎧', text: 'Episode' };
      case 'feature': return { icon: '⚡', text: 'Feature' };
      case 'live_session': return { icon: '🎪', text: 'Live Session' };
      default: return { icon: '🔒', text: 'Content' };
    }
  };

  const contentDisplay = getContentTypeDisplay();

  // Banner variant - minimal gate shown at top/bottom
  if (variant === 'banner') {
    return (
      <div className={`relative ${className}`}>
        {children && showPreview && (
          <div className="relative">
            <div className="opacity-50 pointer-events-none">
              {children}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>
        )}
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-lg p-4 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-full">
                <Crown className="w-4 h-4 text-purple-300" />
              </div>
              <div>
                <p className="font-medium text-sm">
                  Upgrade to unlock this {contentDisplay.text.toLowerCase()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {lowestTier?.displayName} • ${lowestTier?.price}/month
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowSubscriptionModal(true)}
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              Upgrade
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Replacement variant - completely replaces content
  if (variant === 'replacement') {
    return (
      <div className={className}>
        <Card className="bg-gradient-to-br from-slate-900/50 to-purple-900/30 border-purple-500/20 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full w-fit">
              <Lock className="w-8 h-8 text-purple-300" />
            </div>
            
            <CardTitle className="text-xl mb-2">
              {title || `${contentDisplay.text} Locked`}
            </CardTitle>
            
            <p className="text-muted-foreground">
              {description || getGatingReason(requiredTier)}
            </p>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            {lowestTier && (
              <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-lg">{lowestTier.badge}</span>
                  <span className="font-medium">{lowestTier.displayName}</span>
                  <Badge className="bg-purple-500/20 text-purple-300">
                    ${lowestTier.price}/mo
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {lowestTier.features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-muted-foreground">
                      <Star className="w-3 h-3 text-purple-400 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  {lowestTier.features.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{lowestTier.features.length - 3} more features
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                onClick={() => setShowSubscriptionModal(true)}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade Now
              </Button>
            </div>
            
            {!isVipMember && (
              <p className="text-xs text-muted-foreground">
                Start with a 7-day free trial
              </p>
            )}
          </CardContent>
        </Card>
        
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          highlightTierId={lowestTier?.id}
          onShowAuth={() => setShowLogin(true)}
        />
      </div>
    );
  }

  // Overlay variant - smaller overlay showing more content as sneak peek
  return (
    <div className={`relative ${className}`}>
      {children && showPreview && (
        <div className="relative">
          {/* Show the content with less opacity but more visible */}
          <div className="opacity-70 pointer-events-none">
            {children}
          </div>
          {/* Subtle gradient overlay focused on bottom area */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-transparent to-transparent" />
        </div>
      )}
      
      {/* Smaller, bottom-positioned VIP modal */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-4 left-4 right-4 flex items-end justify-center"
      >
        <Card className="bg-gradient-to-br from-slate-900/95 to-purple-900/85 border-purple-500/30 backdrop-blur-md shadow-2xl w-full max-w-sm">
          <CardContent className="p-4">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="p-2 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-full">
                  <Lock className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <p className="font-medium text-white text-sm">
                    {title || "Be Oriri Member to View Exclusive Contents"}
                  </p>
                </div>
              </div>
              
              <p className="text-xs text-purple-200">
                {description || "Subscribe for AED 20/month to unlock all exclusive Oriri content and premium features."}
              </p>

              {lowestTier && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <span className="text-lg">{lowestTier.badge}</span>
                  <span className="font-medium text-white text-sm">{lowestTier.displayName}</span>
                  <Badge className="bg-purple-500/20 text-purple-300 text-xs">
                    {lowestTier.currency} {lowestTier.price}/mo
                  </Badge>
                </div>
              )}

              <div className="space-y-1 text-xs text-purple-300">
                <div className="flex items-center justify-center gap-1">
                  <Star className="w-3 h-3" />
                  <span>Access to all exclusive Oriri episodes</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3" />
                  <span>Ad-free listening experience</span>
                </div>
              </div>
              
              <Button
                onClick={() => setShowSubscriptionModal(true)}
                size="sm"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Crown className="w-3 h-3 mr-2" />
                Unlock with VIP
              </Button>
              
              {!isVipMember && (
                <p className="text-xs text-purple-400">
                  7-day free trial included
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        highlightTierId={lowestTier?.id}
        onShowAuth={() => setShowLogin(true)}
      />
    </div>
  );
}