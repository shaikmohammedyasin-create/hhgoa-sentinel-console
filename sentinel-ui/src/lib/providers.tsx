"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * The client-side providers, mounted once in the root layout.
 *
 * The QueryClient is created in state rather than at module scope so that a second
 * render — or a second tab in dev — does not share one cache across two React
 * roots.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (count, error) =>
              count < 2 && !(error instanceof Error && error.name === "ApiProblem"),
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
