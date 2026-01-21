import { useGetSwarmMembershipRequests, useApproveJoinRequest } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, Loader2, Users, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { NodeId } from '../backend';
import { MembershipStatus } from '../backend';
import { useState } from 'react';

interface SwarmMembershipApprovalProps {
  swarmId: NodeId;
}

export default function SwarmMembershipApproval({ swarmId }: SwarmMembershipApprovalProps) {
  const { data: membershipRequests, isLoading } = useGetSwarmMembershipRequests(swarmId);
  const approveRequest = useApproveJoinRequest();
  const [processingMember, setProcessingMember] = useState<string | null>(null);

  const handleApprove = async (memberPrincipal: any) => {
    // Get the principal string for tracking
    let memberStr: string;
    try {
      if (typeof memberPrincipal === 'string') {
        memberStr = memberPrincipal;
      } else if (memberPrincipal && typeof memberPrincipal === 'object' && '__principal__' in memberPrincipal) {
        memberStr = memberPrincipal.__principal__;
      } else if (memberPrincipal && typeof memberPrincipal.toString === 'function') {
        memberStr = memberPrincipal.toString();
      } else {
        throw new Error('Invalid principal format');
      }
    } catch (error) {
      toast.error('Invalid member principal format');
      return;
    }

    setProcessingMember(memberStr);
    
    try {
      await approveRequest.mutateAsync({ swarmId, member: memberPrincipal });
      toast.success('Member approved successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('No pending request')) {
        toast.info('This request has already been processed');
      } else if (errorMessage.includes('Invalid principal')) {
        toast.error('Invalid member principal. Please try again.');
      } else {
        toast.error(`Failed to approve member: ${errorMessage}`);
      }
    } finally {
      setProcessingMember(null);
    }
  };

  // Helper function to safely get principal string
  const getPrincipalString = (principal: any): string | null => {
    try {
      if (typeof principal === 'string') {
        return principal;
      }
      if (principal && typeof principal === 'object' && '__principal__' in principal) {
        return principal.__principal__;
      }
      if (principal && typeof principal.toString === 'function') {
        return principal.toString();
      }
      return null;
    } catch {
      return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!membershipRequests || membershipRequests.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No members or pending requests yet.
      </div>
    );
  }

  const pendingRequests = membershipRequests.filter(
    (req) => req.status === MembershipStatus.pending
  );
  const approvedRequests = membershipRequests.filter(
    (req) => req.status === MembershipStatus.approved
  );

  const hasPendingRequests = pendingRequests.length > 0;
  const hasApprovedMembers = approvedRequests.length > 0;

  return (
    <div className="space-y-4 p-4">
      {/* Pending Requests Section */}
      {hasPendingRequests && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-warning" />
            <span>Pending Requests ({pendingRequests.length})</span>
          </div>
          
          <div className="space-y-2">
            {pendingRequests.map((request, index) => {
              const memberStr = getPrincipalString(request.principal);
              
              if (!memberStr) {
                return (
                  <div key={index} className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm text-destructive">Invalid principal format</span>
                    </div>
                  </div>
                );
              }
              
              const shortId = `${memberStr.slice(0, 8)}...${memberStr.slice(-6)}`;
              const isProcessing = processingMember === memberStr;
              
              return (
                <div key={index} className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                      {request.profileName ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{request.profileName}</span>
                          <span className="text-xs font-mono text-muted-foreground">{shortId}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-mono">{shortId}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request.principal)}
                    disabled={approveRequest.isPending || isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Approve
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Separator between sections */}
      {hasPendingRequests && hasApprovedMembers && <Separator />}

      {/* Approved Members Section */}
      {hasApprovedMembers && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-success" />
            <span>Approved Members ({approvedRequests.length})</span>
          </div>
          
          <div className="space-y-2">
            {approvedRequests.map((request, index) => {
              const memberStr = getPrincipalString(request.principal);
              
              if (!memberStr) {
                return (
                  <div key={index} className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm text-destructive">Invalid principal format</span>
                    </div>
                  </div>
                );
              }
              
              const shortId = `${memberStr.slice(0, 8)}...${memberStr.slice(-6)}`;
              
              return (
                <div key={index} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                      <Check className="h-3 w-3 mr-1" />
                      Approved
                    </Badge>
                    {request.profileName ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{request.profileName}</span>
                        <span className="text-xs font-mono text-muted-foreground">{shortId}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-mono">{shortId}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
