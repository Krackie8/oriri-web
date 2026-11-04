import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Crown, 
  Star, 
  Sparkles, 
  Check,
  Lock,
  Gift,
  Zap,
  Users,
  Heart,
  Shield,
  Headphones,
  Download,
  Video,
  MessageCircle,
  Calendar,
  Trophy,
  Target
} from 'lucide-react';
import { useVipSubscription } from '../../contexts/VipSubscriptionContext';
import { SubscriptionModal } from './SubscriptionModal';

interface VipBenefitsDisplayProps {
  variant?: 'full' | 'compact' | 'showcase';
  showSubscribeButton?: boolean;
  className?: string;
}

export function VipBenefitsDisplay({ 
  variant = 'full', 
  showSubscribeButton = true,
  className = '' 
}: VipBenefitsDisplayProps) {
  const {
    isVipMember,
    currentTier,
    availableTiers,
    getAvailableBenefits,
    getUnlockedBenefits
  } = useVipSubscription();

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const allBenefits = getAvailableBenefits();
  const unlockedBenefits = getUnlockedBenefits();
  
  const getBenefitIcon = (benefitId: string) => {
    const iconMap: Record<string, any> = {
      'ad-free': Shield,
      'offline-downloads': Download,
      'early-access': Calendar,
      'exclusive-episodes': Star,
      'live-priority': Video,
      'premium-audio': Headphones,
      'host-messaging': MessageCircle,
      'monthly-meetup': Users,
      'behind-scenes': Video,
      'topic-influence': Target
    };
    
    return iconMap[benefitId] || Check;
  };

  // Compact variant - mini display
  if (variant === 'compact') {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Crown className="w-4 h-4 text-purple-500" />
            VIP Benefits
          </h3>
          {!isVipMember && showSubscribeButton && (
            <Button
              onClick={() => setShowSubscriptionModal(true)}
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              Upgrade
            </Button>
          )}
        </div>
        
        {isVipMember && currentTier ? (
          <div className="p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{currentTier.badge}</span>
              <span className="font-medium">{currentTier.displayName}</span>
              <Badge className="bg-green-500/20 text-green-400">Active</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {unlockedBenefits.length} benefits unlocked
            </div>
          </div>
        ) : (
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              Unlock premium features and exclusive content
            </p>
            <div className="flex gap-1">
              {availableTiers.slice(0, 3).map((tier) => (
                <Badge key={tier.id} variant="outline" className="text-xs">
                  {tier.badge} ${tier.price}/mo
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Showcase variant - marketing display
  if (variant === 'showcase') {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-full mb-4">
            <Crown className="w-5 h-5 text-purple-400" />
            <span className="font-semibold">VIP Experience</span>
            <Sparkles className="w-4 h-4 text-pink-400" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Unlock Premium Features</h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of VIP members enjoying exclusive content and premium features
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {availableTiers.map((tier) => (
            <motion.div
              key={tier.id}
              whileHover={{ y: -5 }}
              className={`relative ${tier.highlighted ? 'md:-mt-4' : ''}`}
            >
              <Card className={`bg-gradient-to-br ${tier.color} border-white/20 text-white relative overflow-hidden`}>
                {tier.highlighted && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-center py-1 text-xs font-medium">
                    Most Popular
                  </div>
                )}
                
                <CardHeader className={tier.highlighted ? 'pt-8' : ''}>
                  <div className="text-4xl mb-2">{tier.badge}</div>
                  <CardTitle className="text-white">{tier.displayName}</CardTitle>
                  <div className="text-3xl font-bold">${tier.price}</div>
                  <div className="text-white/80 text-sm">per month</div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2 mb-6">
                    {tier.features.slice(0, 4).map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-white" />
                        <span className="text-white/90">{feature}</span>
                      </div>
                    ))}
                    {tier.features.length > 4 && (
                      <div className="text-sm text-white/70">
                        +{tier.features.length - 4} more features
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={() => setShowSubscriptionModal(true)}
                    className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    Choose Plan
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // Full variant - complete benefits overview
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="w-6 h-6 text-purple-500" />
            VIP Benefits
          </h2>
          <p className="text-muted-foreground">
            Discover all the premium features and exclusive content available to VIP members
          </p>
        </div>
        
        {!isVipMember && showSubscribeButton && (
          <Button
            onClick={() => setShowSubscriptionModal(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Crown className="w-4 h-4 mr-2" />
            Become VIP
          </Button>
        )}
      </div>

      {/* Current Status */}
      {isVipMember && currentTier ? (
        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-full">
                  <Crown className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <span>{currentTier.badge}</span>
                    <span>{currentTier.displayName}</span>
                    <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    You have access to {unlockedBenefits.length} premium benefits
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-green-400">
                  {Math.round((unlockedBenefits.length / allBenefits.length) * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">Benefits Unlocked</div>
              </div>
            </div>
            
            <Progress 
              value={(unlockedBenefits.length / allBenefits.length) * 100} 
              className="mt-4 h-2"
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="inline-flex p-3 bg-purple-500/20 rounded-full mb-4">
                <Lock className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-semibold mb-2">Unlock VIP Benefits</h3>
              <p className="text-muted-foreground mb-4">
                Join VIP to access exclusive content, premium features, and community perks
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Gift className="w-4 h-4" />
                <span>7-day free trial • Cancel anytime</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Benefits List */}
      <div className="space-y-4">
        {allBenefits.map((benefit) => {
          const isUnlocked = isVipMember && currentTier && benefit.requiredTier.includes(currentTier.id);
          const Icon = getBenefitIcon(benefit.id);
          
          return (
            <Card key={benefit.id} className={`${isUnlocked ? 'border-green-500/30' : 'border-muted'}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-full ${
                    isUnlocked 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {isUnlocked ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Lock className="w-5 h-5" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-xl">{benefit.icon}</div>
                      <h3 className="font-semibold">{benefit.name}</h3>
                      {isUnlocked && (
                        <Badge className="bg-green-500/20 text-green-400">
                          Unlocked
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {benefit.description}
                    </p>
                    
                    <div className="flex gap-1">
                      {benefit.requiredTier.map((tierId) => {
                        const tier = availableTiers.find(t => t.id === tierId);
                        return tier ? (
                          <Badge 
                            key={tierId} 
                            className={`text-xs ${
                              isVipMember && currentTier && tierId === currentTier.id
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-purple-500/20 text-purple-300'
                            }`}
                          >
                            {tier.badge} {tier.displayName}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
    </div>
  );
}