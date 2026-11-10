import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { X, Eye, EyeOff, Mic, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner@2.0.3';
import { formSubmit } from '../wellness/analytics/track';
import { getUtm } from '../wellness/analytics/utm';
import { checkEmail } from '../utils/emailCheck';

interface LoginScreenProps {
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onGuestMode: () => void;
  /** Open on the sign-up form instead of log in. */
  initialSignUp?: boolean;
}

function friendlySignupError(message: string | undefined): string {
  if (!message || message === '{}' || message === '[object Object]' || message.trim() === '') {
    return 'Sign-up is temporarily unavailable. Please try again in a few minutes.';
  }
  const m = message.toLowerCase();
  if (m.includes('rate limit') || m.includes('too many') || m.includes('over_email_send_rate_limit')) {
    return 'Too many sign-up attempts. Please wait a few minutes and try again.';
  }
  if (m.includes('already registered') || m.includes('already exists') || m.includes('user_already_exists')) {
    return 'This email is already registered. Try logging in instead.';
  }
  if (m.includes('password') || m.includes('weak')) {
    return 'Password is too weak. Please use at least 8 characters.';
  }
  if (m.includes('invalid') && m.includes('email')) {
    return 'Please enter a valid email address.';
  }
  return message;
}

export default function LoginScreen({ onClose, onLogin, onGuestMode, initialSignUp = false }: LoginScreenProps) {
  const { signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(initialSignUp);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);
  // A typo warning the visitor has seen once: submitting the same address again accepts it
  const [warnedFor, setWarnedFor] = useState('');
  const [suggestion, setSuggestion] = useState('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    setSuggestion('');
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email.trim())) {
      newErrors.email = 'Invalid email address';
    } else if (isSignUp) {
      const c = checkEmail(email);
      if (!c.ok && !(c.suggestion && warnedFor === c.email)) {
        newErrors.email = c.suggestion ? `${c.error} Tap to fix, or continue if it's right.` : c.error || 'Please check your email address.';
        if (c.suggestion) {
          setSuggestion(c.suggestion);
          setWarnedFor(c.email);
        }
      }
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (isSignUp && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setLoading(true);
      try {
        if (isSignUp) {
          // Handle signup
          console.log('Attempting signup for:', email);
          const { data, error } = await signUp(email.trim().toLowerCase(), password);
          if (error) {
            console.error('Signup error:', error);
            toast.error(friendlySignupError(error.message));
            return;
          }
          console.log('Signup successful:', data);
          formSubmit('signup', getUtm());
          toast.success('Account created! Please check your email to verify your address.');
          setIsSignUp(false);
          setPassword('');
          setConfirmPassword('');
        } else {
          // Handle login
          console.log('Attempting login for:', email);
          await onLogin(email.trim().toLowerCase(), password);
        }
      } catch (error) {
        console.error('Auth failed:', error);
        // Error handling is already done in onLogin
      } finally {
        setLoading(false);
      }
    }
  };


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl">
            {isSignUp ? 'Join Oriri' : 'Welcome Back'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Illustration */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Mic className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Signup Info */}
        {isSignUp && (
          <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="text-sm text-blue-400 text-center">
              Create your account to access all Oriri features
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campaign source, carried into the sign-up */}
          <input type="hidden" name="utm_source" value={getUtm().utm_source || ''} />
          <input type="hidden" name="utm_medium" value={getUtm().utm_medium || ''} />
          <input type="hidden" name="utm_campaign" value={getUtm().utm_campaign || ''} />
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-destructive text-sm mt-1">{errors.email}</p>
            )}
            {suggestion && errors.email && (
              <button
                type="button"
                className="mt-1 text-sm underline underline-offset-4"
                onClick={() => {
                  setEmail(suggestion);
                  setSuggestion('');
                  setErrors((e) => ({ ...e, email: '' }));
                }}
              >
                Use {suggestion}
              </button>
            )}
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-destructive text-sm mt-1">{errors.password}</p>
            )}
          </div>

          {isSignUp && (
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className={errors.confirmPassword ? 'border-destructive' : ''}
              />
              {errors.confirmPassword && (
                <p className="text-destructive text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isSignUp ? 'Signing Up...' : 'Logging In...'}
              </>
            ) : (
              isSignUp ? 'Sign Up' : 'Log In'
            )}
          </Button>
        </form>

        {/* Toggle Sign Up/Log In */}
        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm"
          >
            {isSignUp 
              ? 'Already have an account? Log in' 
              : "Don't have an account? Sign up"
            }
          </Button>
        </div>

        {/* Forgot Password */}
        {!isSignUp && (
          <div className="text-center">
            <Button variant="ghost" className="text-sm text-muted-foreground">
              Forgot Password?
            </Button>
          </div>
        )}

        {/* Guest Mode - More Prominent */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-card px-2 text-muted-foreground">Having trouble?</span>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <Button
              onClick={onGuestMode}
              variant="outline"
              className="w-full"
            >
              Continue as Guest
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Explore Oriri without creating an account
            </p>
          </div>
        </div>

        {/* Terms */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          By signing up, you agree to our{' '}
          <a href="#" className="text-primary hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-primary hover:underline">Privacy Policy</a>
        </p>
      </motion.div>
    </motion.div>
  );
}