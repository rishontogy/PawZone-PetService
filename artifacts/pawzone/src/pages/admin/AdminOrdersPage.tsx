import { useState } from "react";
import { useAdminGetOrders } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatPrice, getApiBase } from "@/lib/api";
import {
  ShoppingBag, ChevronDown, ChevronUp, Phone, MapPin, Clock,
  Truck, Users, DollarSign, ArrowLeft, XCircle, UserCheck
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  in_transit: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
  disputed: "bg-red-100 text-red-700",
  refunded: "bg-rose-100 text-rose-700",
};

function statusColor(s: string) {
  return STATUS_COLORS[s] ?? "bg-gray-100 text-gray-600";
}

export function AdminOrdersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [extendingId, setExtendingId] = useState<number | null>(null);

  const { data, refetch } = useAdminGetOrders({ query: { enabled: !!user } });
  const orders = (data as any)?.orders ?? [];

  const handleAdminCancel = async (orderId: number) => {
    if (!cancelReason.trim()) {
      toast({ variant: "destructive", title: "Reason required", description: "Please provide a cancellation reason." });
      return;
    }
    setCancelling(true);
    try {
      const token = localStorage.getItem("pawzone_token");
      const res = await fetch(`${getApiBase()}/admin/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to cancel order");
      toast({ title: "Order cancelled", description: `Order cancelled with reason recorded.` });
      setCancelOrderId(null);
      setCancelReason("");
      refetch();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.message ?? "Could not cancel" });
    } finally {
      setCancelling(false);
    }
  };

  const handleExtend = async (orderId: number, type: "seller" | "payment") => {
    setExtendingId(orderId);
    try {
      const token = localStorage.getItem("pawzone_token");
      const res = await fetch(`${getApiBase()}/admin/orders/${orderId}/extend-${type}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to extend");
      toast({ title: "Deadline extended", description: type === "seller" ? "Seller gets 3 more hours." : "Buyer gets 5 more hours." });
      refetch();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.message ?? "Could not extend" });
    } finally {
      setExtendingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/admin">
            <button className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-6 h-6" /> All Orders
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">{orders.length} orders on the platform</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-3">
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
            <ShoppingBag className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No orders yet</p>
          </div>
        ) : (
          orders.map((order: any) => {
            const isOpen = expandedId === order.id;
            const total = Number(order.totalAmount ?? order.total ?? 0);
            const subtotal = Number(order.subtotal ?? 0);
            const transportFee = Number(order.transportFee ?? 0);
            const buyerFee = Number(order.buyerFee ?? (subtotal > 100 ? 20 : 5));
            const sellerFee = Number(order.sellerFee ?? buyerFee);
            const salePlatformFee = Number(order.salePlatformFee ?? (buyerFee + sellerFee));
            const transportPlatformFee = Number(order.transportPlatformFee ?? order.platformTransportFee ?? 0);
            const totalPlatformFee = salePlatformFee + transportPlatformFee;
            const sellerPayout = Number(order.sellerPayout ?? 0);
            const transporterPayout = Number(order.transporterPayout ?? 0);

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  className="w-full p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => setExpandedId(isOpen ? null : order.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-sm font-bold text-teal-700">#{order.orderNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(order.status)}`}>
                        {order.status?.replace(/_/g, " ")}
                      </span>
                      {order.paymentStatus === "paid" && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">Paid</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{order.buyerName} → {order.sellerName}</span>
                      {order.transporterName && order.transporterName !== "Not Assigned" && (
                        <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-purple-500" />{order.transporterName}</span>
                      )}
                      <span>{new Date(order.createdAt).toLocaleDateString("en-IN")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="font-bold text-gray-900 text-lg">{formatPrice(total)}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-5">
                    {/* People */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { label: "Buyer", name: order.buyerName, phone: order.buyerPhone, color: "bg-blue-50 border-blue-100", icon: <Users className="w-4 h-4 text-blue-600" /> },
                        { label: "Seller", name: order.sellerName, phone: order.sellerPhone, color: "bg-purple-50 border-purple-100", icon: <ShoppingBag className="w-4 h-4 text-purple-600" /> },
                        { label: "Transporter", name: order.transporterName || "Not Assigned", phone: order.transporterPhone, color: "bg-teal-50 border-teal-100", icon: <Truck className="w-4 h-4 text-teal-600" /> },
                      ].map(p => (
                        <div key={p.label} className={`${p.color} border rounded-xl p-3`}>
                          <div className="flex items-center gap-2 mb-1">
                            {p.icon}
                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{p.label}</span>
                          </div>
                          <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                          {p.phone && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" />{p.phone}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Address & Times */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {order.deliveryAddress && (
                        <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Delivery Address</p>
                            <p className="text-sm text-gray-800">{order.deliveryAddress}</p>
                          </div>
                        </div>
                      )}
                      <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2">
                        <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Timeline</p>
                          <p className="text-xs text-gray-600">Placed: {new Date(order.createdAt).toLocaleString("en-IN")}</p>
                          {order.pickupTime && (
                            <p className="text-xs text-gray-600">Pickup: {new Date(order.pickupTime).toLocaleString("en-IN")}</p>
                          )}
                          {order.deliveryTime && (
                            <p className="text-xs text-gray-600">Delivered: {new Date(order.deliveryTime).toLocaleString("en-IN")}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Admin Actions */}
                    {order.status !== "cancelled" && order.status !== "completed" && (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Admin Actions</p>
                        <div className="flex flex-wrap gap-2">
                          {(order.status === "seller_confirmation_pending") && (
                            <button
                              onClick={() => handleExtend(order.id, "seller")}
                              disabled={extendingId === order.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-60 transition-colors"
                            >
                              <UserCheck className="w-3.5 h-3.5" /> Extend Seller (+3h)
                            </button>
                          )}
                          {(order.status === "payment_pending_admin_review") && (
                            <button
                              onClick={() => handleExtend(order.id, "payment")}
                              disabled={extendingId === order.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-60 transition-colors"
                            >
                              <Clock className="w-3.5 h-3.5" /> Extend Payment (+5h)
                            </button>
                          )}
                          {cancelOrderId === order.id ? (
                            <div className="w-full space-y-2 mt-1">
                              <textarea
                                className="w-full text-xs border border-red-200 rounded-lg p-2 resize-none h-16 focus:outline-none focus:ring-2 focus:ring-red-400/30 bg-white"
                                placeholder="Required: reason for cancellation..."
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAdminCancel(order.id)}
                                  disabled={cancelling || !cancelReason.trim()}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> {cancelling ? "Cancelling…" : "Confirm Cancel"}
                                </button>
                                <button
                                  onClick={() => { setCancelOrderId(null); setCancelReason(""); }}
                                  className="px-3 py-1.5 text-xs font-medium bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  Dismiss
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setCancelOrderId(order.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Cancel Order
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Financial Breakdown */}
                    <div className="space-y-3">
                      {/* Buyer side */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" /> Payment Breakdown
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Buyer Paid (Total)</span>
                            <span className="font-bold text-gray-900">{formatPrice(total)}</span>
                          </div>
                          <div className="h-px bg-gray-200" />
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 pl-2">→ Seller Payout</span>
                            <span className="font-medium text-blue-700">{formatPrice(sellerPayout)}</span>
                          </div>
                          {transportFee > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500 pl-2">→ Transporter Payout</span>
                              <span className="font-medium text-purple-700">{formatPrice(transporterPayout)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 pl-2">→ Platform Revenue</span>
                            <span className="font-medium text-teal-700">{formatPrice(totalPlatformFee)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Platform fee breakdown */}
                      <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                        <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-3 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" /> Platform Fee Breakdown
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Sale Platform Fee</span>
                            <div className="text-right">
                              <span className="font-semibold text-teal-700">{formatPrice(salePlatformFee)}</span>
                              <span className="text-xs text-gray-400 ml-1">(Buyer ₹{buyerFee} + Seller ₹{sellerFee})</span>
                            </div>
                          </div>
                          {transportFee > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Transport Platform Fee</span>
                              <div className="text-right">
                                <span className="font-semibold text-teal-700">{formatPrice(transportPlatformFee)}</span>
                                <span className="text-xs text-gray-400 ml-1">(from ₹{transportFee} charge)</span>
                              </div>
                            </div>
                          )}
                          <div className="h-px bg-teal-200" />
                          <div className="flex justify-between text-sm font-bold">
                            <span className="text-teal-800">Total Platform Fee</span>
                            <span className="text-teal-800 text-base">{formatPrice(totalPlatformFee)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
