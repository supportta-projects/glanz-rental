"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30000, // 30s - balance between freshness and performance
            gcTime: 300000, // 5m - keep in cache
            refetchOnWindowFocus: false, // Prevent unnecessary refetches
            refetchOnMount: false, // Use cached data if available
            refetchOnReconnect: true, // Refresh after reconnection
            retry: 1, // Retry once on failure
            retryDelay: 1000, // 1s delay between retries
            networkMode: "online", // Only retry when online
          },
          mutations: {
            retry: 1,
            retryDelay: 500,
            networkMode: "online",
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

