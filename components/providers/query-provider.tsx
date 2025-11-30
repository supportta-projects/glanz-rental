"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30000, // 30s as per requirements
            gcTime: 300000, // 5m as per requirements
            refetchOnWindowFocus: false, // Manual only
            refetchOnMount: false,
            refetchOnReconnect: false,
            retry: 1,
            retryDelay: 1000,
          },
          mutations: {
            retry: 1,
            retryDelay: 500,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

