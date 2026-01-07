import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RefreshCw, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface StripeConnectStatus {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingComplete: boolean;
  pendingBalance: number;
}

export function StripeConnectReturn() {
  const [, setLocation] = useLocation();

  const { data: status, isLoading } = useQuery<StripeConnectStatus>({
    queryKey: ["/api/ngo/stripe-connect/status"],
    refetchInterval: 2000,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (status?.onboardingComplete && status?.payoutsEnabled) {
      const timer = setTimeout(() => {
        setLocation("/ngo");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <RefreshCw className="h-12 w-12 mx-auto text-muted-foreground animate-spin" />
            <CardTitle>Verifying your account...</CardTitle>
            <CardDescription>Please wait while we confirm your setup</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isComplete = status?.onboardingComplete && status?.payoutsEnabled;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {isComplete ? (
            <>
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
              <CardTitle>Payout Setup Complete</CardTitle>
              <CardDescription>
                Your account is now ready to receive payouts. Donations will be transferred directly to your bank account.
              </CardDescription>
            </>
          ) : (
            <>
              <RefreshCw className="h-12 w-12 mx-auto text-amber-500" />
              <CardTitle>Setup Incomplete</CardTitle>
              <CardDescription>
                Your account setup is not yet complete. Some information may still be required to enable payouts.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {isComplete ? (
            <Button onClick={() => setLocation("/ngo")} data-testid="button-go-to-dashboard">
              Go to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <>
              <Button onClick={() => setLocation("/ngo?tab=payouts")} data-testid="button-complete-setup">
                Complete Setup
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="ghost" onClick={() => setLocation("/ngo")} data-testid="button-go-to-dashboard-later">
                I'll do this later
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function StripeConnectRefresh() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/ngo?tab=payouts&refresh=true");
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <RefreshCw className="h-12 w-12 mx-auto text-muted-foreground animate-spin" />
          <CardTitle>Redirecting...</CardTitle>
          <CardDescription>Taking you back to complete your setup</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
