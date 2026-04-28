import { useLocation } from "wouter";
import { ChevronLeft, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const DASHBOARD_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/buyer",
  "/seller",
  "/transporter",
  "/admin",
]);

function dashboardPathFor(role?: string): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "seller":
      return "/seller";
    case "transporter":
      return "/transporter";
    case "buyer":
      return "/buyer";
    default:
      return "/";
  }
}

export function GlobalBackBar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  if (DASHBOARD_PATHS.has(location)) return null;

  const dashHref = dashboardPathFor(user?.role);

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      setLocation(dashHref);
    }
  };

  return (
    <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 px-2 py-1 rounded-lg hover:bg-gray-100"
          data-testid="global-back-button"
          aria-label="Go back"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={() => setLocation(dashHref)}
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 px-2 py-1 rounded-lg hover:bg-gray-100"
          data-testid="global-home-button"
          aria-label="Go to dashboard"
        >
          <Home className="w-4 h-4" />
          Dashboard
        </button>
      </div>
    </div>
  );
}
