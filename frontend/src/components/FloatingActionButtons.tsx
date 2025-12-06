import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen, Network, MapPin } from 'lucide-react';
import CreateSwarmDialog from './CreateSwarmDialog';
import CreateAnnotationDialog from './CreateAnnotationDialog';
import CreateLocationDialog from './CreateLocationDialog';

export default function FloatingActionButtons() {
  const [showCreateSwarm, setShowCreateSwarm] = useState(false);
  const [showCreateAnnotation, setShowCreateAnnotation] = useState(false);
  const [showCreateLocation, setShowCreateLocation] = useState(false);

  return (
    <>
      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-50">
        <Button
          onClick={() => setShowCreateSwarm(true)}
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-primary hover:bg-primary/90"
          title="Create New Notebook"
        >
          <div className="flex flex-col items-center justify-center">
            <Plus className="h-6 w-6" />
            <BookOpen className="h-4 w-4 -mt-1" />
          </div>
          <span className="sr-only">Create New Notebook</span>
        </Button>

        <Button
          onClick={() => setShowCreateAnnotation(true)}
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-primary hover:bg-primary/90"
          title="Create New Annotation"
        >
          <div className="flex flex-col items-center justify-center">
            <Plus className="h-6 w-6" />
            <Network className="h-4 w-4 -mt-1" />
          </div>
          <span className="sr-only">Create New Annotation</span>
        </Button>

        <Button
          onClick={() => setShowCreateLocation(true)}
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-primary hover:bg-primary/90"
          title="Create New Location"
        >
          <div className="flex flex-col items-center justify-center">
            <Plus className="h-6 w-6" />
            <MapPin className="h-4 w-4 -mt-1" />
          </div>
          <span className="sr-only">Create New Location</span>
        </Button>
      </div>

      {/* Dialogs */}
      <CreateSwarmDialog open={showCreateSwarm} onOpenChange={setShowCreateSwarm} />
      <CreateAnnotationDialog open={showCreateAnnotation} onOpenChange={setShowCreateAnnotation} />
      <CreateLocationDialog open={showCreateLocation} onOpenChange={setShowCreateLocation} />
    </>
  );
}
