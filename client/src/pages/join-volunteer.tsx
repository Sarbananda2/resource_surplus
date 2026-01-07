import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LocationInput } from "@/components/location-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Building2, CheckCircle, XCircle, Truck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/models/auth";

interface JoinVolunteerProps {
  user: User | null;
}

export default function JoinVolunteer({ user }: JoinVolunteerProps) {
  const [, params] = useRoute("/join/:code");
  const [, setLocation] = useLocation();
  const code = params?.code || "";
  const { toast } = useToast();
  const qc = useQueryClient();

  const [operatingArea, setOperatingArea] = useState("");
  const [transportType, setTransportType] = useState("bicycle");
  const [loadCapacity, setLoadCapacity] = useState("small");

  const { data: inviteData, isLoading, isError, error } = useQuery({
    queryKey: ["/api/invite", code],
    queryFn: async () => {
      const response = await fetch(`/api/invite/${code}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Invalid invite code");
      }
      return response.json() as Promise<{
        valid: boolean;
        ngoName: string;
        ngoId: string;
        linkId: string;
      }>;
    },
    enabled: !!code,
    retry: false,
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/delivery-agent/register-with-invite", {
        inviteCode: code,
        operatingArea,
        transportType,
        loadCapacity,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
      qc.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Request Submitted!",
        description: `Your request to join ${inviteData?.ngoName || "the organization"} has been submitted. You'll be notified once approved.`,
      });
      setLocation("/delivery-agent");
    },
    onError: (err: Error) => {
      toast({
        title: "Registration Failed",
        description: err.message || "Could not complete registration. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground">
              This invite link appears to be invalid. Please check with your organization for a valid link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Truck className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Join as a Volunteer</CardTitle>
            <CardDescription>
              Sign in to join {isLoading ? "the organization" : inviteData?.ngoName || "the organization"} as a delivery volunteer
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="w-full" data-testid="button-login">
              <a href="/api/login">Sign in with Replit</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid or Expired Link</h2>
            <p className="text-muted-foreground">
              {(error as Error)?.message || "This invite link is no longer valid. Please contact the organization for a new link."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Join {inviteData?.ngoName}</CardTitle>
          <CardDescription>
            Complete your profile to become a delivery volunteer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="operatingArea" required>Operating Area</Label>
            <LocationInput
              value={operatingArea}
              onChange={(value) => setOperatingArea(value)}
              placeholder="e.g., Downtown, Central District"
              data-testid="input-operating-area"
            />
            <p className="text-xs text-muted-foreground">
              The general area where you can pick up and deliver items
            </p>
          </div>

          <div className="space-y-2">
            <Label required>Transport Type</Label>
            <Select value={transportType} onValueChange={setTransportType}>
              <SelectTrigger data-testid="select-transport-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bicycle">Bicycle</SelectItem>
                <SelectItem value="motorcycle">Motorcycle</SelectItem>
                <SelectItem value="car">Car</SelectItem>
                <SelectItem value="van">Van</SelectItem>
                <SelectItem value="walking">Walking</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label required>Load Capacity</Label>
            <Select value={loadCapacity} onValueChange={setLoadCapacity}>
              <SelectTrigger data-testid="select-load-capacity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (bags, small boxes)</SelectItem>
                <SelectItem value="medium">Medium (multiple boxes)</SelectItem>
                <SelectItem value="large">Large (furniture, bulk items)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 rounded-md border bg-muted/50">
            <p className="text-sm text-muted-foreground">
              After submitting, your request will be reviewed by {inviteData?.ngoName}. 
              Once approved, you'll be able to see and accept delivery tasks.
            </p>
          </div>

          <Button
            onClick={() => registerMutation.mutate()}
            disabled={registerMutation.isPending || !operatingArea}
            className="w-full"
            data-testid="button-join"
          >
            {registerMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Join {inviteData?.ngoName}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
