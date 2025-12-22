import { useState, useEffect } from 'react';
import { useActorState } from '../hooks/useActorState';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { 
  useGetGraphData, 
  useGetAllRelationDefinitions, 
  useRegisterRelationDefinition,
  useComposeRDF,
  useGetAllComposedRDFs,
  usePublishRDFListing,
  useGetAnnotationTokenWeights,
  useGetVerifiedAnnotations,
  useGetAnnotationAttributeKeys,
  useGetAnnotationAttributeValues,
  useGetVerifiedAnnotationsByAttribute
} from '../hooks/useQueries';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Loader2, BookOpen, Plus, Package, Coins, CheckCircle2, AlertCircle, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { NodeType } from '../backend';

export default function OntologyBuilderPanel() {
  const { isActorReady } = useActorState();
  const { identity } = useInternetIdentity();
  const { data: graphData, isLoading: graphLoading } = useGetGraphData();
  const { data: relationDefinitions, isLoading: relationsLoading } = useGetAllRelationDefinitions();
  const { data: composedRDFs, isLoading: composedRDFsLoading } = useGetAllComposedRDFs();
  const { data: verifiedAnnotations, isLoading: verifiedLoading } = useGetVerifiedAnnotations();
  const { data: attributeKeys, isLoading: attributeKeysLoading } = useGetAnnotationAttributeKeys();
  const registerRelationMutation = useRegisterRelationDefinition();
  const composeRDFMutation = useComposeRDF();
  const publishRDFMutation = usePublishRDFListing();

  const [showNewRelationDialog, setShowNewRelationDialog] = useState(false);
  const [newRelationName, setNewRelationName] = useState('');
  const [newRelationDescription, setNewRelationDescription] = useState('');

  // Attribute filtering state
  const [selectedAttributeKey, setSelectedAttributeKey] = useState<string>('');
  const [selectedAttributeValue, setSelectedAttributeValue] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<Array<{ key: string; value: string }>>([]);

  // RDF Composition state
  const [compositionSubjectId, setCompositionSubjectId] = useState<string>('');
  const [compositionPredicate, setCompositionPredicate] = useState<string>('');
  const [compositionObjectId, setCompositionObjectId] = useState<string>('');
  const [calculatedBasePrice, setCalculatedBasePrice] = useState<bigint>(0n);

  // Publishing state
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [selectedCompositionId, setSelectedCompositionId] = useState<string>('');
  const [publishInstances, setPublishInstances] = useState<string>('1');
  const [publishPrice, setPublishPrice] = useState<string>('');

  // Get attribute values for selected key
  const { data: attributeValues, isLoading: attributeValuesLoading } = useGetAnnotationAttributeValues(selectedAttributeKey);

  // Get filtered annotations based on active filters
  const { data: filteredAnnotations, isLoading: filteredLoading } = useGetVerifiedAnnotationsByAttribute(
    activeFilters.length > 0 ? activeFilters[0].key : '',
    activeFilters.length > 0 ? activeFilters[0].value : ''
  );

  // Use filtered annotations if filters are active, otherwise use all verified annotations
  const displayedAnnotations = activeFilters.length > 0 ? (filteredAnnotations || []) : (verifiedAnnotations || []);

  // Get all relation definitions for predicates
  const predicates = relationDefinitions || [];

  // Calculate base price when subject or object changes
  useEffect(() => {
    const calculatePrice = async () => {
      if (!compositionSubjectId || !compositionObjectId) {
        setCalculatedBasePrice(0n);
        return;
      }

      try {
        // In a real implementation, this would call the backend to calculate the price
        // For now, we'll use a placeholder calculation
        const subjectWeights = 100n; // Placeholder
        const objectWeights = 100n; // Placeholder
        setCalculatedBasePrice(subjectWeights + objectWeights);
      } catch (error) {
        console.error('Failed to calculate base price:', error);
        setCalculatedBasePrice(0n);
      }
    };

    calculatePrice();
  }, [compositionSubjectId, compositionObjectId]);

  const handleCreateNewRelation = async () => {
    if (!newRelationName.trim()) {
      toast.error('Missing Name', {
        description: 'Please provide a name for the new relation.',
      });
      return;
    }

    try {
      await registerRelationMutation.mutateAsync({
        name: newRelationName.trim(),
        description: newRelationDescription.trim(),
      });

      toast.success('Relation Created', {
        description: `New relation "${newRelationName}" has been registered.`,
      });

      setCompositionPredicate(newRelationName.trim());
      setNewRelationName('');
      setNewRelationDescription('');
      setShowNewRelationDialog(false);
    } catch (error: any) {
      toast.error('Failed to Create Relation', {
        description: error.message || 'An error occurred while creating the relation.',
      });
    }
  };

  const handleCompositionPredicateChange = (value: string) => {
    if (value === '__create_new__') {
      setShowNewRelationDialog(true);
    } else {
      setCompositionPredicate(value);
    }
  };

  const handleAddFilter = () => {
    if (!selectedAttributeKey || !selectedAttributeValue) {
      toast.error('Missing Filter Criteria', {
        description: 'Please select both an attribute key and value.',
      });
      return;
    }

    // Check if filter already exists
    const filterExists = activeFilters.some(
      f => f.key === selectedAttributeKey && f.value === selectedAttributeValue
    );

    if (filterExists) {
      toast.error('Filter Already Active', {
        description: 'This filter is already applied.',
      });
      return;
    }

    // For now, support only one filter at a time (can be extended to multiple)
    setActiveFilters([{ key: selectedAttributeKey, value: selectedAttributeValue }]);
    setSelectedAttributeKey('');
    setSelectedAttributeValue('');
    
    toast.success('Filter Applied', {
      description: `Showing annotations with ${selectedAttributeKey} = ${selectedAttributeValue}`,
    });
  };

  const handleRemoveFilter = (index: number) => {
    const newFilters = activeFilters.filter((_, i) => i !== index);
    setActiveFilters(newFilters);
    
    toast.success('Filter Removed', {
      description: 'Filter has been removed.',
    });
  };

  const handleResetFilters = () => {
    setActiveFilters([]);
    setSelectedAttributeKey('');
    setSelectedAttributeValue('');
    
    toast.success('Filters Reset', {
      description: 'All filters have been cleared.',
    });
  };

  const handleComposeRDF = async () => {
    if (!compositionSubjectId || !compositionPredicate || !compositionObjectId) {
      toast.error('Missing Fields', {
        description: 'Please select subject, predicate, and object annotations.',
      });
      return;
    }

    try {
      const compositionId = await composeRDFMutation.mutateAsync({
        subjectId: BigInt(compositionSubjectId),
        predicate: compositionPredicate,
        objectId: BigInt(compositionObjectId),
      });

      toast.success('Level 1 RDF Composed', {
        description: `RDF composition created with ID: ${compositionId}`,
      });

      // Reset form
      setCompositionSubjectId('');
      setCompositionPredicate('');
      setCompositionObjectId('');
      setCalculatedBasePrice(0n);
    } catch (error: any) {
      toast.error('Failed to Compose RDF', {
        description: error.message || 'An error occurred while composing the RDF.',
      });
    }
  };

  const handlePublishRDF = async () => {
    if (!selectedCompositionId || !publishInstances || !publishPrice) {
      toast.error('Missing Fields', {
        description: 'Please fill in all fields.',
      });
      return;
    }

    const instances = parseInt(publishInstances);
    const price = parseInt(publishPrice);

    if (instances <= 0 || price <= 0) {
      toast.error('Invalid Values', {
        description: 'Instances and price must be greater than zero.',
      });
      return;
    }

    try {
      const listingId = await publishRDFMutation.mutateAsync({
        compositionId: BigInt(selectedCompositionId),
        instances: BigInt(instances),
        price: BigInt(price),
      });

      toast.success('RDF Published', {
        description: `RDF listing created with ID: ${listingId}. Common Pool has been updated.`,
      });

      setShowPublishDialog(false);
      setSelectedCompositionId('');
      setPublishInstances('1');
      setPublishPrice('');
    } catch (error: any) {
      toast.error('Failed to Publish RDF', {
        description: error.message || 'An error occurred while publishing the RDF.',
      });
    }
  };

  if (!isActorReady) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Connecting to network...</p>
        </div>
      </div>
    );
  }

  if (graphLoading || relationsLoading || composedRDFsLoading || verifiedLoading || attributeKeysLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading ontology data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" />
              Ontology Builder
            </h2>
            <p className="text-muted-foreground">
              Compose Level 1 RDF triples from verified annotations and publish them to the marketplace.
            </p>
          </div>

          {/* Verified Annotations Notice */}
          {verifiedAnnotations && verifiedAnnotations.length === 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No verified annotations available. Annotations must have an upvote/downvote ratio greater than 1 to be used in RDF composition.
                Join swarms and vote on annotations to help verify them.
              </AlertDescription>
            </Alert>
          )}

          {/* Attribute Filter Section */}
          {attributeKeys && attributeKeys.length > 0 && (
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" />
                  Filter Verified Annotations by Attributes
                </CardTitle>
                <CardDescription>
                  Filter annotations by their custom attributes to find specific types of content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="filter-attribute-key">Attribute Key</Label>
                    <Select value={selectedAttributeKey} onValueChange={setSelectedAttributeKey}>
                      <SelectTrigger id="filter-attribute-key">
                        <SelectValue placeholder="Select attribute key" />
                      </SelectTrigger>
                      <SelectContent>
                        {attributeKeys.map(key => (
                          <SelectItem key={key} value={key}>
                            {key}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="filter-attribute-value">Attribute Value</Label>
                    <Select 
                      value={selectedAttributeValue} 
                      onValueChange={setSelectedAttributeValue}
                      disabled={!selectedAttributeKey || attributeValuesLoading}
                    >
                      <SelectTrigger id="filter-attribute-value">
                        <SelectValue placeholder={selectedAttributeKey ? "Select value" : "Select key first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {attributeValuesLoading ? (
                          <SelectItem value="__loading__" disabled>
                            Loading values...
                          </SelectItem>
                        ) : attributeValues && attributeValues.length > 0 ? (
                          attributeValues.map(value => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__none__" disabled>
                            No values available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="invisible">Actions</Label>
                    <Button
                      onClick={handleAddFilter}
                      disabled={!selectedAttributeKey || !selectedAttributeValue}
                      className="w-full"
                    >
                      <Filter className="mr-2 h-4 w-4" />
                      Apply Filter
                    </Button>
                  </div>
                </div>

                {/* Active Filters Display */}
                {activeFilters.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Active Filters:</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetFilters}
                        className="h-8 text-xs"
                      >
                        <X className="mr-1 h-3 w-3" />
                        Clear All
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeFilters.map((filter, index) => (
                        <Badge key={index} variant="secondary" className="px-3 py-1.5 text-sm">
                          <span className="font-medium">{filter.key}:</span>
                          <span className="ml-1">{filter.value}</span>
                          <button
                            onClick={() => handleRemoveFilter(index)}
                            className="ml-2 hover:text-destructive transition-colors"
                            aria-label="Remove filter"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Showing {displayedAnnotations.length} of {verifiedAnnotations?.length || 0} verified annotations
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* RDF Composer */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Level 1 RDF Composer
              </CardTitle>
              <CardDescription>
                Create RDF compositions by selecting verified annotation nodes (vote ratio {'>'} 1)
                {activeFilters.length > 0 && ' - filtered by attributes'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="composition-subject">Subject (Verified Annotation)</Label>
                  <Select value={compositionSubjectId} onValueChange={setCompositionSubjectId}>
                    <SelectTrigger id="composition-subject">
                      <SelectValue placeholder="Select verified subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredLoading ? (
                        <SelectItem value="__loading__" disabled>
                          Loading annotations...
                        </SelectItem>
                      ) : displayedAnnotations.length === 0 ? (
                        <SelectItem value="__none__" disabled>
                          {activeFilters.length > 0 ? 'No annotations match filters' : 'No verified annotations available'}
                        </SelectItem>
                      ) : (
                        displayedAnnotations.map(annotation => (
                          <SelectItem key={annotation.id.toString()} value={annotation.id.toString()}>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                              <span>{annotation.title}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="composition-predicate">Predicate (Relation)</Label>
                  <Select value={compositionPredicate} onValueChange={handleCompositionPredicateChange}>
                    <SelectTrigger id="composition-predicate">
                      <SelectValue placeholder="Select predicate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__create_new__" className="text-primary font-medium">
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          <span>Create new relation…</span>
                        </div>
                      </SelectItem>
                      {predicates.length > 0 && (
                        <div className="border-t my-1" />
                      )}
                      {predicates.map(pred => (
                        <SelectItem key={pred.name} value={pred.name}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{pred.name}</span>
                            {pred.description && (
                              <span className="text-xs text-muted-foreground">
                                {pred.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="composition-object">Object (Verified Annotation)</Label>
                  <Select value={compositionObjectId} onValueChange={setCompositionObjectId}>
                    <SelectTrigger id="composition-object">
                      <SelectValue placeholder="Select verified object" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredLoading ? (
                        <SelectItem value="__loading__" disabled>
                          Loading annotations...
                        </SelectItem>
                      ) : displayedAnnotations.length === 0 ? (
                        <SelectItem value="__none__" disabled>
                          {activeFilters.length > 0 ? 'No annotations match filters' : 'No verified annotations available'}
                        </SelectItem>
                      ) : (
                        displayedAnnotations.map(annotation => (
                          <SelectItem key={annotation.id.toString()} value={annotation.id.toString()}>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                              <span>{annotation.title}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {calculatedBasePrice > 0n && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">
                    Calculated Base Price: <span className="text-primary">{calculatedBasePrice.toString()} BUZZ</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on token effective weights from both annotations
                  </p>
                </div>
              )}

              <Button
                onClick={handleComposeRDF}
                disabled={!compositionSubjectId || !compositionPredicate || !compositionObjectId || composeRDFMutation.isPending || displayedAnnotations.length === 0}
                className="w-full"
                size="lg"
              >
                {composeRDFMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Composing...
                  </>
                ) : (
                  <>
                    <Package className="mr-2 h-4 w-4" />
                    Compose Level 1 RDF
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Composed RDFs List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Your Composed Level 1 RDFs
              </CardTitle>
              <CardDescription>
                RDF compositions ready to be published to the marketplace
              </CardDescription>
            </CardHeader>
            <CardContent>
              {composedRDFs && composedRDFs.length > 0 ? (
                <div className="space-y-3">
                  {composedRDFs.map(rdf => {
                    const subject = graphData?.nodes.find(n => n.id === rdf.subjectId);
                    const object = graphData?.nodes.find(n => n.id === rdf.objectId);
                    
                    return (
                      <div key={rdf.id.toString()} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">
                              {subject?.title || 'Unknown'} → {rdf.predicate} → {object?.title || 'Unknown'}
                            </p>
                            {rdf.level && (
                              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                                Level {rdf.level}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Base Price: {rdf.basePrice.toString()} BUZZ
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedCompositionId(rdf.id.toString());
                            setPublishPrice((Number(rdf.basePrice) + 100).toString());
                            setShowPublishDialog(true);
                          }}
                          size="sm"
                        >
                          <Coins className="mr-2 h-4 w-4" />
                          Publish
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <p className="text-sm">No RDF compositions yet. Create one above to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Future Features Placeholder */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Future Features</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Additional ontology building features will be added here in future releases.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Relation Dialog */}
      <Dialog open={showNewRelationDialog} onOpenChange={setShowNewRelationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Relation</DialogTitle>
            <DialogDescription>
              Define a new relation type that can be used across the application
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-relation-name">Relation Name</Label>
              <Input
                id="new-relation-name"
                placeholder="e.g., references, extends, depends-on"
                value={newRelationName}
                onChange={(e) => setNewRelationName(e.target.value)}
                disabled={registerRelationMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-relation-description">Description (optional)</Label>
              <Input
                id="new-relation-description"
                placeholder="Describe what this relation type means"
                value={newRelationDescription}
                onChange={(e) => setNewRelationDescription(e.target.value)}
                disabled={registerRelationMutation.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewRelationDialog(false);
                setNewRelationName('');
                setNewRelationDescription('');
              }}
              disabled={registerRelationMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewRelation}
              disabled={!newRelationName.trim() || registerRelationMutation.isPending}
            >
              {registerRelationMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Relation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish RDF Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish RDF to Marketplace</DialogTitle>
            <DialogDescription>
              Set the number of instances and price for your RDF composition
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="publish-instances">Number of Instances</Label>
              <Input
                id="publish-instances"
                type="number"
                min="1"
                placeholder="e.g., 10"
                value={publishInstances}
                onChange={(e) => setPublishInstances(e.target.value)}
                disabled={publishRDFMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="publish-price">Price per Instance (BUZZ)</Label>
              <Input
                id="publish-price"
                type="number"
                min="1"
                placeholder="e.g., 500"
                value={publishPrice}
                onChange={(e) => setPublishPrice(e.target.value)}
                disabled={publishRDFMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Price must be greater than the base price
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPublishDialog(false);
                setSelectedCompositionId('');
                setPublishInstances('1');
                setPublishPrice('');
              }}
              disabled={publishRDFMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublishRDF}
              disabled={!publishInstances || !publishPrice || publishRDFMutation.isPending}
            >
              {publishRDFMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Coins className="mr-2 h-4 w-4" />
                  Publish to Marketplace
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

