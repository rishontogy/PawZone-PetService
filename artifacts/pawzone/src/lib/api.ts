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

export function platformFee(price: number): number {
  return price > 100 ? 20 : 5;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "approved": return "bg-green-100 text-green-800";
    case "pending": return "bg-yellow-100 text-yellow-800";
    case "rejected": return "bg-red-100 text-red-800";
    case "blocked": return "bg-red-100 text-red-800";
    case "delivered": return "bg-blue-100 text-blue-800";
    case "in_transit": return "bg-purple-100 text-purple-800";
    case "paid": return "bg-green-100 text-green-800";
    case "cancelled": return "bg-gray-100 text-gray-800";
    default: return "bg-gray-100 text-gray-700";
  }
}
