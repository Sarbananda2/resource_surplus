import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter 
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SignedImage } from "@/components/signed-image";
import { 
  Package, MapPin, Clock, AlertTriangle, Calendar, User, Truck, 
  Image as ImageIcon
} from "lucide-react";
import type { Donation, DeliveryTask, ItemCategory, ItemCondition, Priority, DonationStatus } from "@shared/schema";

export const categoryLabels: Record<ItemCategory, string> = {
  clothing: "Clothing",
  food: "Food",
  essentials: "Essentials",
  household: "Household",
  other: "Other",
};

export const conditionLabels: Record<ItemCondition, string> = {
  usable: "Good Condition",
  near_expiry: "Near Expiry",
  fragile: "Fragile - Handle with Care",
};

export const conditionColors: Record<ItemCondition, string> = {
  usable: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  near_expiry: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  fragile: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export const priorityLabels: Record<Priority, string> = {
  low: "Low Priority",
  medium: "Medium Priority",
  high: "High Priority",
};

export const priorityColors: Record<Priority, string> = {
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export const statusLabels: Record<DonationStatus, string> = {
  listed: "Available",
  assigned: "Pending Pickup",
  collected: "In Transit",
  delivered: "Delivered",
  in_warehouse: "In Warehouse",
  distributed: "Distributed",
  expired: "Expired",
};

export const statusColors: Record<DonationStatus, string> = {
  listed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  assigned: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  collected: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  delivered: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  in_warehouse: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  distributed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  expired: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const formatDateShort = (date: string | Date) => {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

interface DonationDrawerBaseProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  donation: Donation | null | undefined;
  title?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export function DonationDrawerBase({
  isOpen,
  onClose,
  isLoading,
  donation,
  children,
  footer,
}: DonationDrawerBaseProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        {isLoading ? (
          <div className="p-6 space-y-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Separator />
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ) : donation ? (
          <>
            <SheetHeader className="p-6 pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <SheetTitle className="text-left">
                      {categoryLabels[donation.category]}
                    </SheetTitle>
                    <SheetDescription className="text-left">
                      {donation.quantity} item{donation.quantity > 1 ? "s" : ""}
                    </SheetDescription>
                  </div>
                </div>
                <Badge className={statusColors[donation.status]}>
                  {statusLabels[donation.status]}
                </Badge>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1 px-6">
              <div className="py-6 space-y-6">
                {children}
              </div>
            </ScrollArea>

            {footer && (
              <SheetFooter className="p-6 pt-4 border-t bg-background">
                {footer}
              </SheetFooter>
            )}
          </>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Donation not found</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface DonationBadgesProps {
  donation: Donation;
}

export function DonationBadges({ donation }: DonationBadgesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge className={conditionColors[donation.condition]}>
        {conditionLabels[donation.condition]}
      </Badge>
      {donation.priority && (
        <Badge className={priorityColors[donation.priority]}>
          {priorityLabels[donation.priority]}
        </Badge>
      )}
      {donation.condition === "near_expiry" && (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Time Sensitive
        </Badge>
      )}
    </div>
  );
}

interface DescriptionSectionProps {
  description: string | null;
}

export function DescriptionSection({ description }: DescriptionSectionProps) {
  if (!description) return null;
  return (
    <div>
      <h4 className="text-sm font-medium mb-2">Description</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

interface LocationSectionProps {
  area: string;
  label?: string;
  sublabel?: string;
}

export function LocationSection({ area, label = "Pickup Location", sublabel = "Area-level location for privacy" }: LocationSectionProps) {
  return (
    <div>
      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        {label}
      </h4>
      <div className="bg-muted/50 rounded-md p-3">
        <p className="font-medium">{area}</p>
        <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
      </div>
    </div>
  );
}

interface AvailabilityWindowProps {
  start: string | Date;
  end: string | Date;
}

export function AvailabilityWindow({ start, end }: AvailabilityWindowProps) {
  return (
    <div>
      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Availability Window
      </h4>
      <div className="bg-muted/50 rounded-md p-3">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>
            {formatDateShort(start)} - {formatDateShort(end)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Item available for pickup during this window
        </p>
      </div>
    </div>
  );
}

interface PersonInfoProps {
  icon?: React.ReactNode;
  label: string;
  name: string;
}

export function PersonInfo({ icon, label, name }: PersonInfoProps) {
  return (
    <div>
      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
        {icon || <User className="h-4 w-4" />}
        {label}
      </h4>
      <div className="bg-muted/50 rounded-md p-3">
        <p className="font-medium">{name}</p>
      </div>
    </div>
  );
}

interface DeliveryInfoCardProps {
  deliveryTask: DeliveryTask;
  agentDisplayName?: string | null;
}

export function DeliveryInfoCard({ deliveryTask, agentDisplayName }: DeliveryInfoCardProps) {
  return (
    <div>
      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
        <Truck className="h-4 w-4" />
        Delivery Information
      </h4>
      <div className="bg-muted/50 rounded-md p-3 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Status</span>
          <Badge variant="outline">{deliveryTask.status}</Badge>
        </div>
        {agentDisplayName && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Agent</span>
            <span className="text-sm font-medium">{agentDisplayName}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">From</span>
          <span className="text-sm">{deliveryTask.pickupArea}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">To</span>
          <span className="text-sm">{deliveryTask.dropoffArea}</span>
        </div>
      </div>
    </div>
  );
}

interface ProofPhotosProps {
  pickupProofUrl?: string | null;
  deliveryProofUrl?: string | null;
}

export function ProofPhotos({ pickupProofUrl, deliveryProofUrl }: ProofPhotosProps) {
  if (!pickupProofUrl && !deliveryProofUrl) return null;
  
  return (
    <div>
      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
        <ImageIcon className="h-4 w-4" />
        Proof Photos
      </h4>
      <div className="space-y-3">
        {pickupProofUrl && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Pickup Proof</p>
            <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
              <SignedImage
                objectPath={pickupProofUrl}
                alt="Pickup proof"
                className="object-cover w-full h-full"
              />
            </div>
          </div>
        )}
        {deliveryProofUrl && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Delivery Proof</p>
            <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
              <SignedImage
                objectPath={deliveryProofUrl}
                alt="Delivery proof"
                className="object-cover w-full h-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface CreatedAtFootnoteProps {
  createdAt: string | Date | null;
}

export function CreatedAtFootnote({ createdAt }: CreatedAtFootnoteProps) {
  if (!createdAt) return null;
  return (
    <div className="text-xs text-muted-foreground pt-4">
      Listed on {formatDate(createdAt)}
    </div>
  );
}
