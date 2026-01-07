import { useState, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { usePollingQuery } from "@/hooks/use-polling";
import { LastUpdated } from "@/components/last-updated";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { DashboardStatusTabs, TabDefinition } from "@/components/dashboard-status-tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/app-header";
import { AgentTaskDrawer } from "@/components/agent-task-drawer";
import { 
  Truck, Package, MapPin, Clock, Camera, Check, X, 
  Navigation, CheckCircle2, Eye, AlertCircle, Building2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import type { User } from "@shared/models/auth";
import type { DeliveryTask, ItemCategory, DeliveryAgentProfile, NgoProfile, UserProfile } from "@shared/schema";

interface DeliveryAgentDashboardProps {
  user: User;
}

const categoryLabels: Record<ItemCategory, string> = {
  clothing: "Clothing",
  food: "Food",
  essentials: "Essentials",
  household: "Household",
  other: "Other",
};

const statusLabels: Record<string, string> = {
  pending: "Available",
  accepted: "Accepted",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const statusColors: Record<string, string> = {
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  accepted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export default function DeliveryAgentDashboard({ user }: DeliveryAgentDashboardProps) {
  const [selectedTask, setSelectedTask] = useState<DeliveryTask | null>(null);
  const [proofType, setProofType] = useState<"pickup" | "delivery" | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const openDrawer = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedTaskId(null);
  };

  const { uploadFile, isUploading } = useUpload({
    onSuccess: async (response) => {
      if (selectedTask && proofType) {
        await submitProofMutation.mutateAsync({
          taskId: selectedTask.id,
          proofType,
          proofUrl: response.objectPath,
        });
      }
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Could not upload photo. Please try again.",
        variant: "destructive",
      });
    },
  });

  const { 
    data: myTasks, 
    isLoading: loadingMyTasks,
    lastUpdated,
    isRefetching,
    isError 
  } = usePollingQuery<DeliveryTask[]>({
    queryKey: ["/api/delivery/tasks", "mine"],
    intervalMs: 15000,
  });

  const { data: completedTasks, isLoading: loadingCompleted } = usePollingQuery<DeliveryTask[]>({
    queryKey: ["/api/delivery/tasks", "completed"],
    intervalMs: 15000,
  });

  const { data: profileData } = useQuery<{
    userProfile: UserProfile | null;
    deliveryAgentProfile: DeliveryAgentProfile | null;
    ngoProfile: NgoProfile | null;
  }>({
    queryKey: ["/api/profile"],
  });

  const agentProfile = profileData?.deliveryAgentProfile;
  const isPendingApproval = agentProfile?.approvalStatus === "pending";
  const isRejected = agentProfile?.approvalStatus === "rejected";
  const isApproved = agentProfile?.approvalStatus === "approved";
  const hasNoAffiliation = !agentProfile?.affiliatedNgoId;

  const submitProofMutation = useMutation({
    mutationFn: async ({ taskId, proofType, proofUrl }: { taskId: string; proofType: string; proofUrl: string }) => {
      return apiRequest("POST", `/api/delivery/tasks/${taskId}/proof`, { proofType, proofUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/tasks"] });
      setSelectedTask(null);
      setProofType(null);
      setCapturedImage(null);
      toast({
        title: "Proof Submitted",
        description: proofType === "pickup" ? "Pickup confirmed. Proceed to delivery." : "Delivery completed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit proof. Please try again.",
        variant: "destructive",
      });
    },
  });

  const leaveNgoMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/delivery-agent/leave-ngo");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/tasks"] });
      toast({
        title: "Left Organization",
        description: data.message || "You have successfully left the organization.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to leave organization. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCapturePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProof = async () => {
    if (!capturedImage || !selectedTask || !proofType) return;
    
    const response = await fetch(capturedImage);
    const blob = await response.blob();
    const file = new File([blob], `proof-${proofType}-${Date.now()}.jpg`, { type: "image/jpeg" });
    await uploadFile(file);
  };

  const activeTasks = myTasks?.filter(t => ["accepted", "in_progress"].includes(t.status)) || [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} roleLabel="Delivery Agent" userRole="delivery_agent" />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Pending/Rejected Approval Banner */}
        {(isPendingApproval || isRejected || hasNoAffiliation) && (
          <Card className={`mb-6 ${isRejected ? 'border-destructive bg-destructive/5' : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                {isRejected ? (
                  <>
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <span>Request Rejected</span>
                  </>
                ) : hasNoAffiliation ? (
                  <>
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <span>Not Affiliated</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <span>Pending Approval</span>
                  </>
                )}
              </CardTitle>
              <CardDescription className={isRejected ? 'text-destructive/80' : ''}>
                {isRejected ? (
                  "Your volunteer request was not approved. Please contact the organization for more information."
                ) : hasNoAffiliation ? (
                  "You need to join an organization to access delivery tasks. Ask for an invite link from an NGO."
                ) : (
                  "Your volunteer request is being reviewed. Once approved by the organization, you'll be able to see and accept delivery tasks."
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-medium">Delivery Tasks</h1>
            <p className="text-muted-foreground">Manage pickups and deliveries</p>
          </div>
          <LastUpdated lastUpdated={lastUpdated} isRefetching={isRefetching} isError={isError} />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-medium">{activeTasks.length}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-medium">{completedTasks?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <DashboardStatusTabs
            tabs={[
              { value: "active", label: "Active", icon: Truck, testId: "tab-active" },
              { value: "completed", label: "Completed", icon: CheckCircle2, testId: "tab-completed" },
            ]}
          />

          <TabsContent value="active" className="space-y-4">
            {loadingMyTasks ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : activeTasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No active tasks</h3>
                  <p className="text-muted-foreground">
                    Tasks assigned to you by your organization will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              activeTasks.map((task) => (
                <Card key={task.id} data-testid={`card-task-${task.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={statusColors[task.status]}>
                            {statusLabels[task.status]}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span className="text-muted-foreground">Pickup:</span>
                            <span>{task.pickupArea}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Navigation className="h-4 w-4 text-green-600" />
                            <span className="text-muted-foreground">Drop-off:</span>
                            <span>{task.dropoffArea}</span>
                          </div>
                          {task.timeWindowStart && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                By {new Date(task.timeWindowEnd!).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {task.status === "accepted" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedTask(task);
                              setProofType("pickup");
                            }}
                            data-testid={`button-pickup-${task.id}`}
                          >
                            <Camera className="h-4 w-4 mr-1" />
                            Start Pickup
                          </Button>
                        )}
                        {task.status === "in_progress" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedTask(task);
                              setProofType("delivery");
                            }}
                            data-testid={`button-deliver-${task.id}`}
                          >
                            <Camera className="h-4 w-4 mr-1" />
                            Mark Delivered
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDrawer(task.id)}
                          data-testid={`button-view-task-${task.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {loadingCompleted ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : completedTasks?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No completed tasks yet</h3>
                  <p className="text-muted-foreground">
                    Your completed deliveries will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              completedTasks?.map((task) => (
                <Card key={task.id} data-testid={`card-completed-${task.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={statusColors.completed}>Completed</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {task.pickupArea} to {task.dropoffArea}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Delivered {task.deliveryTimestamp ? new Date(task.deliveryTimestamp).toLocaleDateString() : ""}
                        </p>
                      </div>
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Leave Organization Section - only show for approved volunteers */}
        {isApproved && !hasNoAffiliation && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Organization Settings</CardTitle>
              <CardDescription>Manage your affiliation with the organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Leave Organization</p>
                  <p className="text-xs text-muted-foreground">
                    You will no longer be able to accept tasks from this organization. 
                    Any active tasks will be returned to the pool.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to leave this organization? Any active tasks will be returned to the pool.")) {
                      leaveNgoMutation.mutate();
                    }
                  }}
                  disabled={leaveNgoMutation.isPending}
                  data-testid="button-leave-organization"
                >
                  {leaveNgoMutation.isPending ? "Leaving..." : "Leave"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={proofType !== null} onOpenChange={() => { setProofType(null); setCapturedImage(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {proofType === "pickup" ? "Capture Pickup Proof" : "Capture Delivery Proof"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {proofType === "pickup" 
                  ? "Take a photo of the items you're picking up."
                  : "Take a photo confirming delivery at the NGO warehouse."
                }
              </p>

              {capturedImage ? (
                <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                  <img src={capturedImage} alt="Proof" className="w-full h-full object-cover" />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => setCapturedImage(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed rounded-md cursor-pointer hover-elevate">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleCapturePhoto}
                    data-testid="input-proof-photo"
                  />
                  <Camera className="h-12 w-12 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Tap to capture photo</span>
                </label>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setProofType(null); setCapturedImage(null); }}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitProof} 
                  disabled={!capturedImage || isUploading || submitProofMutation.isPending}
                  data-testid="button-submit-proof"
                >
                  {isUploading || submitProofMutation.isPending ? "Submitting..." : "Submit Proof"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AgentTaskDrawer
          taskId={selectedTaskId}
          isOpen={isDrawerOpen}
          onClose={closeDrawer}
          onUploadProof={(id, type) => {
            const task = myTasks?.find(t => t.id === id);
            if (task) {
              setSelectedTask(task);
              setProofType(type);
              closeDrawer();
            }
          }}
        />
      </main>
    </div>
  );
}
