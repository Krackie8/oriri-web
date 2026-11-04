import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Crown, 
  Star, 
  Check, 
  Sparkles, 
  Shield,
  CreditCard,
  Gift,
  Zap,
  Heart,
  Users,
  Clock,
  Download,
  MessageCircle,
  Video,
  Trophy,
  Target,
  Loader2
} from 'lucide-react';
import { useVipSubscription } from '../../contexts/VipSubscriptionContext';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightTierId?: string;
  showTrialOnly?: boolean;
  onShowAuth?: () => void;
}

export function SubscriptionModal({ 
  isOpen, 
  onClose, 
  highlightTierId,
  showTrialOnly = false,
  onShowAuth
}: SubscriptionModalProps) {
  const {
    availableTiers,
    currentSubscription,
    subscribe,
    updateSubscription,
    startFreeTrial,
    isSubscribing,
    getAvailableBenefits
  } = useVipSubscription();
  
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [selectedTierId, setSelectedTierId] = useState(highlightTierId || availableTiers[0]?.id);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [activeTab, setActiveTab] = useState('plans');

  const selectedTier = availableTiers.find(tier => tier.id === selectedTierId);
  const isCurrentTier = selectedTierId === currentSubscription?.tierId;
  const isUpgrade = currentSubscription && selectedTier && selectedTier.price > (availableTiers.find(t => t.id === currentSubscription.tierId)?.price || 0);

  const handleStartFreeTrial = async () => {
    if (!selectedTierId) return;

    // Check if user is logged in
    if (!isLoggedIn) {
      // Close subscription modal and show auth modal
      onClose();
      if (onShowAuth) {
        onShowAuth();
      }
      return;
    }

    try {
      await startFreeTrial(selectedTierId);
      onClose();
      // Navigate to profile to show trial status
      navigate('/profile');
    } catch (error) {
      console.error('Free trial failed:', error);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedTierId) return;

    // Check if user is logged in
    if (!isLoggedIn) {
      onClose();
      if (onShowAuth) {
        onShowAuth();
      }
      return;
    }

    try {
      if (currentSubscription) {
        await updateSubscription(selectedTierId);
      } else {
        await subscribe(selectedTierId);
      }
      onClose();
      // Navigate to profile to show subscription status
      navigate('/profile');
    } catch (error) {
      console.error('Subscription failed:', error);
    }
  };

  const getFeatureIcon = (feature: string) => {
    if (feature.includes('Ad-free')) return <Shield className="w-4 h-4" />;
    if (feature.includes('Download')) return <Download className="w-4 h-4" />;
    if (feature.includes('Early access')) return <Clock className="w-4 h-4" />;
    if (feature.includes('episode')) return <Star className="w-4 h-4" />;
    if (feature.includes('Live')) return <Video className="w-4 h-4" />;
    if (feature.includes('messaging')) return <MessageCircle className="w-4 h-4" />;
    if (feature.includes('community')) return <Users className="w-4 h-4" />;
    if (feature.includes('support')) return <Heart className="w-4 h-4" />;
    return <Check className="w-4 h-4" />;
  };

  const benefits = getAvailableBenefits();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full">
              <Crown className="w-6 h-6 text-purple-400" />
            </div>
            Unlock VIP Experience
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="plans">Choose Plan</TabsTrigger>
            <TabsTrigger value="benefits">All Benefits</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
          </TabsList>

          {/* Plans Tab */}
          <TabsContent value="plans" className="flex-1 mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
                {/* Billing Period Toggle */}
                <div className="flex items-center justify-center gap-4 p-4 bg-muted/30 rounded-lg">
                  <span className="text-sm">Monthly</span>
                  <Switch
                    checked={billingPeriod === 'yearly'}
                    onCheckedChange={(checked) => setBillingPeriod(checked ? 'yearly' : 'monthly')}
                  />
                  <span className="text-sm">Yearly</span>
                  <Badge className="bg-green-500/20 text-green-600">Save 20%</Badge>
                </div>

                {/* Plan Cards */}
                <div className="grid gap-4">
                  {availableTiers.map((tier) => {
                    const isSelected = selectedTierId === tier.id;
                    const yearlyPrice = tier.price * 12 * 0.8; // 20% discount
                    const displayPrice = billingPeriod === 'yearly' ? yearlyPrice / 12 : tier.price;
                    
                    return (
                      <motion.div
                        key={tier.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card 
                          className={`cursor-pointer transition-all ${
                            isSelected 
                              ? `bg-gradient-to-r ${tier.color} border-2 border-white/20 shadow-lg` 
                              : 'hover:border-primary/50'
                          } ${tier.highlighted ? 'ring-2 ring-purple-500/50' : ''}`}
                          onClick={() => setSelectedTierId(tier.id)}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="text-3xl">{tier.badge}</div>
                                <div>
                                  <h3 className={`text-xl font-semibold ${isSelected ? 'text-white' : ''}`}>
                                    {tier.displayName}
                                  </h3>
                                  <p className={`text-sm ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                                    {tier.description}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <div className={`text-3xl font-bold ${isSelected ? 'text-white' : ''}`}>
                                  ${displayPrice.toFixed(2)}
                                </div>
                                <div className={`text-sm ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                                  per month
                                </div>
                                {billingPeriod === 'yearly' && (
                                  <div className="text-xs text-green-400">
                                    Save ${(tier.price * 12 - yearlyPrice).toFixed(0)}/year
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              {tier.features.map((feature, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <div className={isSelected ? 'text-white' : 'text-primary'}>
                                    {getFeatureIcon(feature)}
                                  </div>
                                  <span className={`text-sm ${isSelected ? 'text-white' : ''}`}>
                                    {feature}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {tier.highlighted && (
                              <div className="mt-4 p-2 bg-white/10 rounded-lg">
                                <div className="flex items-center gap-2 text-sm text-white">
                                  <Trophy className="w-4 h-4" />
                                  <span>Most Popular Choice</span>
                                </div>
                              </div>
                            )}

                            {isCurrentTier && (
                              <Badge className="mt-3 bg-green-500/20 text-green-400">
                                Current Plan
                              </Badge>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Action Button */}
                <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm p-4 -m-4 border-t">
                  <Button
                    onClick={() => setActiveTab('payment')}
                    disabled={!selectedTierId || isCurrentTier}
                    size="lg"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {isCurrentTier ? (
                      'Current Plan'
                    ) : isUpgrade ? (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Upgrade Plan
                      </>
                    ) : (
                      <>
                        <Crown className="w-4 h-4 mr-2" />
                        Start Free Trial
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Benefits Tab */}
          <TabsContent value="benefits" className="flex-1 mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
                {['content', 'features', 'community', 'exclusive'].map((category) => {
                  const categoryBenefits = benefits.filter(benefit => benefit.category === category);
                  if (categoryBenefits.length === 0) return null;

                  const categoryInfo = {
                    content: { title: 'Content & Media', icon: Star, color: 'text-blue-500' },
                    features: { title: 'Premium Features', icon: Zap, color: 'text-purple-500' },
                    community: { title: 'Community Access', icon: Users, color: 'text-green-500' },
                    exclusive: { title: 'Exclusive Perks', icon: Crown, color: 'text-yellow-500' }
                  };

                  const info = categoryInfo[category as keyof typeof categoryInfo];
                  const Icon = info.icon;

                  return (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center gap-2 mb-4">
                        <Icon className={`w-5 h-5 ${info.color}`} />
                        <h3 className="text-lg font-semibold">{info.title}</h3>
                      </div>
                      
                      <div className="grid gap-3">
                        {categoryBenefits.map((benefit) => (
                          <Card key={benefit.id} className="bg-muted/30">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="text-2xl">{benefit.icon}</div>
                                <div className="flex-1">
                                  <h4 className="font-medium mb-1">{benefit.name}</h4>
                                  <p className="text-sm text-muted-foreground mb-3">
                                    {benefit.description}
                                  </p>
                                  <div className="flex gap-1">
                                    {benefit.requiredTier.map((tierId) => {
                                      const tier = availableTiers.find(t => t.id === tierId);
                                      return tier ? (
                                        <Badge 
                                          key={tierId} 
                                          className="bg-purple-500/20 text-purple-300 text-xs"
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
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Payment Tab */}
          <TabsContent value="payment" className="flex-1 mt-4">
            <div className="space-y-6 max-h-[500px] overflow-y-auto">
              {selectedTier && (
                <>
                  {/* Order Summary */}
                  <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{selectedTier.badge}</div>
                          <div>
                            <h3 className="font-semibold">{selectedTier.displayName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {billingPeriod === 'yearly' ? 'Annual' : 'Monthly'} subscription
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            ${billingPeriod === 'yearly' 
                              ? (selectedTier.price * 12 * 0.8).toFixed(0)
                              : selectedTier.price.toFixed(2)
                            }
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {billingPeriod === 'yearly' ? 'per year' : 'per month'}
                          </div>
                        </div>
                      </div>

                      {!currentSubscription && (
                        <div className="p-3 bg-green-500/20 rounded-lg border border-green-500/30">
                          <div className="flex items-center gap-2 text-green-400">
                            <Gift className="w-4 h-4" />
                            <span className="text-sm font-medium">7-Day Free Trial Included</span>
                          </div>
                          <p className="text-xs text-green-300 mt-1">
                            Cancel anytime during trial period at no charge
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Payment Method */}
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Payment Method
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="p-4 border border-dashed border-muted-foreground/30 rounded-lg text-center">
                          <CreditCard className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Secure payment processing simulation
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            In production: Stripe, PayPal, Apple Pay, etc.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Terms */}
                  <div className="text-xs text-muted-foreground space-y-2">
                    <p>
                      By subscribing, you agree to our Terms of Service and Privacy Policy. 
                      Your subscription will automatically renew unless cancelled.
                    </p>
                    <p>
                      Cancel anytime in your account settings. No refunds for partial months.
                    </p>
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={handleStartFreeTrial}
                    disabled={isSubscribing || isCurrentTier}
                    size="lg"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {isSubscribing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isLoggedIn ? 'Starting Trial...' : 'Processing...'}
                      </>
                    ) : isCurrentTier ? (
                      'Current Plan'
                    ) : isUpgrade ? (
                      `Upgrade to ${selectedTier.displayName}`
                    ) : (
                      <>
                        <Crown className="w-4 h-4 mr-2" />
                        {isLoggedIn ? 'Start Free Trial' : 'Login to Start Free Trial'}
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}