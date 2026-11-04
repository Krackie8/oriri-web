import React, { forwardRef } from 'react';
import { Button, ButtonProps } from './button';
import { Loader2 } from 'lucide-react';
import { useTouchFeedback, MobileInteractions } from '../../utils/mobileInteractions';
import { cn } from './utils';

interface TouchButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  hapticFeedback?: 'light' | 'medium' | 'strong' | 'none';
  touchScale?: boolean;
  minimumTouchTarget?: boolean;
}

export const TouchButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  ({ 
    children, 
    loading = false, 
    loadingText,
    hapticFeedback = 'light',
    touchScale = true,
    minimumTouchTarget = true,
    className,
    disabled,
    onClick,
    ...props 
  }, ref) => {
    const touchRef = useTouchFeedback(hapticFeedback === 'none' ? 'light' : hapticFeedback);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) return;
      
      // Provide haptic feedback
      if (hapticFeedback !== 'none') {
        switch (hapticFeedback) {
          case 'light':
            MobileInteractions.lightTap();
            break;
          case 'medium':
            MobileInteractions.mediumTap();
            break;
          case 'strong':
            MobileInteractions.strongTap();
            break;
        }
      }

      onClick?.(e);
    };

    const buttonRef = (node: HTMLButtonElement) => {
      if (ref) {
        if (typeof ref === 'function') {
          ref(node);
        } else {
          ref.current = node;
        }
      }
      if (touchScale && hapticFeedback !== 'none') {
        (touchRef as any).current = node;
      }
    };

    return (
      <Button
        ref={buttonRef}
        className={cn(
          // Base touch improvements
          'touch-manipulation select-none',
          // Minimum touch target size (44x44px recommended)
          minimumTouchTarget && 'min-h-[44px] min-w-[44px]',
          // Enhanced focus states for accessibility
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // Smooth transitions
          'transition-all duration-150 ease-out',
          // Touch scale effect (handled by CSS instead of JS for better performance)
          touchScale && 'active:scale-95',
          // Loading state
          loading && 'pointer-events-none',
          className
        )}
        disabled={disabled || loading}
        onClick={handleClick}
        {...props}
      >
        {loading ? (
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {loadingText && <span>{loadingText}</span>}
          </div>
        ) : (
          children
        )}
      </Button>
    );
  }
);

TouchButton.displayName = 'TouchButton';

// Specific button variants for common use cases
export const PlayButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  ({ hapticFeedback = 'medium', ...props }, ref) => (
    <TouchButton
      ref={ref}
      hapticFeedback={hapticFeedback}
      {...props}
    />
  )
);

export const ActionButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  ({ hapticFeedback = 'light', ...props }, ref) => (
    <TouchButton
      ref={ref}
      hapticFeedback={hapticFeedback}
      {...props}
    />
  )
);

export const DestructiveButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  ({ hapticFeedback = 'strong', variant = 'destructive', ...props }, ref) => (
    <TouchButton
      ref={ref}
      variant={variant}
      hapticFeedback={hapticFeedback}
      {...props}
    />
  )
);

PlayButton.displayName = 'PlayButton';
ActionButton.displayName = 'ActionButton';
DestructiveButton.displayName = 'DestructiveButton';