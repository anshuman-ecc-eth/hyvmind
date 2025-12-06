import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { useGetCallerAnnotations, useGetCallerLocations, useDeleteAnnotation, useDeleteLocation, useForkAnnotation, useToggleAnnotationVisibility } from '../hooks/useQueries';
import { ChevronRight, ChevronLeft, ChevronDown, Edit, Trash2, Eye, EyeOff, GitFork, FileText, MapPin } from 'lucide-react';
import EditAnnotationDialog from './EditAnnotationDialog';
import EditLocationDialog from './EditLocationDialog';
import type { Annotation, Location } from '../backend';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ControlPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

// Helper function to render annotation content with backward compatibility
function renderAnnotationContent(annotation: Annotation): string {
  // If content contains brackets, it's the new token format
  if (annotation.content.includes('{') && annotation.content.includes('}')) {
    return annotation.content;
  }
  
  // Legacy fallback: display content as-is
  return annotation.content;
}

export default function ControlPanel({ isCollapsed, onToggleCollapse }: ControlPanelProps) {
  const { data: userAnnotations = [], isLoading: annotationsLoading } = useGetCallerAnnotations();
  const { data: userLocations = [], isLoading: locationsLoading } = useGetCallerLocations();
  const deleteAnnotationMutation = useDeleteAnnotation();
  const deleteLocationMutation = useDeleteLocation();
  const forkAnnotationMutation = useForkAnnotation();
  const toggleVisibilityMutation = useToggleAnnotationVisibility();
  const queryClient = useQueryClient();

  const [annotationsOpen, setAnnotationsOpen] = useState(true);
  const [locationsOpen, setLocationsOpen] = useState(true);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const handleDeleteAnnotation = async (id: bigint) => {
    if (confirm('Are you sure you want to delete this annotation?')) {
      deleteAnnotationMutation.mutate(id);
    }
  };

  const handleDeleteLocation = async (id: bigint) => {
    if (confirm('Are you sure you want to delete this location?')) {
      deleteLocationMutation.mutate(id);
    }
  };

  const handleForkAnnotation = async (id: bigint) => {
    forkAnnotationMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Annotation forked successfully');
        queryClient.invalidateQueries({ queryKey: ['callerAnnotations'] });
      },
    });
  };

  const handleToggleVisibility = async (id: bigint, currentVisibility: boolean) => {
    toggleVisibilityMutation.mutate(
      { id, isPublic: !currentVisibility },
      {
        onSuccess: () => {
          toast.success(`Annotation is now ${!currentVisibility ? 'public' : 'private'}`);
          queryClient.invalidateQueries({ queryKey: ['callerAnnotations'] });
        },
      }
    );
  };

  // Check if annotation is immutable (has approvals from others)
  const isAnnotationImmutable = (annotation: Annotation): boolean => {
    return annotation.isPublic && Number(annotation.approvalScore) > 0;
  };

  return (
    <>
      <aside
        className={`fixed left-0 top-20 h-[calc(100vh-5rem)] bg-background border-r border-border/40 transition-all duration-300 z-10 ${
          isCollapsed ? 'w-0 overflow-hidden' : 'w-80'
        }`}
      >
        <div className="h-full overflow-y-auto p-6">
          <div className="space-y-6">
            {/* My Annotations Section */}
            <Collapsible open={annotationsOpen} onOpenChange={setAnnotationsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-2 hover:bg-muted"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">My Annotations</h2>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform ${annotationsOpen ? 'rotate-180' : ''}`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-3">
                {annotationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-3 border-foreground/20 border-t-foreground" />
                  </div>
                ) : userAnnotations.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-20 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No annotations yet</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Create your first annotation
                    </p>
                  </div>
                ) : (
                  userAnnotations.map((annotation) => (
                    <AnnotationItem
                      key={annotation.id.toString()}
                      annotation={annotation}
                      isImmutable={isAnnotationImmutable(annotation)}
                      onEdit={() => setEditingAnnotation(annotation)}
                      onDelete={() => handleDeleteAnnotation(annotation.id)}
                      onFork={() => handleForkAnnotation(annotation.id)}
                      onToggleVisibility={() => handleToggleVisibility(annotation.id, annotation.isPublic)}
                    />
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* My Locations Section */}
            <Collapsible open={locationsOpen} onOpenChange={setLocationsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-2 hover:bg-muted"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">My Locations</h2>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform ${locationsOpen ? 'rotate-180' : ''}`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-3">
                {locationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-3 border-foreground/20 border-t-foreground" />
                  </div>
                ) : userLocations.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin className="h-12 w-12 mx-auto mb-3 opacity-20 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No locations yet</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Create your first location
                    </p>
                  </div>
                ) : (
                  userLocations.map((location) => (
                    <LocationItem
                      key={location.id.toString()}
                      location={location}
                      onEdit={() => setEditingLocation(location)}
                      onDelete={() => handleDeleteLocation(location.id)}
                    />
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </aside>

      {/* Left Sidebar Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={onToggleCollapse}
        className={`fixed top-24 transition-all duration-300 z-20 h-10 w-10 ${
          isCollapsed ? 'left-4' : 'left-[21rem]'
        }`}
        title={isCollapsed ? 'Show control panel' : 'Hide control panel'}
      >
        {isCollapsed ? (
          <ChevronRight className="h-5 w-5" />
        ) : (
          <ChevronLeft className="h-5 w-5" />
        )}
      </Button>

      {/* Edit Dialogs */}
      {editingAnnotation && (
        <EditAnnotationDialog
          open={!!editingAnnotation}
          onOpenChange={(open) => !open && setEditingAnnotation(null)}
          annotation={editingAnnotation}
        />
      )}
      {editingLocation && (
        <EditLocationDialog
          open={!!editingLocation}
          onOpenChange={(open) => !open && setEditingLocation(null)}
          location={editingLocation}
        />
      )}
    </>
  );
}

function AnnotationItem({
  annotation,
  isImmutable,
  onEdit,
  onDelete,
  onFork,
  onToggleVisibility,
}: {
  annotation: Annotation;
  isImmutable: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onFork: () => void;
  onToggleVisibility: () => void;
}) {
  return (
    <div className="bg-card border rounded-md p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono text-foreground/80 break-words">
            {renderAnnotationContent(annotation)}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={annotation.isPublic ? 'default' : 'secondary'} className="text-[10px] h-5">
              {annotation.isPublic ? 'Public' : 'Private'}
            </Badge>
            <Badge variant="outline" className="text-[10px] h-5">
              Score: {Number(annotation.approvalScore)}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleVisibility}
          className="h-7 px-2 text-xs"
          title={annotation.isPublic ? 'Make private' : 'Make public'}
        >
          {annotation.isPublic ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </Button>
        {isImmutable ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onFork}
            className="h-7 px-2 text-xs"
            title="Fork annotation"
          >
            <GitFork className="h-3 w-3 mr-1" />
            Fork
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-7 px-2 text-xs"
            title="Edit annotation"
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
        )}
        {!isImmutable && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            title="Delete annotation"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

function LocationItem({
  location,
  onEdit,
  onDelete,
}: {
  location: Location;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-card border rounded-md p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">
            {location.title}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Created: {new Date(Number(location.createdAt) / 1000000).toLocaleDateString()}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-7 px-2 text-xs"
          title="Edit location"
        >
          <Edit className="h-3 w-3 mr-1" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
          title="Delete location"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
