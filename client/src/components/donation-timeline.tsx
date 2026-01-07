import { CheckCircle2, Circle, Clock } from "lucide-react";
import type { Donation } from "@shared/schema";

interface DonationTimelineProps {
  donation: Donation;
}

const statusOrder = ["listed", "assigned", "collected", "delivered", "in_warehouse", "distributed"];

const statusLabels: Record<string, string> = {
  listed: "Listed",
  assigned: "Assigned to NGO",
  collected: "Collected",
  delivered: "Delivered to NGO",
  in_warehouse: "In Warehouse",
  distributed: "Included in Distribution",
};

export function DonationTimeline({ donation }: DonationTimelineProps) {
  const currentIndex = statusOrder.indexOf(donation.status);
  const isExpired = donation.status === "expired";

  return (
    <div className="space-y-1" data-testid="donation-timeline">
      <div className="relative">
        <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-border -translate-x-1/2" />
        <div className="flex flex-col relative">
          {statusOrder.map((status, index) => {
            const isCompleted = !isExpired && index <= currentIndex;
            const isCurrent = !isExpired && index === currentIndex;
            
            return (
              <div key={status} className="flex gap-3 pb-4 last:pb-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-background ${
                  isCompleted 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted"
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className={`text-sm ${isCurrent ? "font-medium" : isCompleted ? "" : "text-muted-foreground"}`}>
                    {statusLabels[status]}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      Current status
                    </p>
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
                  This donation was not collected in time
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
