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

  return (
    <button
      type="button"
      onClick={goBack}
      className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-full transition-all active:scale-95 hover:brightness-110 ${className}`}
      style={{
        background: "rgba(15,118,110,0.82)",
        border: "1px solid rgba(255,255,255,0.22)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.15)",
        minHeight: "44px",
      }}
      data-testid="back-button"
      aria-label="Go back"
    >
      <ChevronLeft className="w-4 h-4 shrink-0" />
      Back
    </button>
  );
}
