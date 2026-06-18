export const BASE_URL = "/api";

export function getApiBase(): string {
  return BASE_URL;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

export function platformFee(price: number, isPair = false): number {
  if (isPair) return price >= 200 ? 30 : 15;
  return price > 100 ? 20 : 5;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "approved": return "bg-green-100 text-green-800";
    case "pending": return "bg-amber-100 text-amber-800";
    case "rejected": return "bg-red-100 text-red-800";
    case "blocked": return "bg-red-100 text-red-800";
    case "confirmed": return "bg-blue-100 text-blue-800";
    case "paid": return "bg-emerald-100 text-emerald-800";
    case "ready": return "bg-purple-100 text-purple-800";
    case "picked_up": return "bg-indigo-100 text-indigo-800";
    case "in_transit": return "bg-indigo-100 text-indigo-800";
    case "delivered": return "bg-green-100 text-green-800";
    case "cancelled": return "bg-gray-100 text-gray-700";
    case "refunded": return "bg-gray-100 text-gray-700";
    default: return "bg-gray-100 text-gray-700";
  }
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Pending Approval",
    confirmed: "Awaiting Payment",
    paid: "Paid",
    pending_verification: "Payment Pending Verification",
    retry_allowed: "Payment Rejected — Retry",
    failed: "Payment Failed",
    ready: "Ready for Pickup",
    picked_up: "Picked Up",
    in_transit: "In Transit",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refunded: "Refunded",
  };
  return map[status] ?? status.replace(/_/g, " ");
}
