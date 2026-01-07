import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePollingQuery } from "@/hooks/use-polling";
import { LastUpdated } from "@/components/last-updated";
import { DonationDetailDrawer } from "@/components/donation-detail-drawer";
import { SignedImage } from "@/components/signed-image";
import { VolunteerDetailDrawer, type EnrichedVolunteer } from "@/components/volunteer-detail-drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { DashboardStatusTabs, TabDefinition } from "@/components/dashboard-status-tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/app-header";
import { DistributionEventForm } from "@/components/distribution-event-form";
import { CompleteEventForm } from "@/components/complete-event-form";
import { 
  Search, Package, Truck, Warehouse, Calendar, Check, X, 
  Clock, AlertTriangle, MapPin, ChevronRight, Eye, MessageSquare, Loader2,
  Users, Link, Copy, Plus, ToggleLeft, ToggleRight, IndianRupee, UserX, UserCheck, UserMinus,
  CheckCircle, Image as ImageIcon, UserPlus
} from "lucide-react";
import { NgoMonetaryDonations } from "@/components/ngo-monetary-donations";
import { RecruitmentWizard } from "@/components/recruitment-wizard";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/models/auth";
import type { Donation, DeliveryTask, DistributionEvent, ItemCategory, ItemCondition, Priority, NgoConsentRequest, NgoInviteLink, DeliveryAgentProfile } from "@shared/schema";
import { getTransportTypeLabel } from "@shared/constants";

interface EnrichedConsentRequest extends NgoConsentRequest {
  donation: {
    category: ItemCategory;
    quantity: number;
    area: string;
    createdAt: Date | null;
  } | null;
}

interface NgoDashboardProps {
  user: User;
}

const categoryLabels: Record<ItemCategory, string> = {
  clothing: "Clothing",
  food: "Food",
  essentials: "Essentials",
  household: "Household",
  other: "Other",
};

const conditionLabels: Record<ItemCondition, string> = {
  usable: "Usable",
  near_expiry: "Near Expiry",
  fragile: "Fragile",
};

