import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { AnalyticsIdentityObserver } from "./modules/analytics/analytics-observer"
import { AuthProvider } from "./modules/auth/services/auth-provider"
import {
  captureMutationSuccess,
  captureUnexpectedError,
  initializeAnalytics,
} from "./modules/shared/analytics/posthog"
import { ThemeProvider } from "./modules/shared/theme/theme-provider"
import { routeTree } from "./routeTree.gen"
import "./index.css"

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
})

initializeAnalytics()

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => captureUnexpectedError(error, { boundary: "query" }),
  }),
  mutationCache: new MutationCache({
    onError: (error) => captureUnexpectedError(error, { boundary: "mutation" }),
    onSuccess: (_data, _variables, _context, mutation) => captureMutationSuccess(mutation.meta),
  }),
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
    },
  },
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("Root element not found.")
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AnalyticsIdentityObserver />
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
