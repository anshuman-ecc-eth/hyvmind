/**
 * Copyright (c) Anshuman Singh, 2026.
 * SPDX-License-Identifier: CC-BY-SA-4.0
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 
 * International License. To view a copy of this license, visit 
 * http://creativecommons.org/licenses/by-sa/4.0/
 */
import { useGetVoteData, useUpvoteNode, useDownvoteNode, useHasUserVoted } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VotingButtonsProps {
  nodeId: string;
  nodeType: string;
  compact?: boolean;
  interactive?: boolean;
}

export default function VotingButtons({ nodeId, nodeType, compact = false, interactive = true }: VotingButtonsProps) {
  // Call all hooks at the top level before any conditional logic
  const { data: voteData, isLoading: voteDataLoading } = useGetVoteData(nodeId);
  const { data: hasVoted, isLoading: hasVotedLoading } = useHasUserVoted(nodeId);
  const upvoteMutation = useUpvoteNode();
  const downvoteMutation = useDownvoteNode();

  // Do not render voting buttons for Curation nodes (after all hooks are called)
  if (nodeType === 'curation') {
    return null;
  }

  const isLoading = voteDataLoading || hasVotedLoading;

  const handleUpvote = async () => {
    if (!interactive || hasVoted !== null) return;
    
    try {
      await upvoteMutation.mutateAsync(nodeId);
      toast.success('Upvoted successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('already voted')) {
        toast.info('You have already voted on this node');
      } else if (errorMessage.includes('Unauthorized')) {
        toast.error('You do not have permission to vote on this node');
      } else if (errorMessage.includes('not found')) {
        toast.error('Node not found');
      } else {
        toast.error(`Failed to upvote: ${errorMessage}`);
      }
    }
  };

  const handleDownvote = async () => {
    if (!interactive || hasVoted !== null) return;
    
    try {
      await downvoteMutation.mutateAsync(nodeId);
      toast.success('Downvoted successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('already voted')) {
        toast.info('You have already voted on this node');
      } else if (errorMessage.includes('Unauthorized')) {
        toast.error('You do not have permission to vote on this node');
      } else if (errorMessage.includes('not found')) {
        toast.error('Node not found');
      } else {
        toast.error(`Failed to downvote: ${errorMessage}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const upvotes = voteData ? Number(voteData.upvotes) : 0;
  const downvotes = voteData ? Number(voteData.downvotes) : 0;
  const userHasVoted = hasVoted !== null;
  const isDisabled = userHasVoted || upvoteMutation.isPending || downvoteMutation.isPending;

  if (compact && !interactive) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-0.5">
          <ThumbsUp className="h-3 w-3" />
          <span>{upvotes}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <ThumbsDown className="h-3 w-3" />
          <span>{downvotes}</span>
        </div>
      </div>
    );
  }

  if (compact && interactive) {
    return (
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleUpvote}
          disabled={isDisabled}
          className={`h-5 px-1 ${userHasVoted ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent hover:text-accent-foreground'}`}
        >
          {upvoteMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <ThumbsUp className="h-3 w-3 mr-0.5" />
              <span className="text-xs">{upvotes}</span>
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDownvote}
          disabled={isDisabled}
          className={`h-5 px-1 ${userHasVoted ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent hover:text-accent-foreground'}`}
        >
          {downvoteMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <ThumbsDown className="h-3 w-3 mr-0.5" />
              <span className="text-xs">{downvotes}</span>
            </>
          )}
        </Button>
      </div>
    );
  }

  // Non-interactive mode: display only, no hover effects or click handlers
  if (!interactive) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-7 px-2 flex items-center gap-1 border border-border rounded-md bg-background">
          <ThumbsUp className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{upvotes}</span>
        </div>
        <div className="h-7 px-2 flex items-center gap-1 border border-border rounded-md bg-background">
          <ThumbsDown className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{downvotes}</span>
        </div>
      </div>
    );
  }

  // Interactive mode: full functionality with hover effects, disabled after voting
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleUpvote}
        disabled={isDisabled}
        className={`h-7 px-2 ${userHasVoted ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent hover:text-accent-foreground'}`}
      >
        {upvoteMutation.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <>
            <ThumbsUp className="h-3 w-3 mr-1" />
            <span className="text-xs">{upvotes}</span>
          </>
        )}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleDownvote}
        disabled={isDisabled}
        className={`h-7 px-2 ${userHasVoted ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent hover:text-accent-foreground'}`}
      >
        {downvoteMutation.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <>
            <ThumbsDown className="h-3 w-3 mr-1" />
            <span className="text-xs">{downvotes}</span>
          </>
        )}
      </Button>
    </div>
  );
}
