import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/app-header";
import { 
  Clock, AlertCircle, Building2, UserPlus, 
  ArrowRight, Mail, HelpCircle, LogOut
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { User } from "@shared/models/auth";
import type { DeliveryAgentProfile } from "@shared/schema";

interface AgentStatusPageProps {
  user: User;
  agentProfile: DeliveryAgentProfile | null;
  onProfileUpdated: () => void;
}

export default function AgentStatusPage({ user, agentProfile, onProfileUpdated }: AgentStatusPageProps) {
  const { logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteCode, setInviteCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validatedInvite, setValidatedInvite] = useState<{
    ngoName: string;
    ngoId: string;
    linkId: string;
  } | null>(null);

  const approvalStatus = agentProfile?.approvalStatus || "pending";
  const hasAffiliation = !!agentProfile?.affiliatedNgoId;

  const validateInviteMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch(`/api/invite/${code}`);
      if (!response.ok) {
        throw new Error("Invalid invite code");
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.valid) {
        setValidatedInvite({
          ngoName: data.ngoName,
          ngoId: data.ngoId,
          linkId: data.linkId,
        });
      } else {
        toast({
          title: "Invalid Code",
          description: "This invite code is invalid or has expired.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Invalid Code",
        description: "This invite code is invalid or has expired.",
        variant: "destructive",
      });
    },
  });

  const joinNgoMutation = useMutation({
    mutationFn: async () => {
      if (!validatedInvite) throw new Error("No validated invite");
      return apiRequest("PATCH", "/api/delivery-agent/join-ngo", {
        inviteLinkId: validatedInvite.linkId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Request Submitted",
        description: "Your request to join has been submitted. The organization will review your application.",
      });
      setValidatedInvite(null);
      setInviteCode("");
      onProfileUpdated();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Join",
        description: error.message || "Could not submit your request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleValidateCode = () => {
    if (!inviteCode.trim()) return;
    setIsValidating(true);
    validateInviteMutation.mutate(inviteCode.trim(), {
      onSettled: () => setIsValidating(false),
    });
  };

  const renderStatusContent = () => {
    if (!hasAffiliation) {
      return (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">No Organization</h2>
              <p className="text-muted-foreground">You need to join an organization to start delivering</p>
            </div>
          </div>
          <p className="text-muted-foreground mb-6">
            To access delivery tasks, you need to be affiliated with an NGO. Ask an organization for their 
            invite link, or enter an invite code below if you have one.
          </p>
        </>
      );
    }

    if (approvalStatus === "pending") {
      return (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Pending Approval</h2>
              <Badge variant="outline" className="mt-1 border-yellow-500 text-yellow-600 dark:text-yellow-400">
                Under Review
              </Badge>
            </div>
          </div>
          <p className="text-muted-foreground mb-6">
            Your volunteer request has been submitted and is currently being reviewed by the organization. 
            Once approved, you'll be able to see and accept delivery tasks. This usually takes 1-2 business days.
          </p>
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              What happens next?
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>The organization will review your profile</li>
              <li>You'll receive access once approved</li>
              <li>Check back here or refresh to see your status</li>
            </ul>
          </div>
        </>
      );
    }

    if (approvalStatus === "rejected") {
      return (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Request Not Approved</h2>
              <Badge variant="destructive" className="mt-1">
                Rejected
              </Badge>
            </div>
          </div>
          <p className="text-muted-foreground mb-6">
            Unfortunately, your volunteer request was not approved by the organization. 
            {agentProfile?.rejectionNotes ? " See the feedback below." : " You can try joining a different organization using an invite code below."}
          </p>
          {agentProfile?.rejectionNotes && (
            <div className="bg-muted/50 rounded-lg p-4 mb-6 border-l-4 border-destructive">
              <h3 className="font-medium mb-2">Feedback from organization:</h3>
              <p className="text-sm text-muted-foreground">{agentProfile.rejectionNotes}</p>
            </div>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} roleLabel="Delivery Agent" userRole="delivery_agent" />

      <main className="max-w-2xl mx-auto px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
            <CardDescription>
              Your delivery agent account status and next steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderStatusContent()}

            {/* Join Organization Form - show for unaffiliated or rejected */}
            {(!hasAffiliation || approvalStatus === "rejected") && (
              <div className="border-t pt-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Join an Organization
                </h3>
                
                {!validatedInvite ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-code">Invite Code</Label>
                      <div className="flex gap-2">
                        <Input
                          id="invite-code"
                          placeholder="Enter invite code (e.g., ABC-123-XYZ)"
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleValidateCode()}
                          data-testid="input-invite-code"
                        />
                        <Button 
                          onClick={handleValidateCode}
                          disabled={!inviteCode.trim() || isValidating}
                          data-testid="button-validate-code"
                        >
                          {isValidating ? "Checking..." : "Validate"}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ask an NGO for their volunteer invite link or code to join their team.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="font-medium">{validatedInvite.ngoName}</p>
                          <p className="text-sm text-muted-foreground">Valid invite code</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setValidatedInvite(null);
                          setInviteCode("");
                        }}
                        data-testid="button-cancel-join"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => { joinNgoMutation.mutate(); }}
                        disabled={joinNgoMutation.isPending}
                        data-testid="button-confirm-join"
                      >
                        {joinNgoMutation.isPending ? "Submitting..." : "Request to Join"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Help Section */}
            <div className="border-t pt-6 mt-6">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Need Help?
              </h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="mailto:support@surplusflow.org">
                    <Mail className="mr-2 h-4 w-4" />
                    Contact Support
                  </a>
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => { logout(); }}
                  data-testid="button-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
