import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useActor } from '../hooks/useActor';
import { useGetCallerSwarms, useGetAllTokens, useGetAllPropertiesKeys, useGetAllPropertiesValues, useGetAllLocations, useCreateAnnotation } from '../hooks/useQueries';
import { Loader2, X, Plus } from 'lucide-react';
import { AnnotationType } from '../backend';

interface CreateAnnotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Property {
  key: string;
  value: string;
}

// Helper function to normalize text (trim and lowercase) - matches backend normalization
function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

// Helper function to deduplicate array based on normalized values
function deduplicateNormalized(items: string[]): string[] {
  const seen = new Map<string, string>();
  const result: string[] = [];
  
  for (const item of items) {
    const normalized = normalizeText(item);
    if (!seen.has(normalized)) {
      seen.set(normalized, item);
      result.push(item);
    }
  }
  
  return result;
}

// Helper function to extract tokens from content
function extractTokens(content: string): string[] {
  const tokenRegex = /\{([^}]+)\}/g;
  const tokens: string[] = [];
  let match;
  
  while ((match = tokenRegex.exec(content)) !== null) {
    tokens.push(match[1].trim());
  }
  
  return tokens;
}

// Helper function to validate Positive Law content (only bracketed tokens)
function isValidPositiveLaw(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  
  // Remove all bracketed tokens and check if anything remains
  const withoutTokens = trimmed.replace(/\{[^}]+\}/g, '').trim();
  return withoutTokens.length === 0;
}

