import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

function dashboardPathFor(role?: string): string {
  switch (role) {
    case "admin": return "/admin";
    case "seller": return "/seller";
    case "transporter": return "/transporter";
    case "buyer": return "/buyer";
    default: return "/";
  }
}

export function BackButton({ className = "" }: { className?: string }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      setLocation(dashboardPathFor(user?.role));
    }
  };

  const isGreenRole =
    user?.role === "buyer" ||
    user?.role === "seller" ||
    user?.role === "transporter";

  if (isGreenRole) {
    return (
      <button
        type="button"
        onClick={goBack}
        className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl shrink-0 transition-all duration-150 active:scale-95 hover:brightness-110 ${className}`}
        style={{
          background: "hsl(181, 60%, 28%)",
          border: "1px solid rgba(255,255,255,0.22)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.18)",
        }}
        data-testid="back-button"
        aria-label="Go back"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={2.5} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl shrink-0 transition-all duration-150 active:scale-95 hover:brightness-110 ${className}`}
      style={{
        background: "rgba(255,255,255,0.18)",
        border: "1px solid rgba(255,255,255,0.30)",
        boxShadow: "0 4px 14px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.22)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      data-testid="back-button"
      aria-label="Go back"
    >
      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={2.5} />
    </button>
  );
}
