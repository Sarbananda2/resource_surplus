import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth-page";
import RoleSelector from "@/pages/role-selector";
import DonorDashboard from "@/pages/donor-dashboard";
import NgoDashboard from "@/pages/ngo-dashboard";
import NgoOnboarding from "@/pages/ngo-onboarding";
import DeliveryAgentDashboard from "@/pages/delivery-agent-dashboard";
import DeliveryAgentOnboarding from "@/pages/delivery-agent-onboarding";
import AgentStatusPage from "@/pages/agent-status";
import JoinVolunteer from "@/pages/join-volunteer";
import ProfilePage from "@/pages/profile";
import { StripeConnectReturn, StripeConnectRefresh } from "@/pages/stripe-connect-return";
import NotFound from "@/pages/not-found";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserProfile, NgoProfile, DeliveryAgentProfile } from "@shared/schema";

interface ProfileData {
  userProfile: UserProfile | null;
  ngoProfile?: NgoProfile | null;
  deliveryAgentProfile?: DeliveryAgentProfile | null;
}

function AppContent() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();

  const { data: profileData, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = useQuery<ProfileData>({
    queryKey: ["/api/profile"],
    enabled: isAuthenticated,
    retry: false,
  });

  if (authLoading || (isAuthenticated && profileLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  // Detect incomplete auth state: user thinks they're authenticated but profile fetch failed (401)
  if (isAuthenticated && profileError) {
    // Clear the invalid session and redirect to auth
    logout();
    return <Redirect to="/auth" />;
  }

  if (!isAuthenticated || !user) {
    return <Landing />;
  }

  const userProfile = profileData?.userProfile;

  if (!userProfile) {
    return (
      <RoleSelector 
        onRoleSelected={() => refetchProfile()} 
      />
    );
  }

  if (userProfile.role === "ngo" && !userProfile.isOnboarded) {
    return <NgoOnboarding onComplete={() => refetchProfile()} />;
  }

  if (userProfile.role === "delivery_agent" && !userProfile.isOnboarded) {
    return <DeliveryAgentOnboarding onComplete={() => refetchProfile()} />;
  }

  switch (userProfile.role) {
    case "donor":
      return <DonorDashboard user={user} />;
    case "ngo":
      return <NgoDashboard user={user} />;
    case "delivery_agent": {
      const agentProfile = profileData?.deliveryAgentProfile;
      const needsStatusPage = !agentProfile?.affiliatedNgoId || agentProfile?.approvalStatus !== "approved";
      
      if (needsStatusPage) {
        return (
          <AgentStatusPage 
            user={user} 
            agentProfile={agentProfile || null} 
            onProfileUpdated={() => refetchProfile()} 
          />
        );
      }
      return <DeliveryAgentDashboard user={user} />;
    }
    default:
      return <NotFound />;
  }
}

function JoinWrapper() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }
  
  return <JoinVolunteer user={user || null} />;
}

function ProfileWrapper() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Landing />;
  }

  return <ProfilePage user={user} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Switch>
            <Route path="/auth" component={AuthPage} />
            <Route path="/join/:code" component={JoinWrapper} />
            <Route path="/profile" component={ProfileWrapper} />
            <Route path="/ngo/stripe-connect/return" component={StripeConnectReturn} />
            <Route path="/ngo/stripe-connect/refresh" component={StripeConnectRefresh} />
            <Route path="/donor" component={AppContent} />
            <Route path="/" component={AppContent} />
            <Route component={NotFound} />
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
