import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, AlertCircle, Check, ChevronDown } from "lucide-react";
import { useLocation } from "@/hooks/use-location";

interface AreaSuggestion {
  id: string;
  name: string;
  region?: string;
}

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export function LocationInput({ 
  value, 
  onChange, 
  placeholder = "e.g., North District, Downtown",
  disabled,
  "data-testid": testId
}: LocationInputProps) {
  const { detectLocation, isLoading, error, clearError } = useLocation();
  const [showError, setShowError] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<AreaSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(inputValue, 300);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`/api/location/suggest?q=${encodeURIComponent(debouncedQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.areas || []);
          setShowSuggestions(data.areas?.length > 0);
        }
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      } finally {
        setIsSearching(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  const validateArea = useCallback(async (areaName: string) => {
    if (!areaName || areaName.length < 2) {
      setIsValidated(false);
      return;
    }

    try {
      const response = await fetch(`/api/location/validate?name=${encodeURIComponent(areaName)}`);
      if (response.ok) {
        const data = await response.json();
        setIsValidated(data.isValid);
      }
    } catch (err) {
      console.error("Failed to validate area:", err);
    }
  }, []);

  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
      if (inputValue.length >= 2 && !isValidated) {
        validateArea(inputValue);
      }
    }, 200);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsValidated(false);
    setSelectedIndex(-1);
  };

  const handleSelectSuggestion = useCallback((suggestion: AreaSuggestion) => {
    setInputValue(suggestion.name);
    onChange(suggestion.name);
    setIsValidated(true);
    setShowSuggestions(false);
    setSuggestions([]);
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleDetectLocation = async () => {
    clearError();
    const detectedArea = await detectLocation();
    if (detectedArea) {
      setInputValue(detectedArea);
      onChange(detectedArea);
      setIsValidated(true);
    }
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="pl-9 pr-8"
            disabled={disabled || isLoading}
            data-testid={testId}
            autoComplete="off"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : isValidated ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : inputValue.length > 0 ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : null}
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div 
              ref={dropdownRef}
              className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  type="button"
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover-elevate ${
                    index === selectedIndex ? "bg-accent" : ""
                  }`}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  data-testid={`suggestion-${suggestion.id}`}
                >
                  <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1">
                    {suggestion.name}
                    {suggestion.region && (
                      <span className="text-muted-foreground ml-1">
                        ({suggestion.region})
                      </span>
                    )}
                  </span>
                  <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={handleDetectLocation}
          disabled={disabled || isLoading}
          data-testid={testId ? `${testId}-detect` : "button-detect-location"}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Detecting...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 mr-2" />
              Use my area
            </>
          )}
        </Button>
      </div>

      {!isValidated && inputValue.length > 2 && !isSearching && suggestions.length === 0 && (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Area not in our catalog yet - you can still use it
        </p>
      )}

      {showError && error && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
