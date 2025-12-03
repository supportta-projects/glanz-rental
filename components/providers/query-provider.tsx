"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Optimized query client for ultra-fast performance (<50ms)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Aggressive caching for instant navigation
            staleTime: 60000, // 60s - longer cache for better performance
            gcTime: 600000, // 10m - keep in cache longer
            refetchOnWindowFocus: false, // Prevent unnecessary refetches
            refetchOnMount: false, // Use cached data for instant navigation
            refetchOnReconnect: true, // Refresh after reconnection
            retry: 1, // Retry once on failure
            retryDelay: 500, // 500ms delay - faster retry
            networkMode: "online", // Only retry when online
            // Structural sharing for better performance
            structuralSharing: true,
            // Optimistic updates enabled
            placeholderData: (previousData: any) => previousData,
          },
          mutations: {
            retry: 1,
            retryDelay: 300, // Faster mutation retry
            networkMode: "online",
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

