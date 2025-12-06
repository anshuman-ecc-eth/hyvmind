import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FloatingActionButtons from '../components/FloatingActionButtons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, Plus, Info } from 'lucide-react';
import { useGetCallerAnnotations, useGetCallerLocations } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';

export default function OntologyBuilderView() {
  const { identity } = useInternetIdentity();
  const { data: callerAnnotations = [], isLoading: annotationsLoading } = useGetCallerAnnotations();
  const { data: callerLocations = [], isLoading: locationsLoading } = useGetCallerLocations();

  const isAuthenticated = !!identity;
  const isLoading = annotationsLoading || locationsLoading;

  // Extract unique tokens from annotations
  const tokenAssets = Array.from(
    new Set(callerAnnotations.flatMap(a => a.extractedTokens))
  ).map((name, index) => ({
    id: `token-${index}`,
    name: String(name),
    type: 'token',
    createdAt: new Date().toISOString(),
    isPublic: false
  }));

  // Extract location assets from locations
  const locationAssets = callerLocations.map(loc => ({
    id: `location-${loc.id.toString()}`,
    name: String(loc.title),
    type: 'location',
    createdAt: new Date(Number(loc.createdAt) / 1000000).toISOString(),
    isPublic: false
  }));

  // Extract unique property keys and values from annotations
  const propertyKeyAssets = Array.from(
    new Set(callerAnnotations.flatMap(a => a.properties.map(([key]) => key)))
  ).map((name, index) => ({
    id: `propkey-${index}`,
    name: String(name),
    type: 'propertyKey',
    createdAt: new Date().toISOString(),
    isPublic: false
  }));

  const propertyValueAssets = Array.from(
    new Set(callerAnnotations.flatMap(a => a.properties.map(([, value]) => value)))
  ).map((name, index) => ({
    id: `propvalue-${index}`,
    name: String(name),
    type: 'propertyValue',
    createdAt: new Date().toISOString(),
    isPublic: false
  }));

  // Placeholder for frames (will be implemented when backend supports it)
  const frameAssets: any[] = [];

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Please log in to access the Ontology Builder</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Ontology Builder</h1>
        </div>

        <Alert className="mb-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Token-based ontology system active!</strong> All bracketed sequences from your annotations are automatically extracted and displayed as reusable token assets.
          </AlertDescription>
        </Alert>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* My Tokens Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">My Tokens</CardTitle>
                <CardDescription className="text-sm">
                  Token assets extracted from your annotations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tokenAssets.length === 0 ? (
                  <div className="text-sm text-muted-foreground bg-muted/30 p-6 rounded-md border border-dashed text-center">
                    No token assets yet. Create annotations with bracketed tokens to generate token assets automatically.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {tokenAssets.map(asset => (
                      <div
                        key={asset.id}
                        className="border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">{asset.name}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(asset.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {asset.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" disabled>
                            {asset.isPublic ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Locations Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">My Locations</CardTitle>
                <CardDescription className="text-sm">
                  Location assets created from your locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {locationAssets.length === 0 ? (
                  <div className="text-sm text-muted-foreground bg-muted/30 p-6 rounded-md border border-dashed text-center">
                    No location assets yet. Create locations to generate location assets automatically.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {locationAssets.map(asset => (
                      <div
                        key={asset.id}
                        className="border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">{asset.name}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(asset.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {asset.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" disabled>
                            {asset.isPublic ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Properties Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">My Properties</CardTitle>
                <CardDescription className="text-sm">
                  Property key and value assets created from your annotations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {propertyKeyAssets.length === 0 && propertyValueAssets.length === 0 ? (
                  <div className="text-sm text-muted-foreground bg-muted/30 p-6 rounded-md border border-dashed text-center">
                    No property assets yet. Add properties to annotations to generate property assets automatically.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {propertyKeyAssets.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">Property Keys</h4>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {propertyKeyAssets.map(asset => (
                            <div
                              key={asset.id}
                              className="border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-sm truncate">{asset.name}</h3>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(asset.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <Badge variant="outline" className="ml-2 text-xs">
                                  key
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-3">
                                <Button variant="ghost" size="sm" className="h-7 text-xs" disabled>
                                  {asset.isPublic ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {propertyValueAssets.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">Property Values</h4>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {propertyValueAssets.map(asset => (
                            <div
                              key={asset.id}
                              className="border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-sm truncate">{asset.name}</h3>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(asset.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <Badge variant="outline" className="ml-2 text-xs">
                                  value
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-3">
                                <Button variant="ghost" size="sm" className="h-7 text-xs" disabled>
                                  {asset.isPublic ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Frames Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">My Frames</CardTitle>
                <CardDescription className="text-sm">
                  Structured knowledge frameworks composed from your assets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground bg-muted/30 p-6 rounded-md border border-dashed text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Plus className="h-4 w-4" />
                    <span className="font-medium">Frame creation coming soon</span>
                  </div>
                  <p className="text-xs">
                    Frame functionality will be available once the backend implements the Frame type and management operations.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <Footer />
      <FloatingActionButtons />
    </div>
  );
}
