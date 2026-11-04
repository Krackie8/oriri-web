import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Shield, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Crown,
  Mail,
  Calendar,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { supabase } from '../../utils/supabase/client';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isCreator: boolean;
  createdAt: string;
  lastSignIn?: string;
}

export default function AdminManagement() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New Admin Form
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Promote User Form
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [promoteEmail, setPromoteEmail] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);

  // Revoke Access
  const [isRevoking, setIsRevoking] = useState<string | null>(null);

  // Load admins on mount
  useEffect(() => {
    loadAdmins();
  }, []);

  const getAccessToken = async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No active session');
    }
    return session.access_token;
  };

  const loadAdmins = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const accessToken = await getAccessToken();
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/list-admins`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load admins');
      }

      const data = await response.json();
      setAdmins(data.admins || []);
      setAllUsers(data.allUsers || []);
    } catch (err) {
      console.error('Error loading admins:', err);
      setError(err instanceof Error ? err.message : 'Failed to load admins');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const accessToken = await getAccessToken();

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/create-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            email: newAdminEmail,
            password: newAdminPassword,
            name: newAdminName
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create admin');
      }

      setSuccessMessage(`Admin account created successfully for ${newAdminEmail}`);
      setShowCreateDialog(false);
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminName('');
      loadAdmins(); // Reload the list
    } catch (err) {
      console.error('Error creating admin:', err);
      setError(err instanceof Error ? err.message : 'Failed to create admin');
    } finally {
      setIsCreating(false);
    }
  };

  const handlePromoteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPromoting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const accessToken = await getAccessToken();

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/promote-to-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            email: promoteEmail
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to promote user');
      }

      setSuccessMessage(`Successfully promoted ${promoteEmail} to admin`);
      setShowPromoteDialog(false);
      setPromoteEmail('');
      loadAdmins(); // Reload the list
    } catch (err) {
      console.error('Error promoting user:', err);
      setError(err instanceof Error ? err.message : 'Failed to promote user');
    } finally {
      setIsPromoting(false);
    }
  };

  const handleRevokeAccess = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to revoke admin access for ${userEmail}?`)) {
      return;
    }

    setIsRevoking(userId);
    setError(null);
    setSuccessMessage(null);

    try {
      const accessToken = await getAccessToken();

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/revoke-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            userId
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke access');
      }

      setSuccessMessage(`Successfully revoked admin access for ${userEmail}`);
      loadAdmins(); // Reload the list
    } catch (err) {
      console.error('Error revoking access:', err);
      setError(err instanceof Error ? err.message : 'Failed to revoke access');
    } finally {
      setIsRevoking(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Admin Management</h2>
          <p className="text-muted-foreground">Manage admin users and permissions</p>
        </div>
        <Button onClick={loadAdmins} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert className="bg-green-500/10 border-green-500/50">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-500 ml-2">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Create New Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Admin Account</DialogTitle>
              <DialogDescription>
                Create a new user account with admin privileges
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newAdminEmail">Email Address</Label>
                <Input
                  id="newAdminEmail"
                  type="email"
                  placeholder="admin@example.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newAdminPassword">Password</Label>
                <Input
                  id="newAdminPassword"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newAdminName">Full Name</Label>
                <Input
                  id="newAdminName"
                  type="text"
                  placeholder="Admin Name"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  required
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Admin
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <UserCheck className="h-4 w-4 mr-2" />
              Promote Existing User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Promote User to Admin</DialogTitle>
              <DialogDescription>
                Give an existing registered user admin privileges
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePromoteUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="promoteEmail">User Email</Label>
                <Input
                  id="promoteEmail"
                  type="email"
                  placeholder="user@example.com"
                  value={promoteEmail}
                  onChange={(e) => setPromoteEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  User must already have an account on the platform
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPromoteDialog(false)}
                  disabled={isPromoting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPromoting}>
                  {isPromoting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Promote to Admin
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Admin List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Current Admins
          </CardTitle>
          <CardDescription>
            {admins.length} admin user{admins.length !== 1 ? 's' : ''} with full access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading admins...</span>
            </div>
          ) : admins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No admin users found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50 hover:bg-card/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {admin.isCreator ? (
                        <Crown className="h-5 w-5 text-primary" />
                      ) : (
                        <Shield className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{admin.name}</p>
                        {admin.isCreator && (
                          <Badge variant="default" className="text-xs">
                            Creator
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {admin.role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {admin.email}
                        </span>
                        {admin.lastSignIn && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Last login: {new Date(admin.lastSignIn).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    {!admin.isCreator && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeAccess(admin.id, admin.email)}
                        disabled={isRevoking === admin.id}
                      >
                        {isRevoking === admin.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserX className="h-4 w-4 mr-2" />
                            Revoke Access
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Users (for reference) */}
      {allUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              All Registered Users
            </CardTitle>
            <CardDescription>
              {allUsers.length} total user{allUsers.length !== 1 ? 's' : ''} on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded border border-border/50 text-sm"
                >
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
