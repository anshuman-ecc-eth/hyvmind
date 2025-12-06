import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useActor } from '../hooks/useActor';
import { useGetAllLocations, useUpdateLocation } from '../hooks/useQueries';
import { Loader2, X, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import type { Location } from '../backend';

interface EditLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location;
}

interface Metadata {
  key: string;
  value: string;
}

interface HierarchySelection {
  parentIds: Set<string>;
  childIds: Set<string>;
  siblingIds: Set<string>;
}

export default function EditLocationDialog({ open, onOpenChange, location }: EditLocationDialogProps) {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;
  const { data: allLocations = [] } = useGetAllLocations();
  const updateLocationMutation = useUpdateLocation();

  const [title, setTitle] = useState(location.title);
  const [content, setContent] = useState(location.content);
  const [metadata, setMetadata] = useState<Metadata[]>(
    location.metadata.map(([key, value]) => ({ key, value }))
  );
  const [hierarchySelection, setHierarchySelection] = useState<HierarchySelection>({
    parentIds: new Set(location.parentIds.map(id => id.toString())),
    childIds: new Set(location.childIds.map(id => id.toString())),
    siblingIds: new Set(),
  });
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setTitle(location.title);
      setContent(location.content);
      setMetadata(location.metadata.map(([key, value]) => ({ key, value })));
      setHierarchySelection({
        parentIds: new Set(location.parentIds.map(id => id.toString())),
        childIds: new Set(location.childIds.map(id => id.toString())),
        siblingIds: new Set(),
      });
      setExpandedLocations(new Set());
    }
  }, [open, location]);

  const availableLocations = allLocations.filter(loc => loc.id !== location.id);

  const handleAddMetadata = () => {
    setMetadata([...metadata, { key: '', value: '' }]);
  };

  const handleRemoveMetadata = (index: number) => {
    setMetadata(metadata.filter((_, i) => i !== index));
  };

  const handleMetadataKeyChange = (index: number, key: string) => {
    const updated = [...metadata];
    updated[index].key = key;
    setMetadata(updated);
  };

  const handleMetadataValueChange = (index: number, value: string) => {
    const updated = [...metadata];
    updated[index].value = value;
    setMetadata(updated);
  };

  const toggleExpanded = (locationId: string) => {
    const newSet = new Set(expandedLocations);
    if (newSet.has(locationId)) {
      newSet.delete(locationId);
    } else {
      newSet.add(locationId);
    }
    setExpandedLocations(newSet);
  };

  const handleRelationshipToggle = (locationId: string, relationType: 'parent' | 'child' | 'sibling') => {
    setHierarchySelection(prev => {
      const newSelection = { ...prev };
      const targetSet = relationType === 'parent' ? 'parentIds' : relationType === 'child' ? 'childIds' : 'siblingIds';
      const newSet = new Set(newSelection[targetSet]);
      
      if (newSet.has(locationId)) {
        newSet.delete(locationId);
      } else {
        newSet.add(locationId);
      }
      
      newSelection[targetSet] = newSet;
      return newSelection;
    });
  };

  const buildLocationTree = (locations: Location[]): Map<string, Location[]> => {
    const tree = new Map<string, Location[]>();
    
    locations.forEach(loc => {
      loc.childIds.forEach(childId => {
        const childIdStr = childId.toString();
        if (!tree.has(loc.id.toString())) {
          tree.set(loc.id.toString(), []);
        }
        const child = locations.find(l => l.id.toString() === childIdStr);
        if (child) {
          tree.get(loc.id.toString())!.push(child);
        }
      });
    });
    
    return tree;
  };

  const getRootLocations = (locations: Location[]): Location[] => {
    return locations.filter(loc => loc.parentIds.length === 0);
  };

  const renderLocationTreeNode = (loc: Location, level: number, tree: Map<string, Location[]>) => {
    const locationId = loc.id.toString();
    const children = tree.get(locationId) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedLocations.has(locationId);
    
    const isParent = hierarchySelection.parentIds.has(locationId);
    const isChild = hierarchySelection.childIds.has(locationId);
    const isSibling = hierarchySelection.siblingIds.has(locationId);

    return (
      <div key={locationId} className="space-y-1">
        <div className="flex items-start gap-2" style={{ paddingLeft: `${level * 16}px` }}>
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleExpanded(locationId)}
              className="mt-1 p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}
          
          <div className="flex-1 space-y-1">
            <div className="font-medium text-sm">{loc.title}</div>
            <div className="flex gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  checked={isParent}
                  onCheckedChange={() => handleRelationshipToggle(locationId, 'parent')}
                  disabled={!isReady}
                />
                <span className="text-muted-foreground">Parent</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  checked={isChild}
                  onCheckedChange={() => handleRelationshipToggle(locationId, 'child')}
                  disabled={!isReady}
                />
                <span className="text-muted-foreground">Child</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  checked={isSibling}
                  onCheckedChange={() => handleRelationshipToggle(locationId, 'sibling')}
                  disabled={!isReady}
                />
                <span className="text-muted-foreground">Sibling</span>
              </label>
            </div>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {children.map(child => renderLocationTreeNode(child, level + 1, tree))}
          </div>
        )}
      </div>
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !isReady) return;
    
    const validMetadata = metadata
      .filter(m => m.key.trim() && m.value.trim())
      .map(m => [m.key.trim(), m.value.trim()] as [string, string]);
    
    const parentIds = Array.from(hierarchySelection.parentIds).map(id => BigInt(id));
    const siblingIds = Array.from(hierarchySelection.siblingIds).map(id => BigInt(id));
    
    updateLocationMutation.mutate(
      {
        id: location.id,
        title: title.trim(),
        content: content.trim(),
        metadata: validMetadata,
        parentIds,
        siblingIds,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const isDisabled = !title.trim() || updateLocationMutation.isPending || !isReady;

  const locationTree = buildLocationTree(availableLocations);
  const rootLocations = getRootLocations(availableLocations);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-gray-950 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Location</DialogTitle>
          <DialogDescription className="text-sm">
            Update your location details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. section ABC of Act XYZ, para 123 of case 456"
              disabled={!isReady}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content" className="text-sm">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="the actual text of the location, for e.g. appropriate authority means authority mentioned under this Act"
              disabled={!isReady}
              className="text-sm min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Hierarchical Relationships (optional)</Label>
            <div className="text-xs text-muted-foreground mb-2">
              Select parent, child, or sibling relationships for this location
            </div>
            {availableLocations.length === 0 ? (
              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md border border-dashed">
                No other locations available
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto border rounded-md p-3 space-y-2 bg-muted/30">
                {rootLocations.map(loc => renderLocationTreeNode(loc, 0, locationTree))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Metadata (optional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMetadata}
                disabled={!isReady}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Metadata
              </Button>
            </div>
            
            {metadata.length > 0 && (
              <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                {metadata.map((meta, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Input
                      value={meta.key}
                      onChange={(e) => handleMetadataKeyChange(index, e.target.value)}
                      placeholder="Metadata key"
                      className="text-sm h-8 flex-1"
                      disabled={!isReady}
                    />
                    <Input
                      value={meta.value}
                      onChange={(e) => handleMetadataValueChange(index, e.target.value)}
                      placeholder="Metadata value"
                      className="text-sm h-8 flex-1"
                      disabled={!isReady}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMetadata(index)}
                      className="h-8 w-8 p-0 shrink-0"
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
              disabled={updateLocationMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isDisabled}
              className="flex-1 text-sm"
            >
              {updateLocationMutation.isPending ? (
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
