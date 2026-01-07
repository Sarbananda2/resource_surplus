import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LucideIcon } from "lucide-react";

export interface TabDefinition {
  value: string;
  label: string;
  icon?: LucideIcon;
  testId: string;
  showBadge?: boolean;
}

interface DashboardStatusTabsProps {
  tabs: TabDefinition[];
  badgeCounts?: Record<string, number>;
  isLoading?: boolean;
}

export function DashboardStatusTabs({
  tabs,
  badgeCounts = {},
  isLoading = false,
}: DashboardStatusTabsProps) {
  return (
    <TabsList className="flex-wrap">
      {tabs.map((tab) => {
        const badgeCount = badgeCounts[tab.value] ?? 0;
        const Icon = tab.icon;
        const showLoadingIndicator = tab.showBadge && isLoading;
        const showBadge = tab.showBadge && !isLoading && badgeCount > 0;

        return (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="gap-1.5 relative"
            data-testid={tab.testId}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span>{tab.label}</span>
            {showLoadingIndicator && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-muted flex items-center justify-center">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse" />
              </span>
            )}
            {showBadge && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                {badgeCount > 9 ? "9+" : badgeCount}
              </span>
            )}
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
}
