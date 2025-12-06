import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useGetCallerUserProfile, useSaveCallerUserProfile } from '../hooks/useQueries';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, User } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ProfilePage() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const isAuthenticated = !!identity;

  const { data: userProfile, isLoading: profileLoading, error: profileError, isFetched } = useGetCallerUserProfile();
  const saveProfileMutation = useSaveCallerUserProfile();

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/' });
    }
  }, [isAuthenticated, navigate]);

  // Initialize name from profile
  useEffect(() => {
    if (userProfile && userProfile.name) {
      setName(userProfile.name);
    }
  }, [userProfile]);

  // Show editing mode if profile has no name
  useEffect(() => {
    if (isFetched && userProfile && !userProfile.name) {
      setIsEditing(true);
    }
  }, [isFetched, userProfile]);

  const handleSave = async () => {
    if (!userProfile || !name.trim()) return;

    await saveProfileMutation.mutateAsync({
      ...userProfile,
      name: name.trim(),
    });

    setIsEditing(false);
  };

  if (!isAuthenticated) {
    return null;
  }

  if (profileLoading) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-background">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-foreground/20 border-t-foreground mx-auto" />
              <p className="text-muted-foreground">Loading profile...</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (profileError) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-background">
          <div className="container py-8 max-w-4xl">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load profile: {profileError.message}
              </AlertDescription>
            </Alert>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-4xl">
          <section className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-light tracking-wide mb-2 text-foreground">
              Profile
            </h1>
            <p className="text-muted-foreground">
              Manage your account information
            </p>
          </section>

          <Card className="bg-card text-card-foreground">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">User Profile</CardTitle>
                  <CardDescription>Your personal information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                {isEditing ? (
                  <div className="space-y-4">
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="max-w-md"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSave}
                        disabled={!name.trim() || saveProfileMutation.isPending}
                      >
                        {saveProfileMutation.isPending ? 'Saving...' : 'Save'}
                      </Button>
                      {userProfile?.name && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setName(userProfile.name);
                            setIsEditing(false);
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <p className="text-lg">{name || 'Not set'}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Principal ID</Label>
                <p className="text-sm text-muted-foreground font-mono break-all">
                  {identity?.getPrincipal().toString()}
                </p>
              </div>

              {userProfile && (
                <div className="space-y-2">
                  <Label>Member Since</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(Number(userProfile.createdAt) / 1000000).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
