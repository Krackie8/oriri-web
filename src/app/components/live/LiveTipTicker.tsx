import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveTip } from '../../contexts/LiveTipContext';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { DollarSign, Heart, Star, Crown } from 'lucide-react';

interface LiveTipTickerProps {
  sessionId: string;
  position?: 'top' | 'bottom';
  maxVisible?: number;
}

export function LiveTipTicker({ 
  sessionId, 
  position = 'bottom',
  maxVisible = 5 
}: LiveTipTickerProps) {
  const { tips } = useLiveTip();
  const [visibleTips, setVisibleTips] = useState<any[]>([]);

  useEffect(() => {
    const sessionTips = tips
      .filter(tip => tip.sessionId === sessionId)
      .slice(0, maxVisible);
    
    setVisibleTips(sessionTips);
  }, [tips, sessionId, maxVisible]);

  const getTipIcon = (amount: number) => {
    if (amount >= 100) return Crown;
    if (amount >= 50) return Star;
    if (amount >= 20) return Heart;
    return DollarSign;
  };

  const getTipColor = (amount: number) => {
    if (amount >= 100) return 'from-yellow-500 to-orange-500';
    if (amount >= 50) return 'from-purple-500 to-pink-500';
    if (amount >= 20) return 'from-blue-500 to-cyan-500';
    return 'from-green-500 to-emerald-500';
  };

  if (visibleTips.length === 0) return null;

  return (
    <div className={`
      fixed left-0 right-0 z-30 pointer-events-none
      ${position === 'top' ? 'top-20' : 'bottom-20'}
    `}>
      <div className="relative h-16 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {visibleTips.map((tip, index) => {
            const Icon = getTipIcon(tip.amount);
            const colorClasses = getTipColor(tip.amount);
            
            return (
              <motion.div
                key={tip.id}
                className={`
                  absolute h-12 flex items-center gap-3 px-4 py-2 rounded-full shadow-lg
                  bg-gradient-to-r ${colorClasses} text-white backdrop-blur-sm
                  border border-white/20
                `}
                style={{
                  top: `${index * 16}px`,
                  zIndex: maxVisible - index
                }}
                initial={{ 
                  x: window.innerWidth, 
                  opacity: 0,
                  scale: 0.8 
                }}
                animate={{ 
                  x: -400, 
                  opacity: 1,
                  scale: 1 
                }}
                exit={{ 
                  x: -window.innerWidth, 
                  opacity: 0,
                  scale: 0.8 
                }}
                transition={{
                  duration: 8,
                  ease: "linear",
                  opacity: { duration: 0.3 },
                  scale: { duration: 0.3 }
                }}
              >
                {/* Avatar */}
                {!tip.isAnonymous && tip.userAvatar && (
                  <Avatar className="w-8 h-8 flex-shrink-0 border-2 border-white/30">
                    <AvatarImage src={tip.userAvatar} alt={tip.userName} />
                    <AvatarFallback className="text-xs">
                      {tip.userName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                {/* Tip content */}
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">
                        {tip.isAnonymous ? 'Anonymous' : tip.userName}
                      </span>
                      <Badge className="bg-white/20 text-white text-xs px-2 py-0.5">
                        ${tip.amount}
                      </Badge>
                    </div>
                    
                    {tip.message && (
                      <p className="text-xs opacity-90 truncate max-w-[200px]">
                        "{tip.message}"
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Special effects for large tips */}
                {tip.amount >= 50 && (
                  <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-transparent rounded-full opacity-50 animate-pulse" />
                )}
                
                {tip.amount >= 100 && (
                  <>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white rounded-full animate-bounce" />
                  </>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {/* Gradient fade effects */}
        <div className={`
          absolute inset-y-0 right-0 w-20 pointer-events-none
          bg-gradient-to-l from-background to-transparent
        `} />
        <div className={`
          absolute inset-y-0 left-0 w-20 pointer-events-none
          bg-gradient-to-r from-background to-transparent
        `} />
      </div>
    </div>
  );
}

// Compact version for mobile
export function LiveTipTickerCompact({ sessionId }: { sessionId: string }) {
  const { tips } = useLiveTip();
  const [currentTip, setCurrentTip] = useState<any>(null);

  useEffect(() => {
    const sessionTips = tips.filter(tip => tip.sessionId === sessionId);
    if (sessionTips.length > 0) {
      setCurrentTip(sessionTips[0]);
      
      // Auto-cycle through tips
      const interval = setInterval(() => {
        const nextIndex = Math.floor(Math.random() * Math.min(sessionTips.length, 3));
        setCurrentTip(sessionTips[nextIndex]);
      }, 4000);
      
      return () => clearInterval(interval);
    }
  }, [tips, sessionId]);

  if (!currentTip) return null;

  const Icon = currentTip.amount >= 50 ? Crown : currentTip.amount >= 20 ? Star : DollarSign;
  const bgColor = currentTip.amount >= 50 ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 
                  currentTip.amount >= 20 ? 'bg-gradient-to-r from-blue-600 to-cyan-600' : 
                  'bg-gradient-to-r from-green-600 to-emerald-600';

  return (
    <div className="fixed top-20 left-4 right-4 z-30 pointer-events-none md:hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTip.id}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-full shadow-lg text-white
            ${bgColor} backdrop-blur-sm border border-white/20
          `}
          initial={{ y: -50, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -50, opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3 }}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">
                {currentTip.isAnonymous ? 'Anonymous' : currentTip.userName}
              </span>
              <Badge className="bg-white/20 text-white text-xs">
                ${currentTip.amount}
              </Badge>
            </div>
          </div>
          
          {currentTip.amount >= 50 && (
            <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-transparent rounded-full opacity-50 animate-pulse" />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}