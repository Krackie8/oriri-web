import { useAuth } from './useAuth';
import { useModals } from '../contexts/ModalContext';
import { toast } from 'sonner@2.0.3';

export const useAuthHandlers = () => {
  const { signIn, signOut } = useAuth();
  const { setShowLogin } = useModals();

  const handleLogin = async (email: string, password: string) => {
    console.log('[useAuthHandlers] handleLogin called with:', email);
    
    try {
      const { error } = await signIn(email, password);
      if (error) {
        console.error('[useAuthHandlers] Login error:', error.message);
        
        if (error.message === 'Invalid login credentials') {
          toast.error('Invalid email or password. Please check your credentials or create a new account.');
        } else if (error.message === 'Email not confirmed') {
          if (email === 'admin@oriri.com') {
            toast.error('Admin user setup incomplete. Please try again or contact support.');
          } else {
            toast.error('Please check your email and click the confirmation link before signing in.');
          }
        } else {
          toast.error(`Login failed: ${error.message}`);
        }
        
        throw error;
      }
      
      console.log('[useAuthHandlers] Login successful for:', email);
      setShowLogin(false);
      
      // Special message for admin login
      if (email === 'admin@oriri.com') {
        toast.success('Welcome back, Admin! 🛡️');
      } else {
        toast.success('Welcome back!');
      }
    } catch (error) {
      console.error('[useAuthHandlers] Login failed:', error);
    }
  };

  const handleGuestMode = () => {
    console.log('[useAuthHandlers] Guest mode activated');
    setShowLogin(false);
  };

  const handleLogout = async () => {
    try {
      console.log('[useAuthHandlers] Logging out...');
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('[useAuthHandlers] Logout failed:', error);
    }
  };

  return {
    handleLogin,
    handleGuestMode,
    handleLogout,
  };
};