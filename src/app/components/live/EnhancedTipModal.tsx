import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';
import { 
  DollarSign, 
  Heart,
  Coffee,
  Gift,
  Star,
  Target,
  Sparkles,
  EyeOff,
  Zap,
  Crown,
  Flame
} from 'lucide-react';
import { useLiveTip } from '../../contexts/LiveTipContext';
import { motion, AnimatePresence } from 'motion/react';

interface EnhancedTipModalProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
}

const quickTipAmounts = [
  { amount: 5, label: '$5', icon: Coffee, description: 'Buy a coffee', color: 'bg-amber-500' },
  { amount: 10, label: '$10', icon: Heart, description: 'Show love', color: 'bg-red-500' },
  { amount: 25, label: '$25', icon: Gift, description: 'Great content!', color: 'bg-blue-500' },
  { amount: 50, label: '$50', icon: Star, description: 'Super supporter', color: 'bg-purple-500' },
  { amount: 100, label: '$100', icon: Crown, description: 'VIP supporter', color: 'bg-yellow-500' }
];

const superChatLevels = [
  { amount: 20, duration: '30s', color: 'bg-blue-500', label: 'Highlighted' },
  { amount: 50, duration: '1m', color: 'bg-purple-500', label: 'Featured' },
  { amount: 100, duration: '2m', color: 'bg-yellow-500', label: 'Premium' },
  { amount: 200, duration: '5m', color: 'bg-red-500', label: 'VIP' }
];