const priorityColors: Record<Priority, string> = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function NgoDashboard({ user }: NgoDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isCompleteEventDialogOpen, setIsCompleteEventDialogOpen] = useState(false);
  const [selectedEventToComplete, setSelectedEventToComplete] = useState<DistributionEvent | null>(null);
  const [selectedDonationId, setSelectedDonationId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { 
    data: availableDonations, 
    isLoading: loadingAvailable,
    lastUpdated,
    isRefetching,
    isError 
  } = usePollingQuery<Donation[]>({
    queryKey: ["/api/ngo/available-donations"],
    intervalMs: 30000,
  });

  const { data: acceptedDonations, isLoading: loadingAccepted } = usePollingQuery<Donation[]>({
    queryKey: ["/api/ngo/donations", "accepted"],
    intervalMs: 30000,
  });

  const { data: warehouseDonations, isLoading: loadingWarehouse } = usePollingQuery<Donation[]>({
    queryKey: ["/api/ngo/donations", "warehouse"],
    intervalMs: 30000,
  });

  const { data: distributedDonations, isLoading: loadingDistributed } = usePollingQuery<Donation[]>({
    queryKey: ["/api/ngo/donations", "distributed"],
    intervalMs: 30000,
  });

  const { data: distributionEvents, isLoading: loadingEvents } = usePollingQuery<DistributionEvent[]>({
    queryKey: ["/api/ngo/distribution-events"],
    intervalMs: 30000,
  });

  const { data: consentRequests, isLoading: loadingRequests, isError: requestsError } = usePollingQuery<EnrichedConsentRequest[]>({
    queryKey: ["/api/ngo/consent-requests"],
    intervalMs: 30000,
  });

  const { data: inviteLinks, isLoading: loadingLinks } = usePollingQuery<NgoInviteLink[]>({
    queryKey: ["/api/ngo/invite-links"],
    intervalMs: 30000,
  });

  const { data: volunteers, isLoading: loadingVolunteers } = usePollingQuery<DeliveryAgentProfile[]>({
    queryKey: ["/api/ngo/volunteers"],
    intervalMs: 30000,
  });

  const { data: ngoTasks, isLoading: loadingTasks } = usePollingQuery<DeliveryTask[]>({
    queryKey: ["/api/ngo/tasks"],
    intervalMs: 30000,
  });

  const { data: availableVolunteers, isLoading: loadingAvailableVolunteers } = usePollingQuery<EnrichedVolunteer[]>({
    queryKey: ["/api/ngo/volunteers/available"],
    intervalMs: 30000,
  });

  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState<EnrichedVolunteer | null>(null);
  const [isVolunteerDrawerOpen, setIsVolunteerDrawerOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [isCreateLinkDialogOpen, setIsCreateLinkDialogOpen] = useState(false);
  const [isRecruitmentWizardOpen, setIsRecruitmentWizardOpen] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkMaxUses, setNewLinkMaxUses] = useState<string>("");
  const [newLinkExpiresDays, setNewLinkExpiresDays] = useState<string>("");

  const respondToRequestMutation = useMutation({
    mutationFn: async ({ id, decision, note }: { id: string; decision: "approved" | "denied"; note?: string }) => {
      setPendingRequestId(id);
      return apiRequest("POST", `/api/ngo/consent-requests/${id}/decision`, { decision, note });
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["/api/ngo"] });
      toast({
        title: variables.decision === "approved" ? "Request Approved" : "Request Denied",
        description: variables.decision === "approved" 
          ? "The donor can now see your organization details."
          : "The request has been declined.",
      });
      setPendingRequestId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to respond to request. Please try again.",
        variant: "destructive",
      });
      setPendingRequestId(null);
    },
  });

  const openDrawer = (donationId: string) => {
    setSelectedDonationId(donationId);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedDonationId(null);
  };

  const acceptDonationMutation = useMutation({
    mutationFn: async ({ id, priority, assignedAgentProfileId }: { id: string; priority?: Priority; assignedAgentProfileId?: string }) => {
      return apiRequest("POST", `/api/ngo/donations/${id}/accept`, { priority, assignedAgentProfileId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ngo"] });
      toast({
        title: "Donation Accepted",
        description: "The donation has been assigned to your organization.",
      });
      closeDrawer();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to accept donation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const confirmReceiptMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("POST", `/api/ngo/donations/${id}/confirm-receipt`, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ngo"] });
      toast({
        title: "Receipt Confirmed",
        description: "The item is now in your warehouse inventory.",
      });
      closeDrawer();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to confirm receipt. Please try again.",
        variant: "destructive",
      });
    },
  });

  const assignAgentToTaskMutation = useMutation({
    mutationFn: async ({ taskId, agentProfileId }: { taskId: string; agentProfileId: string }) => {
      return apiRequest("POST", `/api/ngo/tasks/${taskId}/assign`, { agentProfileId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ngo/tasks"] });
      qc.invalidateQueries({ queryKey: ["/api/ngo/volunteers/available"] });
      toast({
        title: "Volunteer Assigned",
        description: "The volunteer has been assigned to this pickup task.",
      });
      setIsAssignDialogOpen(false);
      setSelectedTaskId(null);
      setSelectedAgentId("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign volunteer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createInviteLinkMutation = useMutation({
    mutationFn: async (data: { label?: string; maxUses?: number; expiresInDays?: number }) => {
      return apiRequest("POST", "/api/ngo/invite-links", data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ngo/invite-links"] });
      toast({
        title: "Invite Link Created",
        description: "Share this link with volunteers to join your team.",
      });
      setIsCreateLinkDialogOpen(false);
      setNewLinkLabel("");
      setNewLinkMaxUses("");
      setNewLinkExpiresDays("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create invite link. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleInviteLinkMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/ngo/invite-links/${id}`, { isActive });
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["/api/ngo/invite-links"] });
      toast({
        title: variables.isActive ? "Link Activated" : "Link Deactivated",
        description: variables.isActive 
          ? "This invite link is now active and can be used."
          : "This invite link has been deactivated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update invite link. Please try again.",
        variant: "destructive",
      });
    },
  });

  const approveVolunteerMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/ngo/volunteers/${id}/approve`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ngo/volunteers"] });
      qc.invalidateQueries({ queryKey: ["/api/ngo/volunteers/available"] });
      setIsVolunteerDrawerOpen(false);
      setSelectedVolunteer(null);
      toast({
        title: "Volunteer Approved",
        description: "The volunteer can now accept delivery tasks.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve volunteer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectVolunteerMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      return apiRequest("POST", `/api/ngo/volunteers/${id}/reject`, { notes });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ngo/volunteers"] });
      setIsVolunteerDrawerOpen(false);
      setSelectedVolunteer(null);
      toast({
        title: "Volunteer Rejected",
        description: "The volunteer request has been rejected.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject volunteer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const removeVolunteerMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/ngo/volunteers/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ngo/volunteers"] });
      qc.invalidateQueries({ queryKey: ["/api/ngo/volunteers/available"] });
      toast({
        title: "Volunteer Removed",
        description: "The volunteer has been removed from your team.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove volunteer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyInviteLink = (code: string) => {
    const url = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Invite link has been copied to clipboard.",
    });
  };

  const handleCreateLink = () => {
    createInviteLinkMutation.mutate({
      label: newLinkLabel || undefined,
      maxUses: newLinkMaxUses ? parseInt(newLinkMaxUses) : undefined,
      expiresInDays: newLinkExpiresDays ? parseInt(newLinkExpiresDays) : undefined,
    });
  };

  const filteredDonations = availableDonations?.filter((d) => {
    const matchesSearch = !searchQuery || 
      d.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  const pendingPickup = acceptedDonations?.filter(d => d.status === "assigned") || [];
  const inTransit = acceptedDonations?.filter(d => d.status === "collected") || [];
  const pendingReceipt = acceptedDonations?.filter(d => d.status === "delivered") || [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} roleLabel="NGO" userRole="ngo" />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-medium">Operations Dashboard</h1>
            <p className="text-muted-foreground">Manage donations and distributions</p>
          </div>
          <LastUpdated lastUpdated={lastUpdated} isRefetching={isRefetching} isError={isError} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-medium">{filteredDonations.length}</p>
                  <p className="text-xs text-muted-foreground">Available</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-medium">{inTransit.length}</p>
                  <p className="text-xs text-muted-foreground">In Transit</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <Warehouse className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-medium">{warehouseDonations?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">In Warehouse</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-medium">{distributedDonations?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Distributed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-medium">{distributionEvents?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="available" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <DashboardStatusTabs
              tabs={[
                { value: "available", label: "Available", icon: Package, testId: "tab-available", showBadge: true },
                { value: "accepted", label: "Accepted", icon: Clock, testId: "tab-accepted" },
                { value: "warehouse", label: "Warehouse", icon: Warehouse, testId: "tab-warehouse" },
                { value: "distributed", label: "Distributed", icon: CheckCircle, testId: "tab-distributed" },
                { value: "events", label: "Events", icon: Calendar, testId: "tab-events" },
                { value: "requests", label: "Requests", icon: MessageSquare, testId: "tab-requests", showBadge: true },
                { value: "tasks", label: "Tasks", icon: Truck, testId: "tab-tasks", showBadge: true },
                { value: "team", label: "Team", icon: Users, testId: "tab-team", showBadge: true },
                { value: "funds", label: "Funds", icon: IndianRupee, testId: "tab-funds" },
              ]}
              badgeCounts={{
                available: availableDonations?.length || 0,
                requests: consentRequests?.length || 0,
                tasks: ngoTasks?.filter(t => t.status === "pending" && !t.deliveryAgentProfileId).length || 0,
                team: volunteers?.filter(v => v.approvalStatus === "pending").length || 0,
              }}
              isLoading={loadingAvailable}
            />
          </div>

          <TabsContent value="available" className="space-y-4">
            {/* Motivational banner when no volunteers available */}
            {!loadingAvailableVolunteers && (!availableVolunteers || availableVolunteers.length === 0) && filteredDonations.length > 0 && (
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                        {filteredDonations.length} donation{filteredDonations.length !== 1 ? 's' : ''} waiting for you
                      </h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                        Build your delivery team to start accepting these donations before other NGOs do.
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-amber-300 dark:border-amber-700"
                        onClick={() => setIsRecruitmentWizardOpen(true)}
                        data-testid="button-build-team-banner"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Build Your Team
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by area..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-filter-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="essentials">Essentials</SelectItem>
                  <SelectItem value="household">Household</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loadingAvailable ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : filteredDonations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No available donations</h3>
                  <p className="text-muted-foreground">
                    Check back later for new surplus items in your area.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredDonations.map((donation) => (
                  <Card key={donation.id} data-testid={`card-available-${donation.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{categoryLabels[donation.category]}</span>
                            <Badge variant="outline">{conditionLabels[donation.condition]}</Badge>
                            {donation.condition === "near_expiry" && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Time Sensitive
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {donation.quantity} item{donation.quantity > 1 ? "s" : ""} · {donation.area}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Until {new Date(donation.availabilityEnd).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {donation.area}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => openDrawer(donation.id)}
                          data-testid={`button-view-${donation.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View & Accept
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="accepted" className="space-y-4">
            {pendingPickup.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Pending Pickup</h3>
                {pendingPickup.map((donation) => (
                  <Card key={donation.id} data-testid={`card-pending-${donation.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{categoryLabels[donation.category]}</span>
                            <Badge variant="secondary">Awaiting Pickup</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {donation.quantity} item{donation.quantity > 1 ? "s" : ""} from {donation.area}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDrawer(donation.id)}
                          data-testid={`button-view-pending-${donation.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {inTransit.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">In Transit</h3>
                {inTransit.map((donation) => (
                  <Card key={donation.id} data-testid={`card-transit-${donation.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{categoryLabels[donation.category]}</span>
                            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                              In Transit
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {donation.quantity} item{donation.quantity > 1 ? "s" : ""} from {donation.area}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDrawer(donation.id)}
                          data-testid={`button-view-transit-${donation.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {pendingReceipt.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Pending Receipt Confirmation</h3>
                {pendingReceipt.map((donation) => (
                  <Card key={donation.id} data-testid={`card-receipt-${donation.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{categoryLabels[donation.category]}</span>
                            <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                              Delivered
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {donation.quantity} item{donation.quantity > 1 ? "s" : ""} from {donation.area}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDrawer(donation.id)}
                            data-testid={`button-view-receipt-${donation.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => confirmReceiptMutation.mutate({ id: donation.id, status: "received" })}
                            disabled={confirmReceiptMutation.isPending}
                            data-testid={`button-confirm-${donation.id}`}
                          >
                            Received
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {pendingPickup.length === 0 && inTransit.length === 0 && pendingReceipt.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No accepted donations</h3>
                  <p className="text-muted-foreground">
                    Accept donations from the Available tab to see them here.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="warehouse" className="space-y-4">
            {loadingWarehouse ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : warehouseDonations?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Warehouse className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Warehouse is empty</h3>
                  <p className="text-muted-foreground">
                    Items will appear here after delivery confirmation.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {warehouseDonations?.map((donation) => (
                  <Card key={donation.id} data-testid={`card-warehouse-${donation.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{categoryLabels[donation.category]}</span>
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              In Warehouse
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {donation.quantity} item{donation.quantity > 1 ? "s" : ""} · 
                            Received {new Date(donation.updatedAt!).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDrawer(donation.id)}
                          data-testid={`button-view-warehouse-${donation.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="distributed" className="space-y-4">
            {loadingDistributed ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : distributedDonations?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No distributed items yet</h3>
                  <p className="text-muted-foreground">
                    Items will appear here after they are distributed at events.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {distributedDonations?.map((donation) => {
                  const linkedEvent = distributionEvents?.find(e => e.id === donation.distributionEventId);
                  return (
                    <Card key={donation.id} data-testid={`card-distributed-${donation.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{categoryLabels[donation.category]}</span>
                              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                Distributed
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {donation.quantity} item{donation.quantity > 1 ? "s" : ""} · 
                              Distributed {donation.distributedAt ? new Date(donation.distributedAt).toLocaleDateString() : "N/A"}
                            </p>
                            {linkedEvent && (
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{linkedEvent.distributionType} at {linkedEvent.area}</span>
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDrawer(donation.id)}
                            data-testid={`button-view-distributed-${donation.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-event">Schedule Distribution Event</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Schedule Distribution Event</DialogTitle>
                  </DialogHeader>
                  <DistributionEventForm 
                    onSuccess={() => {
                      setIsEventDialogOpen(false);
                      qc.invalidateQueries({ queryKey: ["/api/ngo/distribution-events"] });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>

            {loadingEvents ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : distributionEvents?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No distribution events</h3>
                  <p className="text-muted-foreground mb-4">
                    Create events to show donors how their items are being distributed.
                  </p>
                  <Button onClick={() => setIsEventDialogOpen(true)}>
                    Create First Event
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {distributionEvents?.map((event) => (
                  <Card key={event.id} data-testid={`card-event-${event.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {event.status === "completed" && event.photoUrls && event.photoUrls[0] ? (
                          <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            <SignedImage 
                              objectPath={event.photoUrls[0]} 
                              alt="Distribution event" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-md bg-muted flex-shrink-0 flex items-center justify-center">
                            <Calendar className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{event.distributionType}</span>
                            {event.status === "completed" ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Completed
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 gap-1">
                                <Clock className="h-3 w-3" />
                                Scheduled
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.eventDate).toLocaleDateString()} · {event.area}
                          </p>
                          {event.status === "completed" ? (
                            <p className="text-sm text-muted-foreground">
                              {event.itemCount} items · {event.beneficiaryCount || 0} people served
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {event.estimatedBeneficiaryCount ? `~${event.estimatedBeneficiaryCount} expected` : "Pending completion"}
                            </p>
                          )}
                        </div>
                        {event.status === "scheduled" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedEventToComplete(event);
                              setIsCompleteEventDialogOpen(true);
                            }}
                            data-testid={`button-complete-event-${event.id}`}
                          >
                            <ImageIcon className="h-4 w-4 mr-2" />
                            Complete
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Dialog open={isCompleteEventDialogOpen} onOpenChange={setIsCompleteEventDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Complete Distribution Event</DialogTitle>
                </DialogHeader>
                {selectedEventToComplete && (
                  <CompleteEventForm 
                    event={selectedEventToComplete}
                    onSuccess={() => {
                      setIsCompleteEventDialogOpen(false);
                      setSelectedEventToComplete(null);
                    }}
                    onCancel={() => {
                      setIsCompleteEventDialogOpen(false);
                      setSelectedEventToComplete(null);
                    }}
                  />
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            {loadingRequests ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : requestsError ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
                  <h3 className="text-lg font-medium mb-2">Failed to load requests</h3>
                  <p className="text-muted-foreground">
                    There was an error loading consent requests. The data will refresh automatically.
                  </p>
                </CardContent>
              </Card>
            ) : !consentRequests || consentRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No pending requests</h3>
                  <p className="text-muted-foreground">
                    When donors request to see your organization details, they'll appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {consentRequests.map((request) => (
                  <Card key={request.id} data-testid={`card-request-${request.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {request.donation ? categoryLabels[request.donation.category] : "Donation"} Details Request
                            </span>
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          </div>
                          {request.donation && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {request.donation.quantity} item{request.donation.quantity > 1 ? "s" : ""} from {request.donation.area}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Requested {request.requestedAt ? new Date(request.requestedAt).toLocaleDateString() : "recently"}
                            {request.expiresAt && (
                              <> · Expires {new Date(request.expiresAt).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => respondToRequestMutation.mutate({ id: request.id, decision: "denied" })}
                            disabled={pendingRequestId === request.id}
                            data-testid={`button-deny-${request.id}`}
                          >
                            {pendingRequestId === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => respondToRequestMutation.mutate({ id: request.id, decision: "approved" })}
                            disabled={pendingRequestId === request.id}
                            data-testid={`button-approve-${request.id}`}
                          >
                            {pendingRequestId === request.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 mr-1" />
                            )}
                            Approve
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Delivery Tasks</CardTitle>
                <CardDescription>Manage pickup tasks and assign volunteers</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTasks ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : !ngoTasks || ngoTasks.length === 0 ? (
                  <div className="py-8 text-center">
                    <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No delivery tasks</h3>
                    <p className="text-muted-foreground">
                      When you accept donations, pickup tasks will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ngoTasks.map((task) => {
                      const assignedVolunteer = task.deliveryAgentProfileId 
                        ? availableVolunteers?.find(v => v.id === task.deliveryAgentProfileId) || 
                          volunteers?.find(v => v.id === task.deliveryAgentProfileId)
                        : null;
                      
                      return (
                        <div 
                          key={task.id} 
                          className="flex items-center justify-between p-4 rounded-md border"
                          data-testid={`task-${task.id}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={
                                task.status === "pending" ? "secondary" :
                                task.status === "in_progress" ? "default" :
                                task.status === "completed" ? "outline" : "secondary"
                              }>
                                {task.status === "pending" ? "Pending Pickup" :
                                 task.status === "in_progress" ? "In Progress" :
                                 task.status === "completed" ? "Completed" : task.status}
                              </Badge>
                              {task.assignmentType === "ngo_assigned" && (
                                <Badge variant="outline">Pre-assigned</Badge>
                              )}
                              {task.assignmentType === "self_claimed" && (
                                <Badge variant="outline">Self-claimed</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {task.pickupArea} → {task.dropoffArea}
                            </p>
                            {assignedVolunteer && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Assigned to: {(assignedVolunteer as EnrichedVolunteer).displayName || assignedVolunteer.operatingArea || "Volunteer"}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {task.status === "pending" && !task.deliveryAgentProfileId && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedTaskId(task.id);
                                  setIsAssignDialogOpen(true);
                                }}
                                data-testid={`button-assign-${task.id}`}
                              >
                                <Users className="h-4 w-4 mr-1" />
                                Assign
                              </Button>
                            )}
                            {task.status === "pending" && task.deliveryAgentProfileId && (
                              <Badge variant="secondary">Awaiting Pickup</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assign Volunteer Dialog */}
            <Dialog open={isAssignDialogOpen} onOpenChange={(open) => {
              setIsAssignDialogOpen(open);
              if (!open) {
                setSelectedTaskId(null);
                setSelectedAgentId("");
              }
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Volunteer</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select a volunteer</label>
                    {loadingAvailableVolunteers ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : !availableVolunteers || availableVolunteers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No available volunteers. Invite team members first.
                      </p>
                    ) : (
                      <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                        <SelectTrigger data-testid="select-assign-volunteer">
                          <SelectValue placeholder="Choose a volunteer..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableVolunteers.map((volunteer) => (
                            <SelectItem key={volunteer.id} value={volunteer.id}>
                              {volunteer.displayName} ({getTransportTypeLabel(volunteer.transportType)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    disabled={!selectedAgentId || !selectedTaskId || assignAgentToTaskMutation.isPending}
                    onClick={() => {
                      if (selectedTaskId && selectedAgentId) {
                        assignAgentToTaskMutation.mutate({ 
                          taskId: selectedTaskId, 
                          agentProfileId: selectedAgentId 
                        });
                      }
                    }}
                    data-testid="button-confirm-assign"
                  >
                    {assignAgentToTaskMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Assign Volunteer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Invite Links Section */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
                  <div>
                    <CardTitle className="text-lg">Invite Links</CardTitle>
                    <CardDescription>Create and manage volunteer invite links</CardDescription>
                  </div>
                  <Dialog open={isCreateLinkDialogOpen} onOpenChange={setIsCreateLinkDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-create-invite">
                        <Plus className="h-4 w-4 mr-1" />
                        Create Link
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Invite Link</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Label</label>
                          <Input
                            placeholder="e.g., Weekend volunteers"
                            value={newLinkLabel}
                            onChange={(e) => setNewLinkLabel(e.target.value)}
                            data-testid="input-link-label"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Max uses</label>
                          <Input
                            type="number"
                            placeholder="Unlimited"
                            value={newLinkMaxUses}
                            onChange={(e) => setNewLinkMaxUses(e.target.value)}
                            data-testid="input-link-max-uses"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Expires in days</label>
                          <Input
                            type="number"
                            placeholder="Never"
                            value={newLinkExpiresDays}
                            onChange={(e) => setNewLinkExpiresDays(e.target.value)}
                            data-testid="input-link-expires"
                          />
                        </div>
                        <Button 
                          onClick={handleCreateLink} 
                          className="w-full"
                          disabled={createInviteLinkMutation.isPending}
                          data-testid="button-confirm-create-link"
                        >
                          {createInviteLinkMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Link className="h-4 w-4 mr-2" />
                          )}
                          Create Invite Link
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {loadingLinks ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : !inviteLinks || inviteLinks.length === 0 ? (
                    <div className="py-6 space-y-4">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                          <Link className="h-6 w-6 text-primary" />
                        </div>
                        <h4 className="font-medium mb-1">Create Your First Invite Link</h4>
                        <p className="text-sm text-muted-foreground">
                          Share the link with potential volunteers to build your team
                        </p>
                      </div>
                      
                      <div className="bg-muted/50 rounded-md p-4 space-y-3">
                        <p className="text-sm font-medium">How it works:</p>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0">1</span>
                            <span>Create an invite link with optional limits</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0">2</span>
                            <span>Share via WhatsApp, email, or social media</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0">3</span>
                            <span>Review and approve applications below</span>
                          </div>
                        </div>
                      </div>

                      <Button 
                        className="w-full"
                        onClick={() => setIsRecruitmentWizardOpen(true)}
                        data-testid="button-get-started-team"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Get Started
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {inviteLinks.map((link) => {
                        const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
                        const isMaxedOut = link.maxUses && (link.usedCount || 0) >= link.maxUses;
                        const isDisabled = link.isActive === false || !!isExpired || !!isMaxedOut;
                        
                        return (
                          <div 
                            key={link.id} 
                            className={`p-3 rounded-md border ${isDisabled ? 'opacity-60' : ''}`}
                            data-testid={`invite-link-${link.id}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">
                                    {link.code}
                                  </code>
                                  {link.label && (
                                    <span className="text-sm text-muted-foreground">{link.label}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                                  <span>{link.usedCount || 0}{link.maxUses ? `/${link.maxUses}` : ''} uses</span>
                                  {isExpired && <Badge variant="destructive">Expired</Badge>}
                                  {isMaxedOut && <Badge variant="secondary">Limit reached</Badge>}
                                  {!link.isActive && <Badge variant="outline">Inactive</Badge>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => copyInviteLink(link.code)}
                                  disabled={isDisabled}
                                  data-testid={`button-copy-${link.id}`}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => toggleInviteLinkMutation.mutate({ id: link.id, isActive: !link.isActive })}
                                  data-testid={`button-toggle-${link.id}`}
                                >
                                  {link.isActive ? (
                                    <ToggleRight className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ToggleLeft className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pending Volunteers */}
              {volunteers && volunteers.filter(v => v.approvalStatus === "pending").length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-500" />
                      Pending Approval
                    </CardTitle>
                    <CardDescription>
                      {volunteers.filter(v => v.approvalStatus === "pending").length} volunteer{volunteers.filter(v => v.approvalStatus === "pending").length !== 1 ? 's' : ''} waiting for approval
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {volunteers.filter(v => v.approvalStatus === "pending").map((volunteer) => (
                        <div 
                          key={volunteer.id} 
                          className="flex items-center justify-between p-3 rounded-md border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950"
                          data-testid={`pending-volunteer-${volunteer.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                              <Truck className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {(volunteer as EnrichedVolunteer).displayName || "Volunteer"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {getTransportTypeLabel(volunteer.transportType)} · {volunteer.operatingArea || "Area not specified"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedVolunteer(volunteer as EnrichedVolunteer);
                                setIsVolunteerDrawerOpen(true);
                              }}
                              data-testid={`button-view-${volunteer.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Approved Volunteers List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Team</CardTitle>
                  <CardDescription>
                    {volunteers?.filter(v => v.approvalStatus === "approved").length || 0} approved volunteer{(volunteers?.filter(v => v.approvalStatus === "approved").length || 0) !== 1 ? 's' : ''} in your team
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingVolunteers ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : !volunteers || volunteers.filter(v => v.approvalStatus === "approved").length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">No approved volunteers yet</p>
                      <p className="text-xs text-muted-foreground">Approve pending requests or share an invite link</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {volunteers.filter(v => v.approvalStatus === "approved").map((volunteer) => (
                        <div 
                          key={volunteer.id} 
                          className="flex items-center justify-between p-3 rounded-md border"
                          data-testid={`volunteer-${volunteer.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                              <Truck className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {(volunteer as EnrichedVolunteer).displayName || volunteer.operatingArea || "Volunteer"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {getTransportTypeLabel(volunteer.transportType)} · {volunteer.operatingArea || "Area not specified"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={volunteer.isAvailable ? "default" : "secondary"}>
                              {volunteer.isAvailable ? "Available" : "Busy"}
                            </Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeVolunteerMutation.mutate(volunteer.id)}
                              disabled={removeVolunteerMutation.isPending}
                              data-testid={`button-remove-${volunteer.id}`}
                            >
                              <UserMinus className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="funds" className="space-y-4">
            <NgoMonetaryDonations />
          </TabsContent>
        </Tabs>
      </main>

      <DonationDetailDrawer
        donationId={selectedDonationId}
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        onAccept={(id, assignedAgentProfileId) => acceptDonationMutation.mutate({ id, assignedAgentProfileId })}
        onConfirmReceipt={(id, status) => confirmReceiptMutation.mutate({ id, status })}
        isAccepting={acceptDonationMutation.isPending}
        isConfirming={confirmReceiptMutation.isPending}
        onBuildTeam={() => setIsRecruitmentWizardOpen(true)}
      />

      <VolunteerDetailDrawer
        isOpen={isVolunteerDrawerOpen}
        onClose={() => {
          setIsVolunteerDrawerOpen(false);
          setSelectedVolunteer(null);
        }}
        volunteer={selectedVolunteer}
        onApprove={(id) => approveVolunteerMutation.mutate(id)}
        onReject={(id, notes) => rejectVolunteerMutation.mutate({ id, notes })}
        isApproving={approveVolunteerMutation.isPending}
        isRejecting={rejectVolunteerMutation.isPending}
      />

      <RecruitmentWizard
        open={isRecruitmentWizardOpen}
        onOpenChange={setIsRecruitmentWizardOpen}
        organizationName={user.firstName ? `${user.firstName}'s Organization` : "Your Organization"}
        existingLinks={inviteLinks || []}
        onComplete={() => {
          const teamTab = document.querySelector('[data-testid="tab-team"]') as HTMLElement;
          teamTab?.click();
        }}
      />
    </div>
  );
}
