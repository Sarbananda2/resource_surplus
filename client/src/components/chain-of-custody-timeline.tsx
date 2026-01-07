import { CheckCircle2, Circle, Clock, MapPin, User, Building2, Package, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SignedProofLink } from "@/components/signed-proof-link";
import type { Donation, DeliveryTask, DistributionEvent } from "@shared/schema";

interface ChainOfCustodyTimelineProps {
  donation: Donation;
  deliveryTask?: DeliveryTask | null;
  distributionEvent?: DistributionEvent | null;
  showProofLinks?: boolean;
}

interface CustodyEvent {
  id: string;
  title: string;
  description: string;
  icon: typeof Package;
  timestamp?: Date | string | null;
  proofUrl?: string | null;
  location?: string | null;
  status: "completed" | "current" | "pending";
}

const formatDateTime = (date: string | Date | null | undefined) => {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export function ChainOfCustodyTimeline({ 
  donation, 
  deliveryTask, 
  distributionEvent,
  showProofLinks = true,
}: ChainOfCustodyTimelineProps) {
  const events: CustodyEvent[] = [];
  const currentStatus = donation.status;

  const getStatus = (requiredStatuses: string[]): "completed" | "current" | "pending" => {
    const statusOrder = ["listed", "assigned", "collected", "delivered", "in_warehouse", "distributed"];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const requiredIndex = Math.min(...requiredStatuses.map(s => statusOrder.indexOf(s)));
    
    if (currentIndex > requiredIndex) return "completed";
    if (requiredStatuses.includes(currentStatus)) return "current";
    return "pending";
  };

  events.push({
    id: "listed",
    title: "Donation Listed",
    description: "Donor declared item available for donation",
    icon: Package,
    timestamp: donation.createdAt,
    location: donation.area,
    status: getStatus(["listed"]),
  });

  events.push({
    id: "assigned",
    title: "Accepted by NGO",
    description: "An organization agreed to receive this donation",
    icon: Building2,
    timestamp: donation.acceptedAt,
    status: getStatus(["assigned"]),
  });

  events.push({
    id: "collected",
    title: "Collected from Donor",
    description: "Delivery agent picked up the item",
    icon: Truck,
    timestamp: deliveryTask?.pickupTimestamp,
    proofUrl: deliveryTask?.pickupProofUrl,
    location: deliveryTask?.pickupLocation || deliveryTask?.pickupArea,
    status: getStatus(["collected"]),
  });

  events.push({
    id: "delivered",
    title: "Delivered to Warehouse",
    description: "Item handed over to receiving organization",
    icon: MapPin,
    timestamp: deliveryTask?.deliveryTimestamp,
    proofUrl: deliveryTask?.deliveryProofUrl,
    location: deliveryTask?.dropoffArea,
    status: getStatus(["delivered", "in_warehouse"]),
  });

  events.push({
    id: "in_warehouse",
    title: "NGO Confirmed Receipt",
    description: "Organization verified the item arrived",
    icon: CheckCircle2,
    timestamp: donation.warehouseReceivedAt,
    status: getStatus(["in_warehouse"]),
  });

  events.push({
    id: "distributed",
    title: "Distributed to Beneficiaries",
    description: distributionEvent 
      ? `Included in ${distributionEvent.distributionType} event at ${distributionEvent.area}`
      : "Item reached those in need",
    icon: User,
    timestamp: donation.distributedAt || distributionEvent?.eventDate,
    proofUrl: distributionEvent?.photoUrls?.[0],
    location: distributionEvent?.area,
    status: getStatus(["distributed"]),
  });

  const isExpired = donation.status === "expired";

  return (
    <div className="space-y-1" data-testid="chain-of-custody-timeline">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-muted-foreground">Chain of Custody</h4>
        {isExpired && (
          <Badge variant="destructive" className="text-xs">Expired</Badge>
        )}
      </div>
      <div className="relative">
        <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-border -translate-x-1/2" />
        <div className="flex flex-col relative">
          {events.map((event) => {
            const isCompleted = event.status === "completed";
            const isCurrent = event.status === "current";
            const isPending = event.status === "pending";
            const Icon = event.icon;
            
            return (
              <div 
                key={event.id} 
                className={`flex gap-3 pb-4 last:pb-0 ${isPending ? "opacity-50" : ""}`}
                data-testid={`custody-event-${event.id}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  isCompleted 
                    ? "bg-primary text-primary-foreground" 
                    : isCurrent
                    ? "bg-primary/80 text-primary-foreground ring-2 ring-primary/30"
                    : "bg-muted"
                }`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className={`text-sm ${isCurrent ? "font-medium" : isCompleted ? "" : "text-muted-foreground"}`}>
                    {event.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {event.description}
                  </p>
                  
                  {(isCompleted || isCurrent) && event.timestamp && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(event.timestamp)}
                    </p>
                  )}
                  
                  {(isCompleted || isCurrent) && event.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </p>
                  )}
                  
                  {showProofLinks && (isCompleted || isCurrent) && event.proofUrl && (
                    <SignedProofLink
                      objectPath={event.proofUrl}
                      testId={`proof-link-${event.id}`}
                    />
                  )}
                  
                  {isCurrent && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      Current Status
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
          
          {isExpired && (
            <div className="flex gap-3 pt-4">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-destructive text-destructive-foreground">
                <Circle className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm font-medium text-destructive">Expired</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This donation was not collected within the pickup window
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
