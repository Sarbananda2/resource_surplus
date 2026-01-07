import { RefreshCw, WifiOff } from "lucide-react";
import { useRelativeTime } from "@/hooks/use-polling";

interface LastUpdatedProps {
  lastUpdated: Date | null;
  isRefetching?: boolean;
  isError?: boolean;
}

export function LastUpdated({ lastUpdated, isRefetching, isError }: LastUpdatedProps) {
  const relativeTime = useRelativeTime(lastUpdated);

  if (isError) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-destructive" data-testid="status-connection-error">
        <WifiOff className="h-3 w-3" />
        <span>Connection issue</span>
      </div>
    );
  }

  if (isRefetching) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="status-refreshing">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Updating...</span>
      </div>
    );
  }

  if (!lastUpdated) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="status-last-updated">
      <RefreshCw className="h-3 w-3" />
      <span>Updated {relativeTime}</span>
    </div>
  );
}
