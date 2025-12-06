import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetCallerUserProfile, useUpdateCallerUsername, useIsCallerAdmin, useResetAllData } from '../hooks/useQueries';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, User, Shield, Coins, Network, Home, AlertTriangle } from 'lucide-react';

interface AccountSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AccountSettingsDialog({ open, onOpenChange }: AccountSettingsDialogProps) {
  const { identity, clear } = useInternetIdentity();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isLoading: profileLoading } = useGetCallerUserProfile();
  const { data: isAdmin = false } = useIsCallerAdmin();
  const updateUsernameMutation = useUpdateCallerUsername();
  const resetDataMutation = useResetAllData();

  const [username, setUsername] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setUsername(profile.name || '');
    }
  }, [open, profile]);

  const handleSaveUsername = async () => {
    if (!username.trim()) return;
    
    try {
      await updateUsernameMutation.mutateAsync(username.trim());
      setIsEditingName(false);
    } catch (error) {
      console.error('Failed to update username:', error);
    }
  };

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
    localStorage.clear();
    sessionStorage.clear();
    onOpenChange(false);
    navigate({ to: '/' });
  };

  const handleResetData = async () => {
    try {
      await resetDataMutation.mutateAsync();
      await clear();
      queryClient.clear();
      localStorage.clear();
      sessionStorage.clear();
      onOpenChange(false);
      navigate({ to: '/' });
    } catch (error) {
      console.error('Failed to reset data:', error);
    }
  };

  const handleNavigateToDashboard = () => {
    onOpenChange(false);
    navigate({ to: '/dashboard' });
  };

  const approvedAnnotationIds = profile?.approvedAnnotationIds || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-gray-950 max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Account Settings</DialogTitle>
          <DialogDescription className="text-sm">
            Manage your profile, security, and preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="profile" className="space-y-4 m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Navigation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleNavigateToDashboard}
                    variant="outline"
                    className="w-full"
                  >
                    Go to Dashboard
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile Information
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Your personal information and identity
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profileLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-sm">Name</Label>
                        {isEditingName ? (
                          <div className="flex gap-2">
                            <Input
                              id="username"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              placeholder="Enter your name"
                              className="text-sm"
                            />
                            <Button
                              onClick={handleSaveUsername}
                              disabled={!username.trim() || updateUsernameMutation.isPending}
                              size="sm"
                            >
                              {updateUsernameMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Save'
                              )}
                            </Button>
                            <Button
                              onClick={() => {
                                setIsEditingName(false);
                                setUsername(profile?.name || '');
                              }}
                              variant="outline"
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{profile?.name || 'Not set'}</span>
                            <Button
                              onClick={() => setIsEditingName(true)}
                              variant="outline"
                              size="sm"
                            >
                              Edit Name
                            </Button>
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label className="text-sm">Principal ID</Label>
                        <div className="text-xs font-mono bg-muted p-2 rounded break-all">
                          {identity?.getPrincipal().toString()}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Member Since</Label>
                        <div className="text-sm text-muted-foreground">
                          {profile?.createdAt
                            ? new Date(Number(profile.createdAt) / 1000000).toLocaleDateString()
                            : 'Unknown'}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    Credits & Assets
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Your earned credits and approved annotations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profileLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="text-sm font-medium">Total Credits</span>
                        <Badge variant="secondary" className="text-base">
                          {profile?.credits.toFixed(1) || '0.0'}
                        </Badge>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label className="text-sm flex items-center gap-2">
                          <Network className="h-4 w-4" />
                          Approved Annotations ({approvedAnnotationIds.length})
                        </Label>
                        {approvedAnnotationIds.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">
                            No approved annotations yet
                          </p>
                        ) : (
                          <ScrollArea className="h-[200px] rounded-md border p-3">
                            <div className="space-y-2">
                              {approvedAnnotationIds.map((annotationId) => (
                                <div
                                  key={annotationId.toString()}
                                  className="text-xs p-2 rounded bg-muted/50 hover:bg-muted transition-colors"
                                >
                                  <div className="font-medium mb-1">
                                    Annotation ID: {annotationId.toString()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-4 m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Internet Identity
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Manage your authentication and security
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Authentication Status</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Authenticated</Badge>
                      <span className="text-xs text-muted-foreground">
                        via Internet Identity
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <Button
                    onClick={handleLogout}
                    variant="destructive"
                    className="w-full"
                  >
                    Logout
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {isAdmin && (
              <TabsContent value="admin" className="space-y-4 m-0">
                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      Admin Controls
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Dangerous operations - use with caution
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                          Reset All Data
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-white dark:bg-gray-950">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete all user profiles,
                            swarms, annotations, approvals, and locations from the system. You will be logged out
                            and all local storage will be cleared.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleResetData}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={resetDataMutation.isPending}
                          >
                            {resetDataMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Resetting...
                              </>
                            ) : (
                              'Reset All Data'
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
