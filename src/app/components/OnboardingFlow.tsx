import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Heart, Users, Crown, ShoppingBag, Coffee } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: Play,
      title: "Welcome to Oriri",
      description: "Your exclusive podcast experience with unique content and community features.",
      gradient: "from-purple-500/20 to-pink-500/20"
    },
    {
      icon: Heart,
      title: "Listen & Engage",
      description: "Enjoy free episodes from Spotify, Apple Podcasts, and YouTube. Like, comment, and share your favorites.",
      gradient: "from-pink-500/20 to-rose-500/20"
    },
    {
      icon: Crown,
      title: "VIP Exclusive Content",
      description: "Subscribe to access exclusive episodes uploaded directly to Oriri, available only to VIP members.",
      gradient: "from-yellow-500/20 to-amber-500/20"
    },
    {
      icon: Users,
      title: "Join the Community",
      description: "Connect with fellow listeners, participate in discussions, and be part of something special.",
      gradient: "from-blue-500/20 to-cyan-500/20"
    },
    {
      icon: Coffee,
      title: "Support the Creator",
      description: "Show appreciation through tips during live sessions or on your favorite episodes.",
      gradient: "from-green-500/20 to-emerald-500/20"
    },
    {
      icon: ShoppingBag,
      title: "Exclusive Merchandise",
      description: "Browse and purchase unique merchandise from the Oriri store.",
      gradient: "from-indigo-500/20 to-purple-500/20"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="w-full max-w-md bg-background/95 backdrop-blur-xl border-primary/20 shadow-2xl overflow-hidden">
          {/* Progress indicators */}
          <div className="flex justify-between items-center p-6 pb-4">
            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <motion.div
                  key={index}
                  initial={false}
                  animate={{
                    width: index === currentStep ? 24 : 8,
                    backgroundColor: index <= currentStep 
                      ? 'hsl(var(--primary))' 
                      : 'hsl(var(--muted))'
                  }}
                  transition={{ duration: 0.3 }}
                  className="h-2 rounded-full"
                />
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="text-muted-foreground hover:text-foreground"
            >
              Skip
            </Button>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Icon with gradient background */}
                <div className="relative">
                  <div className={`w-20 h-20 bg-gradient-to-br ${currentStepData.gradient} rounded-2xl flex items-center justify-center mx-auto backdrop-blur-sm border border-primary/10`}>
                    <Icon className="w-10 h-10 text-primary" />
                  </div>
                </div>
                
                {/* Text content */}
                <div className="space-y-3 text-center min-h-[120px] flex flex-col justify-center">
                  <h2 className="text-2xl font-semibold tracking-tight">{currentStepData.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {currentStepData.description}
                  </p>
                </div>

                {/* Navigation buttons */}
                <div className="flex gap-3 pt-2">
                  {currentStep > 0 && (
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      className="flex-1"
                    >
                      Back
                    </Button>
                  )}
                  <Button
                    onClick={handleNext}
                    className={`${currentStep === 0 ? 'w-full' : 'flex-1'} font-medium`}
                  >
                    {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default OnboardingFlow;