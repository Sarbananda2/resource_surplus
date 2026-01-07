import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  User, Phone, MapPin, Truck, Clock, Calendar, Package, 
  UserCheck, UserX, Loader2
} from "lucide-react";
import { useState } from "react";
import { 
  getTransportTypeLabel, 
  getLoadCapacityLabel, 
  getApprovalStatusLabel,
  getApprovalStatusBadgeClass,
  formatTime,
  formatDate
} from "@shared/constants";

export interface EnrichedVolunteer {
  id: string;
  userProfileId: string;
  affiliatedNgoId: string | null;
  approvalStatus: "pending" | "approved" | "rejected" | string;
  rejectionNotes?: string | null;
  transportType: string | null;
  loadCapacity: string | null;
  operatingArea: string | null;
  availabilityStart: string | null;
  availabilityEnd: string | null;
  isAvailable: boolean | null;
  visibilityPreference: string | null;
  createdAt: Date | string | null;
  displayName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  area?: string | null;
  joinedAt?: Date | string | null;
}

interface VolunteerDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  volunteer: EnrichedVolunteer | null;
  onApprove: (id: string, notes?: string) => void;
  onReject: (id: string, notes?: string) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
}


export function VolunteerDetailDrawer({
  isOpen,
  onClose,
  volunteer,
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
}: VolunteerDetailDrawerProps) {
  const [notes, setNotes] = useState("");

  const handleApprove = () => {
    if (volunteer) {
      onApprove(volunteer.id, notes || undefined);
      setNotes("");
    }
  };

  const handleReject = () => {
    if (volunteer) {
      onReject(volunteer.id, notes || undefined);
      setNotes("");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!volunteer) return null;

  const isPending = volunteer.approvalStatus === "pending";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-6 pb-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={volunteer.avatarUrl || undefined} alt={volunteer.displayName || "Volunteer"} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {getInitials(volunteer.displayName || "V")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-left text-xl">
                {volunteer.displayName || "Volunteer"}
              </SheetTitle>
              <SheetDescription className="text-left mt-1">
                <Badge className={getApprovalStatusBadgeClass(volunteer.approvalStatus)}>
                  {getApprovalStatusLabel(volunteer.approvalStatus)}
                </Badge>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 pb-6">
            {/* Contact Information */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{volunteer.displayName || "Not provided"}</p>
                    <p className="text-xs text-muted-foreground">Full Name</p>
                  </div>
                </div>
                {volunteer.phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{volunteer.phone}</p>
                      <p className="text-xs text-muted-foreground">Phone Number</p>
                    </div>
                  </div>
                )}
                {volunteer.area && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{volunteer.area}</p>
                      <p className="text-xs text-muted-foreground">Home Area</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Transport Details */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Transport Details</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {getTransportTypeLabel(volunteer.transportType)}
                    </p>
                    <p className="text-xs text-muted-foreground">Transport Type</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {getLoadCapacityLabel(volunteer.loadCapacity)}
                    </p>
                    <p className="text-xs text-muted-foreground">Load Capacity</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{volunteer.operatingArea || "Not specified"}</p>
                    <p className="text-xs text-muted-foreground">Operating Area</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Availability */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Availability</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {formatTime(volunteer.availabilityStart)} - {formatTime(volunteer.availabilityEnd)}
                    </p>
                    <p className="text-xs text-muted-foreground">Available Hours</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{volunteer.joinedAt ? formatDate(volunteer.joinedAt) : "Not available"}</p>
                    <p className="text-xs text-muted-foreground">Applied On</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes (for pending approval) */}
            {isPending && (
              <>
                <Separator />
                <div>
                  <Label htmlFor="notes" className="text-sm font-medium text-muted-foreground">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Add notes about your decision..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2"
                    rows={3}
                    data-testid="textarea-approval-notes"
                  />
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {isPending && (
          <SheetFooter className="p-6 pt-4 border-t gap-2">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={isApproving || isRejecting}
              className="flex-1"
              data-testid="button-drawer-reject"
            >
              {isRejecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserX className="h-4 w-4 mr-2" />
              )}
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isApproving || isRejecting}
              className="flex-1"
              data-testid="button-drawer-approve"
            >
              {isApproving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4 mr-2" />
              )}
              Approve
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
