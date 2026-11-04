import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveTip } from '../../contexts/LiveTipContext';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { DollarSign, Target, Star, Gift, Sparkles } from 'lucide-react';

interface LiveTipAnimationsProps {
  sessionId: string;
}

export function LiveTipAnimations({ sessionId }: LiveTipAnimationsProps) {
  const { activeAnimations, clearAnimation } = useLiveTip();

  const getAnimationConfig = (type: string) => {
    switch (type) {
      case 'milestone':
        return {
          initial: { scale: 0, rotate: -180, opacity: 0 },
          animate: { 
            scale: [0, 1.2, 1], 
            rotate: [180, 0], 
            opacity: 1,
            y: [0, -20, 0]
          },
          exit: { scale: 0, opacity: 0, y: -50 },
          transition: { duration: 0.8, ease: "easeOut" }
        };
      case 'super_chat':
        return {
          initial: { scale: 0, y: 50, opacity: 0 },
          animate: { 
            scale: [0, 1.1, 1], 
            y: [50, -10, 0], 
            opacity: 1 
          },
          exit: { scale: 0.8, opacity: 0, x: 300 },
          transition: { duration: 0.6, ease: "easeOut" }
        };
      case 'goal_complete':
        return {
          initial: { scale: 0, opacity: 0 },
          animate: { 
            scale: [0, 1.3, 1], 
            opacity: 1,
            rotate: [0, 360]
          },
          exit: { scale: 0, opacity: 0, y: -100 },
          transition: { duration: 1.0, ease: "easeOut" }
        };
      default:
        return {
          initial: { scale: 0, x: -50, opacity: 0 },
          animate: { scale: 1, x: 0, opacity: 1 },
          exit: { scale: 0.8, opacity: 0, x: 100 },
          transition: { duration: 0.4, ease: "easeOut" }
        };
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence>
        {activeAnimations.map((animation, index) => {
          const config = getAnimationConfig(animation.animationType);
          const { tip } = animation;
          
          if (animation.animationType === 'goal_complete') {
            return (
              <motion.div
                key={animation.id}
                className="absolute inset-0 flex items-center justify-center"
                {...config}
              >
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-8 rounded-2xl shadow-2xl border-4 border-yellow-400 text-center max-w-md">
                  <div className="flex items-center justify-center mb-4">
                    <Target className="w-12 h-12 mr-3" />
                    <Sparkles className="w-8 h-8 text-yellow-300" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">🎯 GOAL COMPLETED!</h3>
                  <p className="text-lg opacity-90">
                    Thanks to ${tip.amount} from {tip.userName}!
                  </p>
                  <div className="mt-4 flex items-center justify-center">
                    <div className="animate-bounce">🎉</div>
                    <div className="animate-bounce delay-100">🎊</div>
                    <div className="animate-bounce delay-200">✨</div>
                  </div>
                </div>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={animation.id}
              className={`absolute ${
                animation.animationType === 'milestone' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
                animation.animationType === 'super_chat' ? 'top-20 right-4' :
                'top-4 right-4'
              }`}
              style={{ zIndex: 1000 + index }}
              {...config}
            >
              <div className={`
                rounded-2xl p-4 shadow-2xl backdrop-blur-sm
                ${animation.animationType === 'milestone' ? 
                  'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-4 border-yellow-400' :
                  animation.animationType === 'super_chat' ?
                  'bg-gradient-to-r from-yellow-500 to-orange-500 text-black border-2 border-yellow-300' :
                  'bg-card/90 border border-border'
                }
              `}>
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  {!tip.isAnonymous && tip.userAvatar && (
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={tip.userAvatar} alt={tip.userName} />
                      <AvatarFallback>{tip.userName.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm">
                        {tip.isAnonymous ? 'Anonymous' : tip.userName}
                      </span>
                      <Badge className={`
                        ${animation.animationType === 'milestone' ? 'bg-yellow-400 text-black' :
                          animation.animationType === 'super_chat' ? 'bg-red-500 text-white' :
                          'bg-green-500 text-white'
                        }
                      `}>
                        <DollarSign className="w-3 h-3 mr-1" />
                        ${tip.amount}
                      </Badge>
                      
                      {animation.animationType === 'milestone' && (
                        <Star className="w-4 h-4 text-yellow-300 animate-pulse" />
                      )}
                      
                      {animation.animationType === 'super_chat' && (
                        <Sparkles className="w-4 h-4 text-red-300 animate-pulse" />
                      )}
                    </div>
                    
                    {tip.message && (
                      <p className={`text-sm ${
                        animation.animationType === 'milestone' ? 'text-yellow-100' :
                        animation.animationType === 'super_chat' ? 'text-black/80' :
                        'text-muted-foreground'
                      } line-clamp-2`}>
                        "{tip.message}"
                      </p>
                    )}
                  </div>
                  
                  {/* Tip type icon */}
                  <div className="flex-shrink-0">
                    {animation.animationType === 'milestone' ? (
                      <div className="animate-spin-slow">🌟</div>
                    ) : animation.animationType === 'super_chat' ? (
                      <div className="animate-bounce">⭐</div>
                    ) : (
                      <Gift className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </div>
                
                {/* Special effects */}
                {animation.animationType === 'milestone' && (
                  <div className="absolute -inset-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl opacity-20 animate-pulse -z-10" />
                )}
                
                {animation.animationType === 'super_chat' && (
                  <div className="absolute -top-1 -right-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// Floating tip particles for ambient effects
export function TipParticles({ sessionId }: { sessionId: string }) {
  const { tips } = useLiveTip();
  const [particles, setParticles] = useState<Array<{ id: string; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    const sessionTips = tips.filter(tip => tip.sessionId === sessionId);
    const recentTips = sessionTips.slice(0, 3);
    
    if (recentTips.length > 0) {
      const newParticles = Array.from({ length: 8 }, (_, i) => ({
        id: `particle-${Date.now()}-${i}`,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        delay: i * 200
      }));
      
      setParticles(newParticles);
      
      // Clear particles after animation
      setTimeout(() => setParticles([]), 3000);
    }
  }, [tips, sessionId]);

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 bg-yellow-400 rounded-full"
            style={{
              left: particle.x,
              top: particle.y,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
              y: [0, -100],
              x: [0, Math.random() * 40 - 20]
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2,
              delay: particle.delay / 1000,
              ease: "easeOut"
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}