import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useActor } from '../hooks/useActor';
import { useGetAllTokens, useGetAllPropertiesKeys, useGetAllPropertiesValues, useGetAllLocations, useUpdateAnnotation } from '../hooks/useQueries';
import { Loader2, AlertCircle, X, Plus } from 'lucide-react';
import type { Annotation } from '../backend';
import { AnnotationType } from '../backend';

interface EditAnnotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  annotation: Annotation;
}

interface Property {
  key: string;
  value: string;
}

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

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

function extractTokens(content: string): string[] {
  const tokenRegex = /\{([^}]+)\}/g;
  const tokens: string[] = [];
  let match;
  
  while ((match = tokenRegex.exec(content)) !== null) {
    tokens.push(match[1].trim());
  }
  
  return tokens;
}

function isValidPositiveLaw(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  
  const withoutTokens = trimmed.replace(/\{[^}]+\}/g, '').trim();
  return withoutTokens.length === 0;
}

// Convert legacy triple format to unified markdown
function convertLegacyToMarkdown(annotation: Annotation): string {
  // If content already contains brackets, assume it's already in new format
  if (annotation.content.includes('{') && annotation.content.includes('}')) {
    return annotation.content;
  }
  
  // Legacy format: convert subject-predicate-object to token sequence
  // This is a fallback for backward compatibility
  return annotation.content;
}

