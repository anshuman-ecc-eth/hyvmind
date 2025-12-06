import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useActor } from '../hooks/useActor';
import { useCreateSwarm } from '../hooks/useQueries';
import { Loader2 } from 'lucide-react';

interface CreateSwarmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateSwarmDialog({ open, onOpenChange }: CreateSwarmDialogProps) {
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;
  const createSwarmMutation = useCreateSwarm();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !jurisdiction || !isReady) return;
    
    createSwarmMutation.mutate(
      {
        title,
        description,
        jurisdiction,
        isPublic,
        tags: [],
      },
      {
        onSuccess: () => {
          // Reset form
          setTitle('');
          setDescription('');
          setJurisdiction('');
          setIsPublic(true);
          onOpenChange(false);
        },
      }
    );
  };

  const isFormValid = title.trim() !== '' && jurisdiction.trim() !== '';
  const isDisabled = !isFormValid || createSwarmMutation.isPending || !isReady;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-gray-950 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Create Notebook</DialogTitle>
          <DialogDescription className="text-sm">
            A notebook is a collection of annotations.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter swarm title"
              required
              disabled={!isReady}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the research area"
              rows={3}
              disabled={!isReady}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jurisdiction" className="text-sm">Jurisdiction *</Label>
            <Input
              id="jurisdiction"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              placeholder="e.g., USA, GBR, DEU"
              maxLength={3}
              required
              disabled={!isReady}
              className="text-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label htmlFor="public" className="text-sm cursor-help">Create Swarm</Label>
                </TooltipTrigger>
                <TooltipContent>
                  <p>a swarm is a public notebook, turn this on if you want others to contribute</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
              disabled={!isReady}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 text-sm"
              disabled={createSwarmMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isDisabled}
              className="flex-1 text-sm"
            >
              {createSwarmMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Swarm'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
