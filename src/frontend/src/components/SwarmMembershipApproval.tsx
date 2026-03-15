import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Principal } from "@icp-sdk/core/principal";
import { Check, Loader2, UserCheck, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { MembershipInfo, NodeId } from "../backend";
import { MembershipStatus } from "../backend";
import {
  useApproveJoinRequest,
  useGetSwarmMembershipRequests,
} from "../hooks/useQueries";

interface SwarmMembershipApprovalProps {
  swarmId: NodeId;
}

export default function SwarmMembershipApproval({
  swarmId,
}: SwarmMembershipApprovalProps) {
  const { data: requests, isLoading } = useGetSwarmMembershipRequests(swarmId);
  const approveMutation = useApproveJoinRequest();
  const [processingMember, setProcessingMember] = useState<string | null>(null);

  const handleApprove = async (request: MembershipInfo) => {
    try {
      // Validate principal before sending
      if (!request.principal) {
        toast.error("Invalid member principal");
        return;
      }

      let principalToApprove: Principal;

      try {
        // Convert to Principal object
        if (typeof request.principal === "string") {
          principalToApprove = Principal.fromText(request.principal);
        } else if (request.principal && typeof request.principal === "object") {
          // Handle serialized principal objects
          const principalObj = request.principal as any;
          if ("__principal__" in principalObj) {
            principalToApprove = Principal.fromText(principalObj.__principal__);
          } else if ("_isPrincipal" in principalObj) {
            principalToApprove = request.principal as Principal;
          } else if (
            principalObj.toString &&
            typeof principalObj.toString === "function"
          ) {
            principalToApprove = Principal.fromText(principalObj.toString());
          } else {
            throw new Error("Unrecognized principal format");
          }
        } else {
          throw new Error("Invalid principal type");
        }
      } catch (conversionError) {
        console.error("Principal conversion error:", conversionError);
        toast.error("Failed to process member principal. Please try again.");
        return;
      }

      setProcessingMember(principalToApprove.toString());

      await approveMutation.mutateAsync({
        swarmId,
        member: principalToApprove,
      });

      toast.success("Contributor approved successfully");
    } catch (error) {
      console.error("Approval error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to approve contributor",
      );
    } finally {
      setProcessingMember(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <UserCheck className="h-8 w-8 opacity-50" />
          <p className="text-sm">No contributor requests</p>
        </div>
      </div>
    );
  }

  const pendingRequests = requests.filter(
    (r) => r.status === MembershipStatus.pending,
  );
  const approvedRequests = requests.filter(
    (r) => r.status === MembershipStatus.approved,
  );

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-4 p-4">
        {pendingRequests.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Pending Requests</h3>
              <Badge variant="secondary" className="ml-auto">
                {pendingRequests.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {pendingRequests.map((request) => {
                const principalStr = request.principal.toString();
                const isProcessing = processingMember === principalStr;

                return (
                  <div
                    key={principalStr}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      {request.profileName ? (
                        <div className="space-y-1">
                          <p className="text-sm font-medium truncate">
                            {request.profileName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {principalStr.slice(0, 20)}...
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm font-mono truncate">
                          {principalStr}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApprove(request)}
                        disabled={isProcessing}
                        className="h-8"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {pendingRequests.length > 0 && approvedRequests.length > 0 && (
          <Separator className="my-4" />
        )}

        {approvedRequests.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Contributors</h3>
              <Badge variant="secondary" className="ml-auto">
                {approvedRequests.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {approvedRequests.map((request) => {
                const principalStr = request.principal.toString();

                return (
                  <div
                    key={principalStr}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      {request.profileName ? (
                        <div className="space-y-1">
                          <p className="text-sm font-medium truncate">
                            {request.profileName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {principalStr.slice(0, 20)}...
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm font-mono truncate">
                          {principalStr}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="ml-4">
                      <Check className="h-3 w-3 mr-1" />
                      Approved
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