export default function CreateAnnotationDialog({ open, onOpenChange }: CreateAnnotationDialogProps) {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;
  const { data: userSwarms = [] } = useGetCallerSwarms();
  const { data: allTokens = [] } = useGetAllTokens();
  const { data: allPropertiesKeys = [] } = useGetAllPropertiesKeys();
  const { data: allPropertiesValues = [] } = useGetAllPropertiesValues();
  const { data: allLocations = [] } = useGetAllLocations();
  const createAnnotationMutation = useCreateAnnotation();

  const [content, setContent] = useState('');
  const [annotationType, setAnnotationType] = useState<'positiveLaw' | 'interpretation'>('positiveLaw');
  const [swarmId, setSwarmId] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(new Set());

  // Autocomplete state
  const [tokenPopoverOpen, setTokenPopoverOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [currentTokenInput, setCurrentTokenInput] = useState('');

  // Determine if selected swarm is public
  const selectedSwarm = userSwarms.find(s => s.id.toString() === swarmId);
  const isPublic = selectedSwarm?.isPublic ?? true;

  // Detect token input context
  const detectTokenContext = (text: string, position: number): { isInToken: boolean; tokenStart: number; tokenText: string } => {
    let tokenStart = -1;
    let tokenEnd = -1;
    
    // Find the last opening bracket before cursor
    for (let i = position - 1; i >= 0; i--) {
      if (text[i] === '{') {
        tokenStart = i;
        break;
      }
      if (text[i] === '}') {
        break;
      }
    }
    
    // Find the next closing bracket after cursor
    for (let i = position; i < text.length; i++) {
      if (text[i] === '}') {
        tokenEnd = i;
        break;
      }
      if (text[i] === '{') {
        break;
      }
    }
    
    const isInToken = tokenStart !== -1 && (tokenEnd === -1 || tokenEnd > position);
    const tokenText = isInToken ? text.substring(tokenStart + 1, position) : '';
    
    return { isInToken, tokenStart, tokenText };
  };

  // Filter token suggestions based on current input
  const tokenSuggestions = useMemo(() => {
    if (currentTokenInput.length < 1) return [];
    const normalizedQuery = normalizeText(currentTokenInput);
    const filtered = allTokens.filter(t => normalizeText(t).includes(normalizedQuery));
    const deduplicated = deduplicateNormalized(filtered);
    return deduplicated.slice(0, 10);
  }, [currentTokenInput, allTokens]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const newPosition = e.target.selectionStart || 0;
    
    setContent(newContent);
    setCursorPosition(newPosition);
    
    const context = detectTokenContext(newContent, newPosition);
    setCurrentTokenInput(context.tokenText);
    setTokenPopoverOpen(context.isInToken && context.tokenText.length >= 1);
  };

  const handleTokenSelect = (token: string) => {
    const context = detectTokenContext(content, cursorPosition);
    if (!context.isInToken) return;
    
    const before = content.substring(0, context.tokenStart + 1);
    const after = content.substring(cursorPosition);
    const newContent = before + token + '}' + after;
    
    setContent(newContent);
    setTokenPopoverOpen(false);
    setCurrentTokenInput('');
  };

  const handleAddProperty = () => {
    setProperties([...properties, { key: '', value: '' }]);
  };

  const handleRemoveProperty = (index: number) => {
    setProperties(properties.filter((_, i) => i !== index));
  };

  const handlePropertyKeyChange = (index: number, key: string) => {
    const updated = [...properties];
    updated[index].key = key;
    setProperties(updated);
  };

  const handlePropertyValueChange = (index: number, value: string) => {
    const updated = [...properties];
    updated[index].value = value;
    setProperties(updated);
  };

  const handleLocationToggle = (locationId: string) => {
    const newSet = new Set(selectedLocationIds);
    if (newSet.has(locationId)) {
      newSet.delete(locationId);
    } else {
      newSet.add(locationId);
    }
    setSelectedLocationIds(newSet);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!swarmId || !content.trim() || !isReady) return;
    
    // Validate Positive Law format
    if (annotationType === 'positiveLaw' && !isValidPositiveLaw(content)) {
      alert('Positive Law annotations must contain only bracketed token sequences like {token one} {token two}');
      return;
    }
    
    // Extract tokens from content
    const extractedTokens = extractTokens(content);
    
    // Filter out empty properties
    const validProperties = properties
      .filter(p => p.key.trim() && p.value.trim())
      .map(p => [p.key.trim(), p.value.trim()] as [string, string]);
    
    const linkedLocationIds = Array.from(selectedLocationIds).map(id => BigInt(id));
    
    createAnnotationMutation.mutate(
      {
        content: content.trim(),
        annotationType: annotationType === 'positiveLaw' ? AnnotationType.positiveLaw : AnnotationType.interpretation,
        swarmId: BigInt(swarmId),
        isPublic,
        referenceIds: [],
        properties: validProperties,
        linkedLocationIds,
        extractedTokens,
      },
      {
        onSuccess: () => {
          // Reset form
          setContent('');
          setAnnotationType('positiveLaw');
          setSwarmId('');
          setProperties([]);
          setSelectedLocationIds(new Set());
          onOpenChange(false);
        },
      }
    );
  };

  const isDisabled = !content.trim() || !swarmId || createAnnotationMutation.isPending || !isReady;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-gray-950 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Create Annotation</DialogTitle>
          <DialogDescription className="text-sm">
            Create annotations using markdown with {'{'}bracket tokens{'}'} for semantic markup. Positive Law requires only token sequences, Interpretation allows full markdown with optional tokens.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isReady && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Connecting to backend...</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="swarm" className="text-sm">Target Notebook *</Label>
            {userSwarms.length === 0 ? (
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="h-4 w-4" />
                  <span className="font-medium">No notebooks available</span>
                </div>
                <p className="text-xs">Create a notebook first using the floating button in the bottom-right corner</p>
              </div>
            ) : (
              <Select value={swarmId} onValueChange={setSwarmId} disabled={!isReady}>
                <SelectTrigger id="swarm" className="text-sm">
                  <SelectValue placeholder="Select a notebook" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-950">
                  {userSwarms.map((swarm) => (
                    <SelectItem key={swarm.id.toString()} value={swarm.id.toString()} className="text-sm">
                      {swarm.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="annotationType" className="text-sm">Annotation Type *</Label>
            <Select 
              value={annotationType} 
              onValueChange={(value) => setAnnotationType(value as 'positiveLaw' | 'interpretation')}
              disabled={!isReady || userSwarms.length === 0}
            >
              <SelectTrigger id="annotationType" className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-950">
                <SelectItem value="positiveLaw" className="text-sm">
                  Positive Law
                </SelectItem>
                <SelectItem value="interpretation" className="text-sm">
                  Interpretation
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {annotationType === 'positiveLaw' 
                ? 'Only bracketed token sequences allowed (e.g., {this is} {an example})'
                : 'Full markdown with optional bracketed tokens'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content" className="text-sm">Content *</Label>
            <div className="relative">
              <Textarea
                id="content"
                value={content}
                onChange={handleContentChange}
                placeholder={
                  annotationType === 'positiveLaw'
                    ? '{the bank} {means} {reserve bank of India}'
                    : 'Write your interpretation here. Use {brackets} to reference tokens.'
                }
                disabled={!isReady || userSwarms.length === 0}
                className="text-sm min-h-[120px] font-mono"
                rows={6}
              />
              {tokenPopoverOpen && tokenSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-950 border rounded-md shadow-md max-h-48 overflow-y-auto">
                  <Command className="bg-white dark:bg-gray-950">
                    <CommandList>
                      <CommandEmpty className="text-sm py-6 text-center text-muted-foreground">
                        No token suggestions found.
                      </CommandEmpty>
                      <CommandGroup>
                        {tokenSuggestions.map((suggestion, idx) => (
                          <CommandItem
                            key={idx}
                            value={suggestion}
                            onSelect={() => handleTokenSelect(suggestion)}
                            className="text-sm cursor-pointer"
                          >
                            {suggestion}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Link Location (optional)</Label>
            {allLocations.length === 0 ? (
              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md border border-dashed">
                No locations available. Create locations to organize your annotations.
              </div>
            ) : (
              <div className="max-h-32 overflow-y-auto border rounded-md p-3 space-y-2 bg-muted/30">
                {allLocations.map((location) => (
                  <div key={location.id.toString()} className="flex items-center space-x-2">
                    <Checkbox
                      id={`location-${location.id.toString()}`}
                      checked={selectedLocationIds.has(location.id.toString())}
                      onCheckedChange={() => handleLocationToggle(location.id.toString())}
                      disabled={!isReady}
                    />
                    <label
                      htmlFor={`location-${location.id.toString()}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {location.title}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Properties (optional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddProperty}
                disabled={!isReady || userSwarms.length === 0}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Property
              </Button>
            </div>
            
            {properties.length === 0 ? (
              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md border border-dashed">
                No properties. Type to create new key-value pairs.
              </div>
            ) : (
              <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                {properties.map((property, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Input
                      value={property.key}
                      onChange={(e) => handlePropertyKeyChange(index, e.target.value)}
                      placeholder="Property key"
                      className="text-sm h-8 flex-1"
                      disabled={!isReady}
                    />
                    <Input
                      value={property.value}
                      onChange={(e) => handlePropertyValueChange(index, e.target.value)}
                      placeholder="Property value"
                      className="text-sm h-8 flex-1"
                      disabled={!isReady}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveProperty(index)}
                      className="h-8 w-8 p-0 shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedSwarm && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
              {selectedSwarm.isPublic ? (
                <span>✓ This annotation will be public (notebook is public)</span>
              ) : (
                <span>✓ This annotation will be private (notebook is private)</span>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 text-sm"
              disabled={createAnnotationMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isDisabled || userSwarms.length === 0}
              className="flex-1 text-sm"
            >
              {!isReady ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : createAnnotationMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Annotation'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
