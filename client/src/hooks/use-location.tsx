import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";

interface UseLocationResult {
  area: string | null;
  isLoading: boolean;
  error: string | null;
  detectLocation: () => Promise<string | null>;
  clearError: () => void;
}

export function useLocation(): UseLocationResult {
  const [area, setArea] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const detectLocation = useCallback(async (): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        throw new Error("Location services are not supported by your browser");
      }

      // Get current position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, // We only need area-level accuracy
          timeout: 10000,
          maximumAge: 300000, // Cache for 5 minutes
        });
      });

      const { latitude, longitude } = position.coords;

      // Call our backend for privacy-safe reverse geocoding
      const response = await apiRequest("POST", "/api/location/reverse-geocode", {
        latitude,
        longitude,
      });

      const data = await response.json();
      
      if (data.area) {
        setArea(data.area);
        return data.area;
      } else {
        throw new Error("Could not determine your area");
      }
    } catch (err: any) {
      let errorMessage = "Failed to detect location";

      if (err.code === 1) {
        errorMessage = "Location permission denied. Please enter your area manually.";
      } else if (err.code === 2) {
        errorMessage = "Location unavailable. Please enter your area manually.";
      } else if (err.code === 3) {
        errorMessage = "Location request timed out. Please try again or enter manually.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    area,
    isLoading,
    error,
    detectLocation,
    clearError,
  };
}
