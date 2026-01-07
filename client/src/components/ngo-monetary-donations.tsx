import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IndianRupee, Heart, CheckCircle, Clock, XCircle, TrendingUp, Building2, AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MonetaryDonation {
  id: string;
  donorProfileId: string;
  amount: number;
  currency: string;
  status: string;
  message: string | null;
  isAnonymous: boolean;
  createdAt: string;
  completedAt: string | null;
  donorName: string;
}

interface NgoMonetaryDonationsData {
  donations: MonetaryDonation[];
  totalReceived: number;
}

interface StripeConnectStatus {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingComplete: boolean;
  pendingBalance: number;
  accountId?: string;
}

export function NgoMonetaryDonations() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { toast } = useToast();

  const { data: stripeStatus, isLoading: stripeLoading } = useQuery<StripeConnectStatus>({
    queryKey: ["/api/ngo/stripe-connect/status"],
    refetchInterval: 30000,
  });

  const startOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ngo/stripe-connect/onboard");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        setIsRedirecting(true);
        window.location.href = data.url;
      } else if (data.error) {
        toast({
          title: "Connection Failed",
          description: data.error,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Stripe. Please try again.",
        variant: "destructive",
      });
    },
  });

  const refreshLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ngo/stripe-connect/refresh-link");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        setIsRedirecting(true);
        window.location.href = data.url;
      } else if (data.error) {
        toast({
          title: "Connection Failed",
          description: data.error,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to refresh Stripe link. Please try again.",
        variant: "destructive",
      });
    },
  });
  const { data, isLoading } = useQuery<NgoMonetaryDonationsData>({
    queryKey: ["/api/ngo/monetary-donations"],
  });

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="h-4 w-4 text-yellow-600" />,
    completed: <CheckCircle className="h-4 w-4 text-green-600" />,
    failed: <XCircle className="h-4 w-4 text-red-600" />,
    expired: <AlertCircle className="h-4 w-4 text-orange-600" />,
    refunded: <XCircle className="h-4 w-4 text-gray-600" />,
  };

  const statusLabels: Record<string, string> = {
    pending: "Processing",
    completed: "Received",
    failed: "Failed",
    expired: "Expired",
    refunded: "Refunded",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    expired: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    refunded: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };

  const completedDonations = data?.donations.filter(d => d.status === "completed") || [];
  const pendingDonations = data?.donations.filter(d => d.status === "pending") || [];
  const failedOrExpiredDonations = data?.donations.filter(d => d.status === "failed" || d.status === "expired") || [];

  if (isLoading || stripeLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isOnboarding = startOnboardingMutation.isPending || refreshLinkMutation.isPending || isRedirecting;

  return (
    <div className="space-y-6">
      <Card className={stripeStatus?.payoutsEnabled ? "border-green-200 dark:border-green-800" : "border-amber-200 dark:border-amber-800"}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${stripeStatus?.payoutsEnabled ? "bg-green-100 dark:bg-green-900" : "bg-amber-100 dark:bg-amber-900"}`}>
                <Building2 className={`h-5 w-5 ${stripeStatus?.payoutsEnabled ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`} />
              </div>
              <div>
                <CardTitle className="text-lg">Bank Payouts</CardTitle>
                <CardDescription>
                  {stripeStatus?.payoutsEnabled 
                    ? "Your bank account is connected. Donations are transferred automatically."
                    : stripeStatus?.connected 
                      ? "Complete your setup to receive payouts"
                      : "Connect your bank account to receive donations directly"
                  }
                </CardDescription>
              </div>
            </div>
            <Badge variant={stripeStatus?.payoutsEnabled ? "default" : "secondary"}>
              {stripeStatus?.payoutsEnabled 
                ? "Active" 
                : stripeStatus?.connected 
                  ? "Setup Incomplete"
                  : "Not Connected"
              }
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {stripeStatus?.payoutsEnabled ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Payments are being routed directly to your bank account</span>
            </div>
          ) : (
            <div className="space-y-4">
              {stripeStatus?.connected && !stripeStatus.onboardingComplete && (
                <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Your account setup is incomplete. Please continue to provide the required information.</span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => {
                    if (stripeStatus?.connected) {
                      refreshLinkMutation.mutate();
                    } else {
                      startOnboardingMutation.mutate();
                    }
                  }}
                  disabled={isOnboarding}
                  data-testid="button-connect-bank"
                >
                  {isOnboarding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      {stripeStatus?.connected ? "Complete Setup" : "Connect Bank Account"}
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground self-center">
                  Powered by Stripe for secure payments
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Received</p>
                <p className="text-2xl font-bold flex items-center">
                  <IndianRupee className="h-5 w-5" />
                  {((data?.totalReceived || 0) / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed Donations</p>
                <p className="text-2xl font-bold">{completedDonations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingDonations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Received Donations</CardTitle>
          <CardDescription>Financial contributions from supporters</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingDonations.length > 0 && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md mb-4">
              <Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-yellow-600" />
              <span>
                <strong>{pendingDonations.length} donation{pendingDonations.length > 1 ? 's' : ''}</strong> {pendingDonations.length > 1 ? 'are' : 'is'} processing. 
                These are awaiting payment confirmation and will update automatically.
              </span>
            </div>
          )}
          {!data?.donations || data.donations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No monetary donations received yet</p>
              <p className="text-sm">Donations from supporters will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.donations.map((donation) => (
                <div
                  key={donation.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                  data-testid={`ngo-donation-${donation.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium">{donation.donorName}</span>
                      <Badge className={statusColors[donation.status] || statusColors.pending} variant="secondary">
                        <span className="flex items-center gap-1">
                          {statusIcons[donation.status] || statusIcons.pending}
                          {statusLabels[donation.status] || donation.status}
                        </span>
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(donation.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    {donation.message && (
                      <p className="text-sm mt-1 text-muted-foreground italic">"{donation.message}"</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold flex items-center">
                      <IndianRupee className="h-4 w-4" />
                      {(donation.amount / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
