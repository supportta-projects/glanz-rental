import { useState, useEffect } from "react";

/**
 * Debounce hook to delay value updates
 * Useful for search inputs to reduce API calls
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  // Optimized: 300ms debounce as per requirements for search/filters
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