export function EnhancedTipModal({ sessionId, isOpen, onClose }: EnhancedTipModalProps) {
  const {
    sendTip,
    contributeToGoal,
    goals,
    getSessionStats,
    isSendingTip
  } = useLiveTip();

  const [activeTab, setActiveTab] = useState('standard');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [superChatLevel, setSuperChatLevel] = useState(0);

  const sessionGoals = goals.filter(goal => goal.sessionId === sessionId && goal.isActive);
  const stats = getSessionStats(sessionId);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedAmount(null);
      setCustomAmount('');
      setMessage('');
      setIsAnonymous(false);
      setSelectedGoal(null);
      setSuperChatLevel(0);
    }
  }, [isOpen]);

  const handleStandardTip = async () => {
    const amount = selectedAmount || parseFloat(customAmount);
    if (!amount || amount <= 0) return;

    try {
      await sendTip(sessionId, amount, message.trim() || undefined, isAnonymous);
      onClose();
    } catch (error) {
      console.error('Failed to send tip:', error);
    }
  };

  const handleSuperChatTip = async () => {
    const level = superChatLevels[superChatLevel];
    if (!level || !message.trim()) return;

    try {
      await sendTip(sessionId, level.amount, message.trim(), isAnonymous);
      onClose();
    } catch (error) {
      console.error('Failed to send super chat:', error);
    }
  };

  const handleGoalContribution = async () => {
    if (!selectedGoal) return;
    const amount = selectedAmount || parseFloat(customAmount);
    if (!amount || amount <= 0) return;

    try {
      await contributeToGoal(selectedGoal, amount, message.trim() || undefined);
      onClose();
    } catch (error) {
      console.error('Failed to contribute to goal:', error);
    }
  };

  const finalAmount = selectedAmount || parseFloat(customAmount) || 0;
  const selectedSuperChatLevel = superChatLevels[superChatLevel];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Support This Stream
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Stats */}
          {stats && (
            <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg p-4">
              <div className="flex items-center justify-center gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">${stats.totalAmount}</div>
                  <div className="text-xs text-muted-foreground">Total Raised</div>
                </div>
                <Separator orientation="vertical" className="h-8" />
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.totalTips}</div>
                  <div className="text-xs text-muted-foreground">Supporters</div>
                </div>
              </div>
            </div>
          )}

          {/* Tip Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="standard">Standard</TabsTrigger>
              <TabsTrigger value="superchat">Super Chat</TabsTrigger>
              <TabsTrigger value="goals">Goals</TabsTrigger>
            </TabsList>

            {/* Standard Tip Tab */}
            <TabsContent value="standard" className="space-y-4">
              <div>
                <h4 className="font-medium mb-3">Quick Amounts</h4>
                <div className="grid grid-cols-3 gap-2">
                  {quickTipAmounts.slice(0, 3).map(({ amount, label, icon: Icon, description, color }) => (
                    <Button
                      key={amount}
                      variant={selectedAmount === amount ? "default" : "outline"}
                      onClick={() => {
                        setSelectedAmount(amount);
                        setCustomAmount('');
                      }}
                      className={`h-auto p-3 flex-col gap-1 ${
                        selectedAmount === amount ? color + ' text-white' : ''
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-semibold">{label}</span>
                      <span className="text-xs opacity-80">{description}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Premium Amounts</h4>
                <div className="grid grid-cols-2 gap-2">
                  {quickTipAmounts.slice(3).map(({ amount, label, icon: Icon, description, color }) => (
                    <Button
                      key={amount}
                      variant={selectedAmount === amount ? "default" : "outline"}
                      onClick={() => {
                        setSelectedAmount(amount);
                        setCustomAmount('');
                      }}
                      className={`h-auto p-3 flex-col gap-1 ${
                        selectedAmount === amount ? color + ' text-white' : ''
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-semibold">{label}</span>
                      <span className="text-xs opacity-80">{description}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Custom Amount</h4>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="number"
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setSelectedAmount(null);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Message (Optional)</h4>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a supportive message..."
                  className="min-h-[60px] resize-none"
                  maxLength={200}
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-muted-foreground">
                    {message.length}/200 characters
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Send anonymously</span>
                </div>
                <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
              </div>

              <Button 
                onClick={handleStandardTip}
                disabled={finalAmount <= 0 || isSendingTip}
                className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                size="lg"
              >
                <DollarSign className="w-4 h-4" />
                {isSendingTip ? 'Sending...' : finalAmount > 0 ? `Send $${finalAmount} Tip` : 'Enter Amount'}
              </Button>
            </TabsContent>

            {/* Super Chat Tab */}
            <TabsContent value="superchat" className="space-y-4">
              <div className="bg-gradient-to-r from-yellow-500/10 to-red-500/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  <h4 className="font-medium">Super Chat</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Highlight your message and support the stream! Higher amounts get more visibility.
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-3">Super Chat Level</h4>
                <div className="space-y-2">
                  <Slider
                    value={[superChatLevel]}
                    onValueChange={([value]) => setSuperChatLevel(value)}
                    max={superChatLevels.length - 1}
                    step={1}
                    className="mb-4"
                  />
                  
                  <div className="grid grid-cols-2 gap-2">
                    {superChatLevels.map((level, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          superChatLevel === index 
                            ? level.color + ' border-transparent text-white' 
                            : 'border-border bg-muted/30'
                        }`}
                      >
                        <div className="font-semibold">${level.amount}</div>
                        <div className="text-xs opacity-80">{level.label}</div>
                        <div className="text-xs opacity-60">{level.duration} highlight</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Super Chat Message *</h4>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Your highlighted message (required for Super Chat)..."
                  className="min-h-[80px] resize-none"
                  maxLength={200}
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-muted-foreground">
                    {message.length}/200 characters
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Send anonymously</span>
                </div>
                <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
              </div>

              {selectedSuperChatLevel && (
                <div className={`p-4 rounded-lg ${selectedSuperChatLevel.color} text-white`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Preview</span>
                    <Badge className="bg-black/20 text-white">
                      ${selectedSuperChatLevel.amount}
                    </Badge>
                  </div>
                  <p className="text-sm opacity-90">
                    {message || 'Your message will appear here...'}
                  </p>
                  <div className="text-xs opacity-70 mt-2">
                    Highlighted for {selectedSuperChatLevel.duration}
                  </div>
                </div>
              )}

              <Button 
                onClick={handleSuperChatTip}
                disabled={!message.trim() || isSendingTip}
                className={`w-full gap-2 ${selectedSuperChatLevel?.color || 'bg-yellow-500'} hover:opacity-90 text-white`}
                size="lg"
              >
                <Sparkles className="w-4 h-4" />
                {isSendingTip ? 'Sending...' : selectedSuperChatLevel ? `Send $${selectedSuperChatLevel.amount} Super Chat` : 'Super Chat'}
              </Button>
            </TabsContent>

            {/* Goals Tab */}
            <TabsContent value="goals" className="space-y-4">
              {sessionGoals.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">No Active Goals</h3>
                  <p className="text-sm text-muted-foreground">
                    The host hasn't set any tip goals for this stream yet.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <h4 className="font-medium mb-3">Choose a Goal</h4>
                    <div className="space-y-3">
                      {sessionGoals.map((goal) => {
                        const progress = (goal.currentAmount / goal.targetAmount) * 100;
                        const isSelected = selectedGoal === goal.id;
                        
                        return (
                          <div
                            key={goal.id}
                            onClick={() => setSelectedGoal(isSelected ? null : goal.id)}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected 
                                ? 'border-blue-500 bg-blue-500/10' 
                                : 'border-border hover:border-blue-300 bg-muted/30'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-medium">{goal.title}</h3>
                              <div className="text-right">
                                <div className="font-bold">${goal.currentAmount} / ${goal.targetAmount}</div>
                                <div className="text-xs text-muted-foreground">
                                  {goal.contributors} contributor{goal.contributors !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                            
                            {goal.description && (
                              <p className="text-sm text-muted-foreground mb-3">{goal.description}</p>
                            )}
                            
                            <Progress value={Math.min(progress, 100)} className="h-2 mb-2" />
                            
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {Math.round(progress)}% funded
                              </span>
                              <span className="text-muted-foreground">
                                ${goal.targetAmount - goal.currentAmount} remaining
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {selectedGoal && (
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4"
                      >
                        <div>
                          <h4 className="font-medium mb-3">Contribution Amount</h4>
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            {[10, 25, 50].map((amount) => (
                              <Button
                                key={amount}
                                variant={selectedAmount === amount ? "default" : "outline"}
                                onClick={() => {
                                  setSelectedAmount(amount);
                                  setCustomAmount('');
                                }}
                                className="h-12"
                              >
                                ${amount}
                              </Button>
                            ))}
                          </div>
                          
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <input
                              type="number"
                              placeholder="Custom amount"
                              min="1"
                              step="0.01"
                              value={customAmount}
                              onChange={(e) => {
                                setCustomAmount(e.target.value);
                                setSelectedAmount(null);
                              }}
                              className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background"
                            />
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-3">Message (Optional)</h4>
                          <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Add a message with your contribution..."
                            className="min-h-[60px] resize-none"
                            maxLength={200}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">Contribute anonymously</span>
                          </div>
                          <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
                        </div>

                        <Button 
                          onClick={handleGoalContribution}
                          disabled={finalAmount <= 0 || isSendingTip}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                          size="lg"
                        >
                          <Target className="w-4 h-4" />
                          {isSendingTip 
                            ? 'Contributing...' 
                            : finalAmount > 0 
                              ? `Contribute $${finalAmount}` 
                              : 'Enter Amount'
                          }
                        </Button>
                      </motion.div>
                    </AnimatePresence>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}