import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SignedImage } from "@/components/signed-image";
import { 
  MapPin, Clock, Package, Calendar, ArrowRight, Camera, Check, Truck
} from "lucide-react";
import type { DeliveryTask, Donation } from "@shared/schema";
import {
  DonationDrawerBase,
  DonationBadges,
  DescriptionSection,
  formatDate,
  formatDateShort,
  statusLabels,
  statusColors,
} from "./donation-drawer-base";

interface TaskDetails {
  task: DeliveryTask;
  donation: Donation;
  ngoName: string;
  ngoWarehouseArea: string | null;
}

interface AgentTaskDrawerProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUploadProof?: (id: string, type: "pickup" | "delivery") => void;
}

const taskStatusLabels: Record<string, string> = {
  pending: "Pending Assignment",
  accepted: "Assigned to You",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const taskStatusColors: Record<string, string> = {
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  accepted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  in_progress: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export function AgentTaskDrawer({ 
  taskId, 
  isOpen, 
  onClose,
  onUploadProof,
}: AgentTaskDrawerProps) {
  const { data: details, isLoading } = useQuery<TaskDetails>({
    queryKey: ["/api/delivery/tasks", taskId, "details"],
    queryFn: async () => {
      if (!taskId) {
        throw new Error("No task ID provided");
      }
      const response = await fetch(`/api/delivery/tasks/${taskId}/details`);
      if (!response.ok) {
        throw new Error("Failed to fetch task details");
      }
      return response.json();
    },
    enabled: !!taskId && isOpen,
  });

  const task = details?.task;
  const donation = details?.donation;
  const isPending = task?.status === "pending";
  const isAccepted = task?.status === "accepted";
  const isInProgress = task?.status === "in_progress";
  const needsPickupProof = isAccepted && !task?.pickupProofUrl;
  const needsDeliveryProof = isInProgress && !task?.deliveryProofUrl;

  const footer = task ? (
    <>
      {needsPickupProof && onUploadProof && (
        <Button 
          className="w-full gap-2" 
          onClick={() => onUploadProof(task.id, "pickup")}
          data-testid="button-drawer-upload-pickup"
        >
          <Camera className="h-4 w-4" />
          Upload Pickup Proof
        </Button>
      )}
      {needsDeliveryProof && onUploadProof && (
        <Button 
          className="w-full gap-2" 
          onClick={() => onUploadProof(task.id, "delivery")}
          data-testid="button-drawer-upload-delivery"
        >
          <Camera className="h-4 w-4" />
          Upload Delivery Proof
        </Button>
      )}
      {!isPending && !needsPickupProof && !needsDeliveryProof && (
        <Button variant="outline" className="w-full" onClick={onClose}>
          Close
        </Button>
      )}
    </>
  ) : null;

  return (
    <DonationDrawerBase
      isOpen={isOpen}
      onClose={onClose}
      isLoading={isLoading}
      donation={donation}
      footer={footer}
    >
      {task && donation && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Delivery Task</span>
            <Badge className={taskStatusColors[task.status]}>
              {taskStatusLabels[task.status]}
            </Badge>
          </div>

          <DonationBadges donation={donation} />
          <DescriptionSection description={donation.description} />
          
          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Route
            </h4>
            <div className="bg-muted/50 rounded-md p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Pickup</p>
                  <p className="font-medium">{task.pickupArea}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 text-right">
                  <p className="text-xs text-muted-foreground mb-1">Dropoff</p>
                  <p className="font-medium">{task.dropoffArea}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Donation Details
            </h4>
            <div className="bg-muted/50 rounded-md p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge className={statusColors[donation.status]}>
                  {statusLabels[donation.status]}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Quantity</span>
                <span className="text-sm font-medium">
                  {donation.quantity} item{donation.quantity > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {(task.timeWindowStart || task.timeWindowEnd) && (
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time Window
              </h4>
              <div className="bg-muted/50 rounded-md p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {task.timeWindowStart && formatDateShort(task.timeWindowStart)}
                    {task.timeWindowStart && task.timeWindowEnd && " - "}
                    {task.timeWindowEnd && formatDateShort(task.timeWindowEnd)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {details?.ngoName && (
            <div>
              <h4 className="text-sm font-medium mb-3">Destination NGO</h4>
              <div className="bg-muted/50 rounded-md p-3 space-y-1">
                <p className="font-medium">{details.ngoName}</p>
                {details.ngoWarehouseArea && (
                  <p className="text-sm text-muted-foreground">
                    Warehouse: {details.ngoWarehouseArea}
                  </p>
                )}
              </div>
            </div>
          )}

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-3">Proof Status</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                <span className="text-sm">Pickup Proof</span>
                {task.pickupProofUrl ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1">
                    <Check className="h-3 w-3" />
                    Uploaded
                  </Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                <span className="text-sm">Delivery Proof</span>
                {task.deliveryProofUrl ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1">
                    <Check className="h-3 w-3" />
                    Uploaded
                  </Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
              </div>
            </div>
          </div>

          {(task.pickupProofUrl || task.deliveryProofUrl) && (
            <div className="space-y-3">
              {task.pickupProofUrl && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Pickup Photo</p>
                  <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                    <SignedImage
                      objectPath={task.pickupProofUrl}
                      alt="Pickup proof"
                      className="object-cover w-full h-full"
                    />
                  </div>
                  {task.pickupTimestamp && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(task.pickupTimestamp)}
                    </p>
                  )}
                </div>
              )}
              {task.deliveryProofUrl && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Delivery Photo</p>
                  <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                    <SignedImage
                      objectPath={task.deliveryProofUrl}
                      alt="Delivery proof"
                      className="object-cover w-full h-full"
                    />
                  </div>
                  {task.deliveryTimestamp && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(task.deliveryTimestamp)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {task.createdAt && (
            <div className="text-xs text-muted-foreground pt-4">
              Task created on {formatDate(task.createdAt)}
            </div>
          )}
        </>
      )}
    </DonationDrawerBase>
  );
}