export default function EditAnnotationDialog({ open, onOpenChange, annotation }: EditAnnotationDialogProps) {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;
  const { data: allTokens = [] } = useGetAllTokens();
  const { data: allPropertiesKeys = [] } = useGetAllPropertiesKeys();
  const { data: allPropertiesValues = [] } = useGetAllPropertiesValues();
  const { data: allLocations = [] } = useGetAllLocations();
  const updateAnnotationMutation = useUpdateAnnotation();

  // Check if annotation is immutable (simplified check)
  const isImmutable = annotation.isPublic && Number(annotation.approvalScore) > 0;

  const [content, setContent] = useState(convertLegacyToMarkdown(annotation));
  const [annotationType, setAnnotationType] = useState<'positiveLaw' | 'interpretation'>(
    annotation.annotationType === AnnotationType.positiveLaw ? 'positiveLaw' : 'interpretation'
  );
  const [properties, setProperties] = useState<Property[]>(
    annotation.properties.map(([key, value]) => ({ key, value }))
  );
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(
    new Set(annotation.linkedLocationIds.map(id => id.toString()))
  );
  const [isPublic, setIsPublic] = useState(annotation.isPublic);

  // Autocomplete state
  const [tokenPopoverOpen, setTokenPopoverOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [currentTokenInput, setCurrentTokenInput] = useState('');

  useEffect(() => {
    if (open) {
      setContent(convertLegacyToMarkdown(annotation));
      setAnnotationType(annotation.annotationType === AnnotationType.positiveLaw ? 'positiveLaw' : 'interpretation');
      setProperties(annotation.properties.map(([key, value]) => ({ key, value })));
      setSelectedLocationIds(new Set(annotation.linkedLocationIds.map(id => id.toString())));
      setIsPublic(annotation.isPublic);
    }
  }, [open, annotation]);

  const detectTokenContext = (text: string, position: number): { isInToken: boolean; tokenStart: number; tokenText: string } => {
    let tokenStart = -1;
    let tokenEnd = -1;
    
    for (let i = position - 1; i >= 0; i--) {
      if (text[i] === '{') {
        tokenStart = i;
        break;
      }
      if (text[i] === '}') {
        break;
      }
    }
    
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

  const tokenSuggestions = useMemo(() => {
    if (currentTokenInput.length < 1) return [];
    const normalizedQuery = normalizeText(currentTokenInput);
    const filtered = allTokens.filter(t => normalizeText(t).includes(normalizedQuery));
    return deduplicateNormalized(filtered).slice(0, 10);
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
    if (!content.trim() || !isReady) return;
    
    if (annotationType === 'positiveLaw' && !isValidPositiveLaw(content)) {
      alert('Positive Law annotations must contain only bracketed token sequences like {token one} {token two}');
      return;
    }
    
    const extractedTokens = extractTokens(content);
    const validProperties = properties
      .filter(p => p.key.trim() && p.value.trim())
      .map(p => [p.key.trim(), p.value.trim()] as [string, string]);
    
    const linkedLocationIds = Array.from(selectedLocationIds).map(id => BigInt(id));
    
    updateAnnotationMutation.mutate(
      {
        id: annotation.id,
        content: content.trim(),
        annotationType: annotationType === 'positiveLaw' ? AnnotationType.positiveLaw : AnnotationType.interpretation,
        properties: validProperties,
        linkedLocationIds,
        extractedTokens,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const isDisabled = !content.trim() || updateAnnotationMutation.isPending || !isReady || isImmutable;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-gray-950 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Annotation</DialogTitle>
          <DialogDescription className="text-sm">
            Update your annotation details
          </DialogDescription>
        </DialogHeader>

        {isImmutable && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Cannot edit - annotation has been approved by others. Use Fork instead.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="annotationType" className="text-sm">Annotation Type *</Label>
            <Select 
              value={annotationType} 
              onValueChange={(value) => setAnnotationType(value as 'positiveLaw' | 'interpretation')}
              disabled={!isReady || isImmutable}
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="content" className="text-sm">Content *</Label>
            <div className="relative">
              <Textarea
                id="content"
                value={content}
                onChange={handleContentChange}
                disabled={!isReady || isImmutable}
                className="text-sm min-h-[120px] font-mono"
                rows={6}
              />
              {tokenPopoverOpen && tokenSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-950 border rounded-md shadow-md max-h-48 overflow-y-auto">
                  <Command className="bg-white dark:bg-gray-950">
                    <CommandList>
                      <CommandEmpty>No suggestions</CommandEmpty>
                      <CommandGroup>
                        {tokenSuggestions.map((s, i) => (
                          <CommandItem key={i} onSelect={() => handleTokenSelect(s)}>
                            {s}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="visibility" className="text-sm">Public Visibility</Label>
            <Switch
              id="visibility"
              checked={isPublic}
              onCheckedChange={setIsPublic}
              disabled={!isReady || isImmutable}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Link Location (optional)</Label>
            {allLocations.length === 0 ? (
              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md border border-dashed">
                No locations available
              </div>
            ) : (
              <div className="max-h-32 overflow-y-auto border rounded-md p-3 space-y-2 bg-muted/30">
                {allLocations.map((location) => (
                  <div key={location.id.toString()} className="flex items-center space-x-2">
                    <Checkbox
                      id={`location-${location.id.toString()}`}
                      checked={selectedLocationIds.has(location.id.toString())}
                      onCheckedChange={() => handleLocationToggle(location.id.toString())}
                      disabled={!isReady || isImmutable}
                    />
                    <label htmlFor={`location-${location.id.toString()}`} className="text-sm cursor-pointer flex-1">
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
                disabled={!isReady || isImmutable}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Property
              </Button>
            </div>
            
            {properties.length > 0 && (
              <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                {properties.map((property, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Input
                      value={property.key}
                      onChange={(e) => handlePropertyKeyChange(index, e.target.value)}
                      placeholder="Property key"
                      className="text-sm h-8 flex-1"
                      disabled={!isReady || isImmutable}
                    />
                    <Input
                      value={property.value}
                      onChange={(e) => handlePropertyValueChange(index, e.target.value)}
                      placeholder="Property value"
                      className="text-sm h-8 flex-1"
                      disabled={!isReady || isImmutable}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveProperty(index)}
                      className="h-8 w-8 p-0 shrink-0"
                      disabled={isImmutable}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 text-sm"
              disabled={updateAnnotationMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isDisabled}
              className="flex-1 text-sm"
            >
              {updateAnnotationMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
