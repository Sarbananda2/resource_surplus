import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar } from "lucide-react";

interface DistributionEventFormProps {
  onSuccess: () => void;
}

export function DistributionEventForm({ onSuccess }: DistributionEventFormProps) {
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);
  const [distributionType, setDistributionType] = useState("");
  const [area, setArea] = useState("");
  const [estimatedBeneficiaryCount, setEstimatedBeneficiaryCount] = useState("");
  const { toast } = useToast();

  const createEventMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/ngo/distribution-events", {
        eventDate: eventDate?.toISOString(),
        distributionType,
        area,
        estimatedBeneficiaryCount: estimatedBeneficiaryCount ? parseInt(estimatedBeneficiaryCount, 10) : undefined,
      });
    },
    onSuccess: () => {
      toast({
        title: "Event Scheduled",
        description: "Your distribution event has been scheduled. Complete it after the event to add photos and impact data.",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to schedule event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventDate || !distributionType || !area) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    createEventMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-muted/50 rounded-md p-3 mb-4">
        <div className="flex items-start gap-2">
          <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Schedule your event</p>
            <p>After the event takes place, you can mark it as complete and add photos and impact data.</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label required>Event Date</Label>
        <DatePicker
          value={eventDate}
          onChange={setEventDate}
          placeholder="Select event date"
          data-testid="input-event-date"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="distributionType" required>Distribution Type</Label>
        <Select value={distributionType} onValueChange={setDistributionType}>
          <SelectTrigger data-testid="select-distribution-type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Clothing Distribution">Clothing Distribution</SelectItem>
            <SelectItem value="Food Distribution">Food Distribution</SelectItem>
            <SelectItem value="Essentials Distribution">Essentials Distribution</SelectItem>
            <SelectItem value="Mixed Distribution">Mixed Distribution</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="area" required>Area (General Location)</Label>
        <Input
          id="area"
          placeholder="e.g., North District"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          data-testid="input-event-area"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="estimatedBeneficiaryCount">Expected People to Serve</Label>
        <Input
          id="estimatedBeneficiaryCount"
          type="number"
          min="1"
          placeholder="e.g., 50"
          value={estimatedBeneficiaryCount}
          onChange={(e) => setEstimatedBeneficiaryCount(e.target.value)}
          data-testid="input-estimated-beneficiary-count"
        />
        <p className="text-xs text-muted-foreground">
          You can update this with actual numbers after the event
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={createEventMutation.isPending} data-testid="button-schedule-event">
          {createEventMutation.isPending ? "Scheduling..." : "Schedule Event"}
        </Button>
      </div>
    </form>
  );
}
