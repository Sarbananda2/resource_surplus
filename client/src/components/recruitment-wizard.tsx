import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Link, Copy, Check, ChevronRight, ChevronLeft, Users, 
  Mail, MessageCircle, Share2, Loader2, CheckCircle2, ClipboardList
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { NgoInviteLink } from "@shared/schema";

interface RecruitmentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationName: string;
  existingLinks?: NgoInviteLink[];
  onComplete?: () => void;
}

type WizardStep = "create" | "share" | "review";

export function RecruitmentWizard({ 
  open, 
  onOpenChange, 
  organizationName,
  existingLinks = [],
  onComplete
}: RecruitmentWizardProps) {
  const [step, setStep] = useState<WizardStep>("create");
  const [linkLabel, setLinkLabel] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [createdLink, setCreatedLink] = useState<NgoInviteLink | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const createLinkMutation = useMutation({
    mutationFn: async (data: { label?: string; maxUses?: number; expiresInDays?: number }) => {
      const res = await apiRequest("POST", "/api/ngo/invite-links", data);
      return res.json() as Promise<NgoInviteLink>;
    },
    onSuccess: (link) => {
      qc.invalidateQueries({ queryKey: ["/api/ngo/invite-links"] });
      setCreatedLink(link);
      setStep("share");
      toast({
        title: "Invite Link Created",
        description: "Your invite link is ready to share!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create invite link. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateLink = () => {
    createLinkMutation.mutate({
      label: linkLabel || `Volunteer recruitment ${new Date().toLocaleDateString()}`,
      maxUses: maxUses ? parseInt(maxUses) : undefined,
      expiresInDays: 30,
    });
  };

  const getInviteUrl = (code: string) => `${window.location.origin}/join/${code}`;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
    toast({
      title: "Copied!",
      description: `${type} copied to clipboard`,
    });
  };

  const getEmailTemplate = () => {
    const url = createdLink ? getInviteUrl(createdLink.code) : "";
    return `Subject: Join ${organizationName} as a Volunteer Delivery Partner

Hi,

${organizationName} is looking for volunteer delivery partners to help redistribute surplus goods to those in need.

As a volunteer, you'll:
- Pick up donations from local donors
- Deliver items to our distribution center
- Help make a real impact in your community

Join our team: ${url}

The process is simple - just click the link above to register and we'll review your application.

Thank you for considering this opportunity to make a difference!

Best regards,
${organizationName}`;
  };

  const getWhatsAppTemplate = () => {
    const url = createdLink ? getInviteUrl(createdLink.code) : "";
    return `*Join ${organizationName} as a Volunteer!*

We're looking for delivery partners to help redistribute surplus goods to those in need.

What you'll do:
- Pick up donations from donors
- Deliver to our distribution center
- Make a real community impact

Join now: ${url}`;
  };

  const resetWizard = () => {
    setStep("create");
    setLinkLabel("");
    setMaxUses("");
    setCreatedLink(null);
    setCopied(null);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetWizard();
    }
    onOpenChange(isOpen);
  };

  const handleFinish = () => {
    handleClose(false);
    onComplete?.();
  };

  const stepIndicator = (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[
        { key: "create", label: "Create", icon: Link },
        { key: "share", label: "Share", icon: Share2 },
        { key: "review", label: "Review", icon: ClipboardList },
      ].map((s, i) => {
        const isActive = step === s.key;
        const isPast = 
          (step === "share" && s.key === "create") ||
          (step === "review" && (s.key === "create" || s.key === "share"));
        
        return (
          <div key={s.key} className="flex items-center">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
              isActive 
                ? "bg-primary text-primary-foreground" 
                : isPast 
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" 
                  : "bg-muted text-muted-foreground"
            }`}>
              {isPast ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <s.icon className="h-4 w-4" />
              )}
              <span>{s.label}</span>
            </div>
            {i < 2 && <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />}
          </div>
        );
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Build Your Team
          </DialogTitle>
          <DialogDescription>
            Recruit volunteer delivery partners in 3 easy steps
          </DialogDescription>
        </DialogHeader>

        {stepIndicator}

        {step === "create" && (
          <div className="space-y-4">
            <div className="rounded-md bg-muted/50 p-4">
              <h4 className="font-medium mb-2">Step 1: Create an Invite Link</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Generate a unique link that volunteers can use to join your organization.
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Link Label (optional)</label>
                  <Input
                    placeholder="e.g., Weekend volunteers, Local drivers"
                    value={linkLabel}
                    onChange={(e) => setLinkLabel(e.target.value)}
                    data-testid="input-wizard-link-label"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Help you identify this link later
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Max Volunteers (optional)</label>
                  <Input
                    type="number"
                    placeholder="Unlimited"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    data-testid="input-wizard-max-uses"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty for unlimited signups
                  </p>
                </div>
              </div>
            </div>

            {existingLinks.length > 0 && (
              <div className="text-sm text-muted-foreground">
                You already have {existingLinks.length} invite link{existingLinks.length !== 1 ? "s" : ""}. 
                <button 
                  className="text-primary underline-offset-4 hover:underline px-1"
                  onClick={() => setStep("review")}
                >
                  Skip to review
                </button>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateLink}
                disabled={createLinkMutation.isPending}
                data-testid="button-wizard-create-link"
              >
                {createLinkMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link className="h-4 w-4 mr-2" />
                )}
                Create Invite Link
              </Button>
            </div>
          </div>
        )}

        {step === "share" && createdLink && (
          <div className="space-y-4">
            <div className="rounded-md bg-muted/50 p-4">
              <h4 className="font-medium mb-2">Step 2: Share Your Link</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Choose how you want to reach potential volunteers.
              </p>

              <Card className="mb-4">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 w-0">
                      <p className="text-sm font-medium truncate" title={getInviteUrl(createdLink.code)}>
                        {getInviteUrl(createdLink.code)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {createdLink.label || "Invite link"} · Expires in 30 days
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={copied === "link" ? "secondary" : "default"}
                      onClick={() => copyToClipboard(getInviteUrl(createdLink.code), "link")}
                      className="flex-shrink-0"
                      data-testid="button-copy-invite-url"
                    >
                      {copied === "link" ? (
                        <Check className="h-4 w-4 mr-1" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      {copied === "link" ? "Copied" : "Copy Link"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <p className="text-sm font-medium">Ready-to-use templates:</p>
                
                <div 
                  role="button"
                  tabIndex={0}
                  className="flex items-center justify-between p-3 rounded-md border hover-elevate cursor-pointer"
                  onClick={() => copyToClipboard(getEmailTemplate(), "email")}
                  onKeyDown={(e) => e.key === "Enter" && copyToClipboard(getEmailTemplate(), "email")}
                  data-testid="button-copy-email-template"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Email Template</p>
                      <p className="text-xs text-muted-foreground">Professional email for reaching out</p>
                    </div>
                  </div>
                  <Badge variant={copied === "email" ? "secondary" : "outline"}>
                    {copied === "email" ? (
                      <><Check className="h-3 w-3 mr-1" /> Copied</>
                    ) : (
                      <><Copy className="h-3 w-3 mr-1" /> Copy</>
                    )}
                  </Badge>
                </div>

                <div 
                  role="button"
                  tabIndex={0}
                  className="flex items-center justify-between p-3 rounded-md border hover-elevate cursor-pointer"
                  onClick={() => copyToClipboard(getWhatsAppTemplate(), "whatsapp")}
                  onKeyDown={(e) => e.key === "Enter" && copyToClipboard(getWhatsAppTemplate(), "whatsapp")}
                  data-testid="button-copy-whatsapp-template"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <MessageCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">WhatsApp Message</p>
                      <p className="text-xs text-muted-foreground">Formatted for instant messaging</p>
                    </div>
                  </div>
                  <Badge variant={copied === "whatsapp" ? "secondary" : "outline"}>
                    {copied === "whatsapp" ? (
                      <><Check className="h-3 w-3 mr-1" /> Copied</>
                    ) : (
                      <><Copy className="h-3 w-3 mr-1" /> Copy</>
                    )}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep("create")}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button onClick={() => setStep("review")} data-testid="button-wizard-next-review">
                Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div className="rounded-md bg-muted/50 p-4">
              <h4 className="font-medium mb-2">Step 3: Review Applications</h4>
              <p className="text-sm text-muted-foreground mb-4">
                When volunteers sign up, they'll appear in your Team tab for approval.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-md border">
                  <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Volunteer applies via your link</p>
                    <p className="text-xs text-muted-foreground">They provide their transport type, availability, and operating area</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-md border">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Review in your Team tab</p>
                    <p className="text-xs text-muted-foreground">See pending applications and approve or decline</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-md border">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Assign tasks to approved volunteers</p>
                    <p className="text-xs text-muted-foreground">Once approved, you can assign donation pickups to them</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">You're all set!</p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Share your invite link and start building your delivery team. 
                    You can manage everything from the Team tab.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep("share")}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button onClick={handleFinish} data-testid="button-wizard-finish">
                <Users className="h-4 w-4 mr-1" />
                Go to Team Tab
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
