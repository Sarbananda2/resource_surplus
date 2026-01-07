import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";

interface UsePollingQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey'> {
  queryKey: string[];
  intervalMs?: number;
}

export function usePollingQuery<T>({
  queryKey,
  intervalMs = 30000,
  ...options
}: UsePollingQueryOptions<T>) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const query = useQuery<T>({
    queryKey,
    refetchInterval: intervalMs,
    refetchIntervalInBackground: false,
    retry: false,
    ...options,
  });

  useEffect(() => {
    if (query.dataUpdatedAt > 0) {
      setLastUpdated(new Date(query.dataUpdatedAt));
    }
  }, [query.dataUpdatedAt]);

  return {
    ...query,
    lastUpdated,
  };
}

export function useRelativeTime(date: Date | null): string {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!date) return;
    
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [date]);

  if (!date) return "";

  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  
  const diffHour = Math.floor(diffMin / 60);
  return `${diffHour}h ago`;
}
