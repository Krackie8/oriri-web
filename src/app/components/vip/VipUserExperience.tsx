import React from 'react';
import { Crown, Star, Lock, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { useVipSubscription } from '../../contexts/VipSubscriptionContext';

interface VipUserExperienceProps {
  children: React.ReactNode;
}

export function VipUserExperience({ children }: VipUserExperienceProps) {
  const { isVipSubscriber, subscriptionTier } = useVipSubscription();

  if (!isVipSubscriber) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* VIP Status Indicator */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-16 right-4 z-40"
      >
        <Card className="px-3 py-2 bg-gradient-to-r from-yellow-500/10 to-purple-500/10 border-yellow-500/20">
          <div className="flex items-center space-x-2">
            <Crown className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-yellow-500">VIP Member</span>
            {subscriptionTier && (
              <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-600">
                {subscriptionTier}
              </Badge>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Enhanced Content with VIP Features */}
      <VipContentWrapper>
        {children}
      </VipContentWrapper>
    </div>
  );
}

// Component to wrap content and add VIP enhancements
function VipContentWrapper({ children }: { children: React.ReactNode }) {
  const { isVipSubscriber } = useVipSubscription();

  // Clone children and enhance with VIP features
  return (
    <div className={`${isVipSubscriber ? 'vip-enhanced' : ''}`}>
      {children}
      
      {/* VIP-only floating features */}
      {isVipSubscriber && <VipFloatingFeatures />}
    </div>
  );
}

// Floating VIP features
function VipFloatingFeatures() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed bottom-20 right-4 z-30"
    >
      <div className="space-y-2">
        {/* Quick VIP Actions */}
        <VipFloatingButton
          icon={Star}
          label="VIP Only"
          subtitle="Exclusive Episodes"
          gradient="from-purple-500 to-blue-500"
        />
        
        <VipFloatingButton
          icon={Zap}
          label="Ad-Free"
          subtitle="Premium Experience"
          gradient="from-green-500 to-teal-500"
        />
        
        <VipFloatingButton
          icon={Lock}
          label="Early Access"
          subtitle="New Content"
          gradient="from-orange-500 to-red-500"
        />
      </div>
    </motion.div>
  );
}

interface VipFloatingButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  subtitle: string;
  gradient: string;
}

function VipFloatingButton({ icon: Icon, label, subtitle, gradient }: VipFloatingButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`bg-gradient-to-r ${gradient} p-3 rounded-full shadow-lg cursor-pointer opacity-80 hover:opacity-100 transition-opacity`}
    >
      <div className="flex items-center space-x-2 text-white">
        <Icon className="w-4 h-4" />
        <div className="text-xs">
          <div className="font-medium">{label}</div>
          <div className="opacity-80">{subtitle}</div>
        </div>
      </div>
    </motion.div>
  );
}

export default VipUserExperience;