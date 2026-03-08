import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "./lib/api";
import LoginPage from "./pages/LoginPage";
import SessionsPage from "./pages/SessionsPage";
import SessionDetailPage from "./pages/SessionDetailPage";
import SavedSessionsPage from "./pages/SavedSessionsPage";
import { useEffect } from "react";
import { Toaster, toast } from "sonner";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function HealthCheck() {
  useEffect(() => {
    let isHealthy = false;
    let toastId: string | number | undefined;
    let unmounted = false;

    const BASE_URL = import.meta.env.VITE_BACKEND_URL || "";

    const performCheck = async (attempt = 0) => {
      if (unmounted || isHealthy) return;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${BASE_URL}/api/health`, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          isHealthy = true;
          if (toastId) {
            toast.dismiss(toastId);
            toast.success("Backend is awake!", { duration: 3000 });
          }
          return;
        }
        if (response.status === 502 || response.status === 503) {
          throw new Error("Service Unavailable");
        }
      } catch {
        if (unmounted) return;

        if (attempt >= 10) {
          if (toastId) toast.dismiss(toastId);
          toast.error(
            "Backend failed to start. Please refresh or try again later.",
            { duration: Number.POSITIVE_INFINITY },
          );
          return;
        }

        // Exponential backoff
        const backoff = Math.min(1000 * Math.pow(2, attempt), 10000);
        setTimeout(() => performCheck(attempt + 1), backoff);
      }
    };

    const timeoutId = setTimeout(() => {
      if (!isHealthy && !unmounted) {
        toastId = toast.loading(
          "Backend is starting up. This might take ~30-50 seconds (Render free tier)...",
          { duration: Number.POSITIVE_INFINITY },
        );
      }
    }, 3000);

    performCheck();

    return () => {
      unmounted = true;
      clearTimeout(timeoutId);
      if (toastId) toast.dismiss(toastId);
    };
  }, []);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <HealthCheck />
        <Toaster position="top-center" richColors theme="dark" />
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/sessions"
            element={
              <AuthGuard>
                <SessionsPage />
              </AuthGuard>
            }
          />
          <Route
            path="/sessions/:id"
            element={
              <AuthGuard>
                <SessionDetailPage />
              </AuthGuard>
            }
          />
          <Route
            path="/saved-sessions"
            element={
              <AuthGuard>
                <SavedSessionsPage />
              </AuthGuard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
