import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FloatingActionButtons from '../components/FloatingActionButtons';
import D3GraphCanvas from '../components/D3GraphCanvas';
import { Button } from '@/components/ui/button';
import { Filter, X, Palette } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  useGetAllTokens,
  useGetAllJurisdictions, 
  useGetAllPropertiesKeys, 
  useGetAllPropertiesValues,
  useGetCallerAnnotations,
  useGetAllLocations,
  type AnnotationFilter
} from '../hooks/useQueries';
import { useQuery } from '@tanstack/react-query';
import { useActor } from '../hooks/useActor';
import type { Swarm } from '../backend';

export type GraphTheme = 'neutral' | 'warm' | 'cool';

export default function GraphView() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const { theme: appTheme } = useTheme();
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;

  const isAuthenticated = !!identity;

  const [annotationFilters, setAnnotationFilters] = useState<AnnotationFilter[]>([]);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string | null>(null);
  const [selectedPropertyKey, setSelectedPropertyKey] = useState<string | null>(null);
  const [selectedPropertyValue, setSelectedPropertyValue] = useState<string | null>(null);
  const [graphTheme, setGraphTheme] = useState<GraphTheme>('neutral');

  // Fetch data for graph
  const { data: swarms = [] } = useQuery<Swarm[]>({
    queryKey: ['publicSwarms'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPublicSwarms();
    },
    enabled: isReady,
  });

  const { data: annotations = [] } = useGetCallerAnnotations();
  const { data: locations = [] } = useGetAllLocations();

  // Fetch available tokens, jurisdictions, and properties
  const { data: tokens = [], isLoading: isLoadingTokens } = useGetAllTokens();
  const { data: jurisdictions = [], isLoading: isLoadingJurisdictions } = useGetAllJurisdictions();
  const { data: propertiesKeys = [], isLoading: isLoadingPropertiesKeys } = useGetAllPropertiesKeys();
  const { data: propertiesValues = [], isLoading: isLoadingPropertiesValues } = useGetAllPropertiesValues();

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/' });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  const handleAddFilter = () => {
    if (selectedToken || selectedJurisdiction || selectedPropertyKey || selectedPropertyValue) {
      const newFilter: AnnotationFilter = {
        tokens: selectedToken ? [selectedToken] : undefined,
        jurisdiction: selectedJurisdiction || undefined,
        propertyKey: selectedPropertyKey || undefined,
        propertyValue: selectedPropertyValue || undefined,
      };
      setAnnotationFilters([...annotationFilters, newFilter]);
      setSelectedToken(null);
      setSelectedJurisdiction(null);
      setSelectedPropertyKey(null);
      setSelectedPropertyValue(null);
    }
  };

  const handleRemoveFilter = (index: number) => {
    setAnnotationFilters(annotationFilters.filter((_, i) => i !== index));
  };

  const handleClearFilters = () => {
    setAnnotationFilters([]);
    setSelectedToken(null);
    setSelectedJurisdiction(null);
    setSelectedPropertyKey(null);
    setSelectedPropertyValue(null);
  };

  const handleSwarmClick = (swarmId: string) => {
    navigate({ to: '/swarm/$swarmId', params: { swarmId } });
  };

  const totalActiveFilters = annotationFilters.length;

  const isLoadingFilters = isLoadingTokens || isLoadingJurisdictions || isLoadingPropertiesKeys || isLoadingPropertiesValues;
  const hasNoData = tokens.length === 0 && jurisdictions.length === 0 && propertiesKeys.length === 0 && propertiesValues.length === 0;

  return (
    <>
      <Header />
      <main className="flex-1 bg-background text-foreground">
        <div className="container py-8 max-w-7xl">
          <section className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-light tracking-wide mb-2 text-foreground">
              Graph
            </h1>
            <p className="text-muted-foreground">
              Visualize the research network
            </p>
          </section>

          <div className="mb-4 flex justify-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Palette className="mr-2 h-4 w-4" />
                  Theme: {graphTheme.charAt(0).toUpperCase() + graphTheme.slice(1)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white dark:bg-gray-950">
                <DropdownMenuItem onClick={() => setGraphTheme('neutral')}>
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                    Neutral (Grays & Gold)
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGraphTheme('warm')}>
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    Warm (Amber & Honey)
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGraphTheme('cool')}>
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-teal-500"></span>
                    Cool (Teal & Indigo)
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {totalActiveFilters > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                      {totalActiveFilters}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white dark:bg-gray-950 max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Filter Graph Nodes</DialogTitle>
                  <DialogDescription>
                    Filter annotations by tokens, jurisdictions, and properties
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {isLoadingFilters ? (
                    <div className="text-center text-muted-foreground py-8">
                      Loading filters...
                    </div>
                  ) : hasNoData ? (
                    <div className="text-center text-muted-foreground py-8">
                      No annotations found yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Annotation Filters</Label>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="token-filter" className="text-xs text-muted-foreground">
                              Token
                            </Label>
                            <Select
                              value={selectedToken || ''}
                              onValueChange={(value) => setSelectedToken(value)}
                            >
                              <SelectTrigger id="token-filter" className="bg-white dark:bg-gray-950">
                                <SelectValue placeholder="Select token" />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-gray-950">
                                {tokens.map((token) => (
                                  <SelectItem key={token} value={token}>
                                    {token}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="jurisdiction-filter" className="text-xs text-muted-foreground">
                              Jurisdiction
                            </Label>
                            <Select
                              value={selectedJurisdiction || ''}
                              onValueChange={(value) => setSelectedJurisdiction(value)}
                            >
                              <SelectTrigger id="jurisdiction-filter" className="bg-white dark:bg-gray-950">
                                <SelectValue placeholder="Select jurisdiction" />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-gray-950">
                                {jurisdictions.map((jurisdiction) => (
                                  <SelectItem key={jurisdiction} value={jurisdiction}>
                                    {jurisdiction}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="property-key-filter" className="text-xs text-muted-foreground">
                              Property Key
                            </Label>
                            <Select
                              value={selectedPropertyKey || ''}
                              onValueChange={(value) => setSelectedPropertyKey(value)}
                            >
                              <SelectTrigger id="property-key-filter" className="bg-white dark:bg-gray-950">
                                <SelectValue placeholder="Select property key" />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-gray-950">
                                {propertiesKeys.map((key) => (
                                  <SelectItem key={key} value={key}>
                                    {key}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1 col-span-2">
                            <Label htmlFor="property-value-filter" className="text-xs text-muted-foreground">
                              Property Value
                            </Label>
                            <Select
                              value={selectedPropertyValue || ''}
                              onValueChange={(value) => setSelectedPropertyValue(value)}
                            >
                              <SelectTrigger id="property-value-filter" className="bg-white dark:bg-gray-950">
                                <SelectValue placeholder="Select property value" />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-gray-950">
                                {propertiesValues.map((value) => (
                                  <SelectItem key={value} value={value}>
                                    {value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Button
                          type="button"
                          onClick={handleAddFilter}
                          size="sm"
                          disabled={!selectedToken && !selectedJurisdiction && !selectedPropertyKey && !selectedPropertyValue}
                          className="w-full"
                        >
                          Add Filter
                        </Button>

                        {annotationFilters.length > 0 && (
                          <div className="space-y-2 mt-3">
                            <Label className="text-xs text-muted-foreground">Active Filters</Label>
                            <div className="flex flex-wrap gap-2">
                              {annotationFilters.map((filter, index) => (
                                <div
                                  key={`filter-${index}`}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-md text-sm border border-primary/20"
                                >
                                  {filter.tokens && <span className="font-medium">Token: {filter.tokens[0]}</span>}
                                  {filter.tokens && (filter.jurisdiction || filter.propertyKey || filter.propertyValue) && <span>•</span>}
                                  {filter.jurisdiction && <span className="font-medium">Jurisdiction: {filter.jurisdiction}</span>}
                                  {filter.jurisdiction && (filter.propertyKey || filter.propertyValue) && <span>•</span>}
                                  {filter.propertyKey && <span className="font-medium">Key: {filter.propertyKey}</span>}
                                  {filter.propertyKey && filter.propertyValue && <span>•</span>}
                                  {filter.propertyValue && <span className="font-medium">Value: {filter.propertyValue}</span>}
                                  <button
                                    onClick={() => handleRemoveFilter(index)}
                                    className="ml-1 hover:text-destructive"
                                    aria-label="Remove filter"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={handleClearFilters}
                      className="flex-1"
                      disabled={annotationFilters.length === 0}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="relative flex gap-4">
            <div className="flex-1">
              <div className="w-full h-[600px] rounded-lg border border-border overflow-hidden bg-card">
                <D3GraphCanvas
                  swarms={swarms}
                  annotations={annotations}
                  locations={locations}
                  filters={annotationFilters}
                  theme={graphTheme}
                  appTheme={appTheme}
                  onSwarmClick={handleSwarmClick}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
      <FloatingActionButtons />
      <Footer />
    </>
  );
}
