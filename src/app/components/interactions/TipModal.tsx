import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { 
  DollarSign, 
  Heart,
  Coffee,
  Gift,
  Star,
  Clock
} from 'lucide-react';
import { useEpisodeInteraction } from '../../contexts/EpisodeInteractionContext';
import { cn } from '../ui/utils';

interface TipModalProps {
  episodeId: number;
  isOpen: boolean;
  onClose: () => void;
}

const tipAmounts = [
  { amount: 2, label: '$2', icon: Coffee, description: 'Buy me a coffee' },
  { amount: 5, label: '$5', icon: Heart, description: 'Show some love' },
  { amount: 10, label: '$10', icon: Gift, description: 'Great episode!' },
  { amount: 25, label: '$25', icon: Star, description: 'Amazing content!' }
];

export function TipModal({ episodeId, isOpen, onClose }: TipModalProps) {
  const {
    getTips,
    addTip,
    getEpisodeStats,
    isTipping
  } = useEpisodeInteraction();

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [showRecentTips, setShowRecentTips] = useState(true);

  const tips = getTips(episodeId);
  const stats = getEpisodeStats(episodeId);

  const handleSubmitTip = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = selectedAmount || parseFloat(customAmount);
    if (!amount || amount <= 0) return;

    await addTip(episodeId, amount, message.trim() || undefined);
    
    // Reset form
    setSelectedAmount(null);
    setCustomAmount('');
    setMessage('');
    onClose();
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const finalAmount = selectedAmount || parseFloat(customAmount) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Support This Episode
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Episode stats */}
          {stats.totalTipAmount > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold text-green-600">
                  ${stats.totalTipAmount}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Total tips from {stats.tipsCount} supporter{stats.tipsCount !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Quick tip amounts */}
          <div>
            <h4 className="font-medium mb-3">Quick Tip</h4>
            <div className="grid grid-cols-2 gap-2">
              {tipAmounts.map(({ amount, label, icon: Icon, description }) => (
                <Button
                  key={amount}
                  variant={selectedAmount === amount ? "default" : "outline"}
                  onClick={() => {
                    setSelectedAmount(amount);
                    setCustomAmount('');
                  }}
                  className={cn(
                    'h-auto p-3 flex-col gap-1',
                    selectedAmount === amount && 'bg-green-600 hover:bg-green-700 border-green-600'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-semibold">{label}</span>
                  <span className="text-xs opacity-80">{description}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div>
            <h4 className="font-medium mb-3">Custom Amount</h4>
            <div className="flex gap-2">
              <div className="relative flex-1">
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
          </div>

          {/* Optional message */}
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

          {/* Submit button */}
          <form onSubmit={handleSubmitTip}>
            <Button 
              type="submit"
              disabled={finalAmount <= 0 || isTipping}
              className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
              size="lg"
            >
              <DollarSign className="w-4 h-4" />
              {isTipping 
                ? 'Sending...' 
                : finalAmount > 0 
                  ? `Send $${finalAmount} Tip` 
                  : 'Enter Amount'
              }
            </Button>
          </form>

          {/* Recent tips */}
          {tips.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Recent Tips</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRecentTips(!showRecentTips)}
                  >
                    {showRecentTips ? 'Hide' : 'Show'}
                  </Button>
                </div>
                
                {showRecentTips && (
                  <ScrollArea className="max-h-32">
                    <div className="space-y-3">
                      {tips.slice(0, 5).map((tip) => (
                        <div key={tip.id} className="flex gap-3">
                          <Avatar className="w-6 h-6 flex-shrink-0">
                            <AvatarFallback className="text-xs">
                              {tip.userName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">{tip.userName}</span>
                              <Badge variant="secondary" className="text-xs">
                                ${tip.amount}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{formatTimeAgo(tip.createdAt)}</span>
                              </div>
                            </div>
                            {tip.message && (
                              <p className="text-sm text-muted-foreground">
                                "{tip.message}"
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </>
          )}

          {/* Payment info */}
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground text-center">
              💳 Secure payment processing • Tips go directly to the creator
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}