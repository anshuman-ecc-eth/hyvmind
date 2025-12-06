import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Network } from 'lucide-react';

export default function CreateView() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();

  const isAuthenticated = !!identity;

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/' });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-background text-foreground">
        <div className="container py-8 max-w-4xl">
          <section className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-light tracking-wide mb-2 text-foreground">
              Create
            </h1>
            <p className="text-muted-foreground">
              Use the floating action buttons to create notebooks and triples
            </p>
          </section>

          <div className="space-y-6">
            {/* Create Notebook Info Card */}
            <Card className="bg-white dark:bg-gray-950 border-2 shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Create Notebook</CardTitle>
                    <CardDescription>
                      A notebook is a collection of triples. Use the floating action button in the bottom-right corner to create a new notebook.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => navigate({ to: '/dashboard' })}
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              </CardContent>
            </Card>

            {/* Create Triple Info Card */}
            <Card className="bg-white dark:bg-gray-950 border-2 shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Network className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Create Triple</CardTitle>
                    <CardDescription>
                      Add semantic triples in the format: entity1 → relation → entity2. Use the floating action button in the bottom-right corner to create a new triple.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => navigate({ to: '/dashboard' })}
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              </CardContent>
            </Card>

            <div className="text-center text-sm text-muted-foreground mt-8">
              <p>Look for the circular "+" buttons in the bottom-right corner of any page.</p>
              <p className="mt-2">These floating action buttons are available throughout the application for quick access to creation features.</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
